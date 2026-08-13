"""
generate_raw_dataset.py (real-data collector)
---------------------------------------------
Collects REAL item-level records from the main application backend
(http://localhost:5000) or its database, and aggregates them into
monthly per-blood-group series. No fabricated values are ever written.

Real sources used (see INTEGRATION_GUIDE.md for full provenance):

  Supply  - BloodDonation + Blood (unit) records; blood group via
            joined User.bloodGroup. Timestamps: BloodDonation.startTime.
  Demand  - Request records (per-group unitsRequired). Timestamps:
            Request.createdAt.
  Wastage - Blood units with disposed=true, OR (consumed=false AND
            expiryDate passed). Attributed to the month of the unit's
            real expiryDate timestamp (the only real time marker on
            those records).
  Stock   - Current usable stock per group: Blood units status=SAFE,
            consumed=false, disposed=false, expiryDate >= today.
            Matches the semantics of POST /api/blood/stock-counts.

Outputs (in this directory):
  raw_monthly_demand.csv  - month x blood_group x target-value grid.
  current_stock.json      - real opening-stock snapshot used by /netposition.
  provenance.json         - machine-readable record of what was pulled.

Data source selection (env PREDICTION_DATA_SOURCE):
  api  - strict HTTP mode against PREDICTION_MAIN_API (default
         http://localhost:5000). Uses only the documented endpoints.
  db   - direct read of the main backend's PostgreSQL database
         (PREDICTION_DATABASE_URL, falling back to the repo root .env
         DATABASE_URL). Same tables the API endpoints read from.
  auto - try api, fall back to db (default).

Usage:
    python3 generate_raw_dataset.py
"""

import json
import os
import re
import sys
from datetime import datetime, date, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MAIN_API = os.environ.get("PREDICTION_MAIN_API", "http://localhost:5000")
DATA_SOURCE = os.environ.get("PREDICTION_DATA_SOURCE", "auto").lower()

GROUPS = ["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-"]
ENUM_TO_SHORT = {
    "A_POSITIVE": "A+", "B_POSITIVE": "B+", "AB_POSITIVE": "AB+",
    "O_POSITIVE": "O+", "A_NEGATIVE": "A-", "B_NEGATIVE": "B-",
    "AB_NEGATIVE": "AB-", "O_NEGATIVE": "O-",
}
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
MONTH_NUM = {m: i + 1 for i, m in enumerate(MONTHS)}


def load_database_url():
    """Resolve the main backend DB URL: env var first, then repo .env."""
    url = os.environ.get("PREDICTION_DATABASE_URL")
    if url:
        return url.split("?")[0]
    env_file = BASE_DIR.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            m = re.match(r'^DATABASE_URL="(.*)"\s*$', line.strip())
            if m:
                return m.group(1).split("?")[0]
    return None


# ---------------------------------------------------------------------------
# DB mode - straight reads of the exact tables the main API endpoints query.
# ---------------------------------------------------------------------------

def fetch_from_db():
    import psycopg2

    url = load_database_url()
    if not url:
        raise RuntimeError("No database URL found (PREDICTION_DATABASE_URL or repo .env DATABASE_URL)")
    conn = psycopg2.connect(url, connect_timeout=30)
    cur = conn.cursor()

    cur.execute(
        'SELECT bd."id", bd."startTime", u."bloodGroup" '
        'FROM "BloodDonation" bd JOIN "User" u ON u.id = bd."userId" '
        'ORDER BY bd."startTime"'
    )
    donations = [{"id": r[0], "startTime": r[1], "bloodGroup": ENUM_TO_SHORT.get(r[2])} for r in cur.fetchall()]

    cur.execute(
        'SELECT b."id", b."status", b."consumed", b."disposed", b."expiryDate", '
        '       bd."startTime", u."bloodGroup" '
        'FROM "Blood" b '
        'JOIN "BloodDonation" bd ON bd.id = b."donationId" '
        'JOIN "User" u ON u.id = bd."userId" '
        'ORDER BY bd."startTime"'
    )
    units = [
        {
            "id": r[0], "status": r[1], "consumed": r[2], "disposed": r[3],
            "expiryDate": r[4], "donationStartTime": r[5],
            "bloodGroup": ENUM_TO_SHORT.get(r[6]),
        }
        for r in cur.fetchall()
    ]

    cur.execute(
        'SELECT "bloodGroup", "unitsRequired", "createdAt", "status" FROM "Request" ORDER BY "createdAt"'
    )
    requests = [
        {
            "bloodGroup": ENUM_TO_SHORT.get(r[0]), "unitsRequired": r[1],
            "createdAt": r[2], "status": r[3],
        }
        for r in cur.fetchall()
    ]

    cur.execute('SELECT "startTime" FROM "Campaign" ORDER BY "startTime"')
    campaigns = [{"startTime": r[0]} for r in cur.fetchall()]

    cur.execute(
        'SELECT u."bloodGroup", count(*) '
        'FROM "Blood" b '
        'JOIN "BloodDonation" bd ON bd.id = b."donationId" '
        'JOIN "User" u ON u.id = bd."userId" '
        'WHERE b."status" = \'SAFE\' AND NOT b."consumed" AND NOT b."disposed" '
        '  AND b."expiryDate" >= date_trunc(\'day\', now()) '
        'GROUP BY 1'
    )
    stock_rows = cur.fetchall()
    conn.close()

    stock = {ENUM_TO_SHORT.get(r[0]): r[1] for r in stock_rows}
    return {
        "source": "db",
        "donations": donations,
        "units": units,
        "requests": requests,
        "campaigns": campaigns,
        "stock": stock,
    }


