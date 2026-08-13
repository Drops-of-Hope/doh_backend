# Blood-Demand Forecast Service — Integration Guide

The forecast service is a Python/Flask API (`prediction/api_server.py`) that serves
XGBoost-based predictions on **port 5005**. It reads **real** data from the main
application backend (`http://localhost:5000`) or its database — no fabricated
records, synthetic columns, or interpolated months are ever used. When there is
not enough real history for an entity, the API returns the documented
`insufficient_data` error instead of inventing numbers.

---

## 1. Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/predict?year=2026&month=August` | Single-month forecast, aggregate targets | none |
| GET | `/forecast?start_year=2026&start_month=August&months=6` | Rolling aggregate forecast | none |
| GET | `/why?target=Blood_Requests_est[&blood_group=O+]` | Feature importance / model info | none |
| GET | `/forecast/group?start_year&start_month&months&blood_group` | **Feature 1** — per-blood-group demand forecast (+ waste risk) | none |
| GET | `/netposition?start_year&start_month&months` | **Feature 2/3** — opening stock, supply/demand/wastage estimates, net position | none |

Blood groups are accepted in either form on input and **always returned in short
form**: `O+`, `A-`, `AB+`, `B-` … (or `O_POSITIVE`, `A_NEGATIVE` … on input).

Dates use `start_year` (int) and `start_month` (full English month name,
e.g. `January`), `months` defaults to 6.

### 1.1 GET /forecast/group — per-group demand forecast

Query params: `start_year`, `start_month`, `months`, `blood_group` (optional —
omit to get every eligible group).

Eligibility: a blood group must have ≥ 12 real months of demand history
(`MIN_HISTORY_MONTHS` env, default 12). Groups below the bar are excluded and
listed in `excluded`.

**200 OK** — every point keeps the existing `ForecastDataPoint` fields plus
`blood_group`. `wastage_est` / `wastage_confidence_range` are included when the
wastage model is trained, so the frontend can show "waste risk".

```jsonc
// schema (values below reflect the shape once ≥12 real months exist)
{
  "months_forecast": 6,
  "start_year": 2026,
  "start_month": "August",
  "blood_group": "O+",            // null when omitted
  "target": "Group_Demand_est",
  "forecast": [
    {
      "year": 2026,
      "month": "August",
      "target": "Group_Demand_est",
      "blood_group": "O+",
      "predicted": 12,                                  // int, rounded units
      "confidence_range": [8, 16],                      // predicted ± per-group MAE
      "same_month_last_year": 10,                       // int or null
      "change_pct_vs_last_year": 20.0,                  // % or null
      "trend_vs_prev_month": "up",                      // "up" | "down" | "flat" | null
      "risk": "normal",                                 // "high" | "normal" | "low"
      "wastage_est": 3,                                 // present when wastage model trained
      "wastage_confidence_range": [1, 5]
    }
    // ...
  ],
  "excluded": [
    {
      "blood_group": "AB-",
      "error": "insufficient_data",
      "detail": "Blood group AB-: 'Group_Demand_est' has only 0 real months of history; at least 12 are required. No model trained rather than inventing numbers."
    }
  ]
}
```

**422 insuffdata** (requested group below the bar, or no group qualifies):

```json
{
  "error": "insufficient_data",
  "detail": "Blood group O+: 'Group_Demand_est' has only 1 real month of history; at least 12 are required. No model trained rather than inventing numbers.",
  "target": "Group_Demand_est",
  "blood_group": "O+"
}
```

**400** — unknown month or unknown blood group: `{"error": "Unknown blood_group 'XX'."}`

### 1.2 GET /netposition — supply forecast + projected net position

Query params: `start_year`, `start_month`, `months`.

Per eligible group and month:

```
net_position = opening_stock + supply_est - demand_est - wastage_est
```

`opening_stock` for the first forecast month is the **real current stock**
snapshot (`current_stock.json`; SAFE, unconsumed, undisposed, unexpired units,
matching `POST /api/blood/stock-counts` semantics). For later months it is the
previous month's `net_position` (projected). The frontend applies its own
critical/low thresholds — this API only returns numbers and bands.

**200 OK**

> Contract note: the per-group-per-month array is the top-level key `positions`
> (frontend reads `data.positions`). Each element's confidence ranges are
> `supply_confidence_range`, `demand_confidence_range`, `wastage_confidence_range`.