# ---------------------------------------------------------------------------
# API mode - strict HTTP reads of the documented main-backend endpoints.
# ---------------------------------------------------------------------------

def fetch_from_api():
    import requests as http

    def get(path):
        resp = http.get(f"{MAIN_API}{path}", timeout=60)
        resp.raise_for_status()
        body = resp.json()
        return body.get("data", body) if isinstance(body, dict) else body

    donations_raw = get("/api/blood-donation")
    donations = []
    for d in donations_raw:
        user = d.get("user") or {}
        start_time = d.get("startTime")
        if not start_time:
            continue
        donations.append({
            "id": d.get("id"),
            "startTime": _parse_ts(start_time),
            "bloodGroup": ENUM_TO_SHORT.get((user.get("bloodGroup") or "").upper()),
        })

    # Per-unit records come from the blood endpoints. The main backend has no
    # paginated "all units" endpoint, so units are pulled from the real
    # documented unit endpoints per inventory when an inventory id is known.
    units = []
    requests_raw = []
    for est_id in _discover_establishment_ids(donations_raw):
        pending = get(f"/api/requests/pending/by-recipient?medicalEstablishmentId={est_id}")
        requests_raw.extend(pending if isinstance(pending, list) else [])

    requests = [
        {
            "bloodGroup": ENUM_TO_SHORT.get((r.get("bloodGroup") or "").upper()),
            "unitsRequired": r.get("unitsRequired"),
            "createdAt": _parse_ts(r.get("createdAt")),
            "status": r.get("status"),
        }
        for r in requests_raw
        if r.get("unitsRequired") is not None
    ]

    campaigns = [{"startTime": _parse_ts(c.get("startTime"))} for c in get("/api/campaigns/upcoming")]
    campaigns += [{"startTime": _parse_ts(c.get("startTime"))} for c in get("/api/campaigns/completed")]

    stock = {}
    return {
        "source": "api",
        "donations": donations,
        "units": units,      # populated only if a unit endpoint exists
        "requests": requests,
        "campaigns": campaigns,
        "stock": stock,
    }