```jsonc
{
  "months_forecast": 6,
  "start_year": 2026,
  "start_month": "August",
  "as_of_utc": "2026-08-12T14:55:57.369358+00:00",
  "opening_stock_definition": "Blood units status=SAFE, consumed=false, disposed=false, expiryDate >= start of today (matches POST /api/blood/stock-counts semantics)",
  "opening_stock": { "O+": 23, "A-": 3, "AB-": 2, "B+": 62, "O-": 3, "A+": 22, "AB+": 10, "B-": 4 },
  "positions": [
    {
      "year": 2026,
      "month": "August",
      "blood_group": "O+",
      "opening_stock": 23,
      "supply_est": 28,
      "supply_confidence_range": [20, 36],
      "demand_est": 12,
      "demand_confidence_range": [8, 16],
      "wastage_est": 3,
      "wastage_confidence_range": [1, 5],
      "net_position": 36
    }
  ],
  "excluded": [ { "blood_group": "AB-", "error": "insufficient_data", "detail": "…" } ]
}
```

**422** — when supply/demand/wastage models are not trained (current state):
`{"error": "insufficient_data", "detail": "…", "target": "Group_Supply_est", "targets_missing": ["Group_Supply_est", …]}`

### 1.3 /predict, /forecast, /why — aggregate targets (contract preserved)

Success shapes are unchanged from the previous version (same field names and
types). `/why` gains an optional `blood_group` param usable with the
`Group_*` targets — the response adds `"blood_group"` when it is given;
omitting it is identical to before.

New behaviour with one addition, not a breaking change: when a target has **no
real-data model**, it is listed under a new `insufficient` array (`/predict`,
`/forecast`) or returned as a 422 `insufficient_data` (`/why`). A 200 is only
returned with real-model predictions; the `predictions` key holds only
model-backed targets. Genuinely unknown target names still return the legacy
`400 {"error": "Unknown target 'X'. Options: [...]"}`.

```jsonc
// /predict 200 (once trained on real data) — unchanged contract:
{
  "year": 2026,
  "month": "August",
  "predictions": {
    "Blood_Requests_est": {
      "year": 2026, "month": "August", "target": "Blood_Requests_est",
      "predicted": 40,
      "confidence_range": [35, 45],
      "same_month_last_year": null,
      "change_pct_vs_last_year": null,
      "trend_vs_prev_month": "down",
      "risk": "normal"
    }
  },
  "insufficient": [ { "target": "RCC_Issues_est", "error": "insufficient_data", "detail": "…" } ]
}
```

Note on legacy targets: `Blood_Requests_est` is trained from real
`Request` records (aggregate of `unitsRequired` per month). `RCC_Issues_est`
and `Total_Component_Issues_est` have **no real source** — the main backend
holds zero issue/dispatch records (`BloodRequest` / `BloodTransit` are empty) —
so they are permanently reported as `insufficient_data` until such records
exist; they are never fitted to synthetic history.

## 2. Error contract

All "not enough real data" responses share one shape (HTTP 422):

```json
{
  "error": "insufficient_data",
  "detail": "<plain-text explanation with the real counts>",
  "target": "<target name>",         // when applicable
  "blood_group": "O+",               // when a group caused the failure
  "excluded": [ … ],                 // /forecast/group, /netposition (per-group detail)
  "targets_missing": [ … ]           // /netposition (untrained targets)
}
```

Malformed parameters keep the original 400 shape, e.g.
`{"error": "Unknown month 'NotAMonth'"}`.

## 3. Data provenance (current real state — generated 2026-08-12)

Collection mode: **database** (`PREDICTION_DATA_SOURCE=auto` tried the main API
first — it was not running — and fell back to the main backend's PostgreSQL
database, same tables the API endpoints read. `provenance.json` records the
mode, counts and ranges of every run.)

| Series | Source endpoint (contract) | Source table/columns | Real records | Date range (UTC) |
|---|---|---|---|---|
| Supply (donated units) | GET /api/blood-donation | `BloodDonation.startTime` + `User.bloodGroup`, via `Blood` unit rows | 291 donations → **243 unit records** | 2026-03-18 → 2026-07-31 |
| Demand (requested units) | GET /api/requests/pending/by-recipient, /api/requests/summary | `Request.bloodGroup`, `Request.unitsRequired`, `Request.createdAt` | **3 request records** (10 units: O+ 3, A- 2, B+ 5; all 2026-07-18, PENDING) | 2026-07-18 |
| Wastage | POST /api/blood/expired-units, /api/blood/stock-counts | `Blood.disposed`, `Blood.expiryDate`, `Blood.consumed` | **118 expired-unconsumed + 0 disposed** units | by `expiryDate` month: 2026-06 (20), 2026-07 (40), 2026-08 (58) |
| Campaigns (feature only) | GET /api/campaigns/…/medical-establishment/:id | `Campaign.startTime` | **1 campaign** (2026-07-17) | 2026-07 |
| Opening stock | POST /api/blood/stock-counts `{inventory_id}` | `Blood` SAFE, unconsumed/undisposed, unexpired | **129 units** across 8 groups | snapshot 2026-08-12 |

Aggregation method (all months UTC, month = calendar month of the record's own
timestamp):

- **Supply** — count of real `Blood` unit records per donor blood group, month
  of `BloodDonation.startTime`. (A few donations have no unit record yet, so
  unit counts can be lower than donation counts; units are the real donated
  items.)
- **Demand** — sum of `Request.unitsRequired` per blood group, month of
  `Request.createdAt`.
- **Wastage** — units with `disposed = true`, or `consumed = false` with
  `expiryDate` already passed, attributed to the calendar month of the unit's
  real `expiryDate` (its only real time marker).
- **Zeros are real** — a month inside the observed span with no records carries
  a real count of 0 (absence of records), never an interpolated estimate.
- **Lag features are real** — `PrevMonth*`, `PrevYear*`, `Rolling3*`,
  `Rolling6*` are computed only from real historical values; where history is
  missing they stay empty (NaN) and the row is excluded from training, never
  filled in.

Per-group real history (months containing ≥1 record):

| Group | Supply | Demand | Wastage | Current stock |
|---|---|---|---|---|
| A+ | 1 (2026-07) | 0 | 1 (2026-08) | 22 |
| A- | 1 (2026-07) | 1 (2026-07) | 1 (2026-08) | 3 |
| AB+ | 1 (2026-07) | 0 | 1 (2026-08) | 10 |
| AB- | 1 (2026-07) | 0 | 1 (2026-08) | 2 |
| B+ | 3 (2026-05/06/07) | 1 (2026-07) | 3 (2026-06/07/08) | 62 |
| B- | 1 (2026-07) | 0 | 1 (2026-08) | 4 |
| O+ | 1 (2026-07) | 1 (2026-07) | 1 (2026-08) | 23 |
| O- | 1 (2026-07) | 0 | 1 (2026-08) | 3 |

## 4. Are the aggregate endpoints trained on real data?

**Pipeline status: not trained yet — real data is currently too short**, and no
number is invented to compensate. `Blood_Requests_est` has 1 real month (July
2026, 3 records); `RCC_Issues_est` / `Total_Component_Issues_est` have 0 source
records; every group target has ≤ 3 real months (B+ best case). All model
endpoints currently answer `insufficient_data` with the exact real counts. The
moment ≥ 12 real months exist for an entity, the standard retraining command
regenerates the models and the endpoints switch to 200 responses automatically
(no code change, no restart needed beyond the server reloading artifacts).

## 5. Retraining contract (unchanged pipeline)

```
python generate_raw_dataset.py   # real records -> raw_monthly_demand.csv, current_stock.json, provenance.json
python build_training_data.py    # real feature engineering -> training_data.csv (IsEstimated=0 only)
python train_model.py            # XGBoost per target -> model_*.json + metrics.json (per-group metrics)
```

- One XGBoost regressor per target with `blood_group` as a categorical
  (ordinal-encoded `BloodGroupNum`) feature — not 24 separate models.
- Entities below `MIN_HISTORY_MONTHS` (default 12) are excluded from training
  and recorded as `insufficient_data` in `metrics.json` with their real month
  counts.
- `metrics.json` per-group shape (once trained):

```jsonc
"Group_Demand_est": {
  "status": "trained",
  "model_file": "model_Group_Demand_est.json",
  "mae": 2.5, "r2": 0.6,
  "feature_importance": [ { "feature": "PrevMonthDemand", "importance": 0.31 } ],
  "per_group": {
    "O+": { "status": "trained", "mae": 2.1, "r2": 0.58,
            "months_with_real_records": 14, "real_records": 96,
            "date_range": ["2025-01", "2026-02"] }
  },
  "n_training_rows": 96, "n_real_months": 14,
  "trained_at": "2026-08-12T…", "date_range": ["2025-01", "2026-02"]
}
```

## 6. Environment variables

No env vars are required for the frontend — it only talks to the endpoints
above. Operational knobs for the prediction service:

| Var | Default | Purpose |
|---|---|---|
| `PREDICTION_MAIN_API` | `http://localhost:5000` | Main backend base URL (API data mode) |
| `PREDICTION_DATABASE_URL` | repo `.env` `DATABASE_URL` | Main backend Postgres URL (DB data mode) |
| `PREDICTION_DATA_SOURCE` | `auto` | `api` \| `db` \| `auto` (API first, DB fallback) |
| `MIN_HISTORY_MONTHS` | `12` | Minimum real months per entity before a model trains |

## 7. Files

`api_server.py` (server, port 5005) · `generate_raw_dataset.py` ·
`build_training_data.py` · `train_model.py` · `raw_monthly_demand.csv` ·
`training_data.csv` · `metrics.json` · `current_stock.json` ·
`provenance.json` · `model_*.json` (created on first successful training).