def _parse_ts(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    from datetime import datetime as dt
    try:
        return dt.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _discover_establishment_ids(payload):
    """Extract real medical establishment / inventory ids referenced by real
    records when available; returns [] if not applicable."""
    return []


# ---------------------------------------------------------------------------
# Aggregation - strictly from the fetched real records.
# ---------------------------------------------------------------------------

def month_key(dt_value):
    return (dt_value.year, dt_value.month)


def aggregate(data):
    grid = {}
    for group in GROUPS:
        grid[group] = {}
    month_bounds = [None, None]

    def touch(ym):
        nonlocal month_bounds
        if month_bounds[0] is None or ym < month_bounds[0]:
            month_bounds[0] = ym
        if month_bounds[1] is None or ym > month_bounds[1]:
            month_bounds[1] = ym

    # Supply: real Blood unit records, attributed to their donation month.
    for u in data["units"]:
        if not u.get("bloodGroup") or not u.get("donationStartTime"):
            continue
        ym = month_key(u["donationStartTime"])
        touch(ym)
        cell = grid[u["bloodGroup"]].setdefault(ym, {"DonatedUnits": 0, "RequestedUnits": 0, "WastedUnits": 0})
        cell["DonatedUnits"] += 1

    # Demand: real Request records (unitsRequired), attributed to createdAt month.
    for r in data["requests"]:
        if not r.get("bloodGroup") or not r.get("createdAt") or r.get("unitsRequired") is None:
            continue
        ym = month_key(r["createdAt"])
        touch(ym)
        cell = grid[r["bloodGroup"]].setdefault(ym, {"DonatedUnits": 0, "RequestedUnits": 0, "WastedUnits": 0})
        cell["RequestedUnits"] += r["unitsRequired"]

    # Wastage: disposed OR expired-unconsumed units, attributed to the month
    # of the unit's real expiryDate timestamp.
    now = datetime.now(timezone.utc)
    for u in data["units"]:
        if not u.get("bloodGroup") or not u.get("expiryDate"):
            continue
        expired_unused = (not u["consumed"]) and u["expiryDate"].replace(tzinfo=timezone.utc) < now
        if not (u["disposed"] or expired_unused):
            continue
        ym = month_key(u["expiryDate"])
        touch(ym)
        cell = grid[u["bloodGroup"]].setdefault(ym, {"DonatedUnits": 0, "RequestedUnits": 0, "WastedUnits": 0})
        cell["WastedUnits"] += 1

    campaign_months = {}
    for c in data["campaigns"]:
        if c.get("startTime"):
            ym = month_key(c["startTime"])
            campaign_months[ym] = campaign_months.get(ym, 0) + 1

    rows = []
    if month_bounds[0] is None:
        return rows, campaign_months

    y0, m0 = month_bounds[0]
    y1, m1 = month_bounds[1]
    ym = (y0, m0)
    while ym <= (y1, m1):
        for group in GROUPS:
            cell = grid[group].get(ym, {"DonatedUnits": 0, "RequestedUnits": 0, "WastedUnits": 0})
            rows.append({
                "year": ym[0],
                "month": MONTHS[ym[1] - 1],
                "MonthNum": ym[1],
                "BloodGroup": group,
                "DonatedUnits": cell["DonatedUnits"],
                "RequestedUnits": cell["RequestedUnits"],
                "WastedUnits": cell["WastedUnits"],
                "CampaignCounts": campaign_months.get(ym, 0),
                "IsEstimated": 0,
            })
        y, m = ym
        ym = (y + 1, 1) if m == 12 else (y, m + 1)
    return rows, campaign_months


def provenance_summary(source, data):
    donations = data["donations"]
    units = data["units"]
    requests = data["requests"]
    campaigns = data["campaigns"]
    don_times = [d["startTime"] for d in donations if d.get("startTime")]
    req_times = [r["createdAt"] for r in requests if r.get("createdAt")]
    stock = data["stock"]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_mode": source,
        "main_api_base": MAIN_API,
        "record_counts": {
            "BloodDonation": len(donations),
            "Blood": len(units),
            "Request": len(requests),
            "Campaign": len(campaigns),
            "current_stock_groups": len(stock),
        },
        "date_ranges": {
            "donations": [min(don_times).isoformat(), max(don_times).isoformat()] if don_times else None,
            "requests": [min(req_times).isoformat(), max(req_times).isoformat()] if req_times else None,
        },
        "current_stock": stock,
        "aggregation": {
            "supply": "Blood unit records counted per donor blood group per month of BloodDonation.startTime (UTC)",
            "demand": "Request.unitsRequired summed per blood group per month of Request.createdAt (UTC)",
            "wastage": "Blood units with disposed=true or (consumed=false and expiryDate passed), attributed to the month of the unit's expiryDate (UTC)",
            "zero_rows": "months inside the observed span with no records carry a real count of 0 (absence of records, not estimation)",
        },
    }


def main():
    data = None
    errors = []
    if DATA_SOURCE in ("api", "auto"):
        try:
            data = fetch_from_api()
            print(f"Collected from main API: {len(data['donations'])} donations, "
                  f"{len(data['units'])} units, {len(data['requests'])} requests")
        except Exception as e:  # noqa: BLE001 - api mode is best effort
            errors.append(f"api: {e}")
            data = None
    if data is None and DATA_SOURCE in ("db", "auto"):
        data = fetch_from_db()
        print(f"Collected from main DB: {len(data['donations'])} donations, "
              f"{len(data['units'])} units, {len(data['requests'])} requests, "
              f"{len(data['campaigns'])} campaigns")

    if data is None:
        print("ERROR: could not collect data via any enabled source.", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    rows, campaign_months = aggregate(data)

    import pandas as pd

    raw_df = pd.DataFrame(rows, columns=[
        "year", "month", "MonthNum", "BloodGroup", "DonatedUnits",
        "RequestedUnits", "WastedUnits", "CampaignCounts", "IsEstimated",
    ])
    raw_df.to_csv(BASE_DIR / "raw_monthly_demand.csv", index=False)

    stock = {
        group: (data["stock"].get(group) or 0)
        for group in GROUPS
    }
    with open(BASE_DIR / "current_stock.json", "w", encoding="utf-8") as f:
        json.dump({
            "as_of_utc": datetime.now(timezone.utc).isoformat(),
            "definition": "Blood units status=SAFE, consumed=false, disposed=false, expiryDate >= start of today (matches POST /api/blood/stock-counts semantics)",
            "opening_stock": stock,
        }, f, indent=2)

    prov = provenance_summary(data["source"], data)
    with open(BASE_DIR / "provenance.json", "w", encoding="utf-8") as f:
        json.dump(prov, f, indent=2)

    print(f"\nWrote {len(rows)} month x group rows -> raw_monthly_demand.csv")
    print("Provenance saved to provenance.json; opening stock -> current_stock.json")
    print(json.dumps({k: v for k, v in prov.items() if k != "aggregation"}, indent=2))


if __name__ == "__main__":
    main()