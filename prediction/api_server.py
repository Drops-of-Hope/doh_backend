"""
api_server.py (v3 - real-data, per-blood-group targets)
--------------------------------------------------------
Run:
    python3 api_server.py
Serves at http://localhost:5005

Every prediction is produced by models trained ONLY on real records pulled
from the main application backend (see generate_raw_dataset.py /
provenance.json). When a target or blood group does not have enough real
history, the API returns the documented error instead:

    {"error": "insufficient_data", "detail": "..."}    (HTTP 422)

ENDPOINTS

1) GET /predict?year=2025&month=January
   Unchanged success contract (predictions per aggregate target). Targets
   without a real model are listed in the "insufficient" array.

2) GET /forecast?start_year=2025&start_month=January&months=6
   Unchanged success contract for the aggregate targets.

3) GET /why?target=Blood_Requests_est[&blood_group=O+]
   Unchanged success contract for aggregate targets. Extended with an
   optional blood_group param for the Group_* targets; requested
   (target, group) with no real model returns insufficient_data.

4) GET /forecast/group?start_year&start_month&months&blood_group
   Per-blood-group demand forecast (Feature 1). blood_group optional -
   when omitted all eligible groups are returned and groups with too
   little real history are listed under "excluded".

5) GET /netposition?start_year&start_month&months
   Projected net position per group per month (Feature 2 + Feature 3):
   opening_stock (real current stock), supply_est / demand_est /
   wastage_est with confidence ranges, and net_position
   (= opening + supply - demand - wastage).
"""

import json
import math
import os
from pathlib import Path

import pandas as pd
import xgboost as xgb
from flask import Flask, request, jsonify

BASE_DIR = Path(__file__).resolve().parent
HISTORY_PATH = BASE_DIR / "training_data.csv"      # real rows only (IsEstimated=0)
METRICS_PATH = BASE_DIR / "metrics.json"
STOCK_PATH = BASE_DIR / "current_stock.json"       # real opening-stock snapshot
MIN_HISTORY_MONTHS = int(os.environ.get("MIN_HISTORY_MONTHS", "12"))

CALENDAR_FEATURES = [
    "MonthNum", "Quarter", "HolidayMonth", "FestivalMonth",
    "MonthSin", "MonthCos",
]

# target -> (training column, is_group_target, model file key in metrics.json)
TARGETS = {
    "Blood_Requests_est": ("RequestedUnits", False),
}

GROUP_TARGETS = {
    "Group_Supply_est": "DonatedUnits",
    "Group_Demand_est": "RequestedUnits",
    "Group_Wastage_est": "WastedUnits",
}

# Legacy targets with no real source records - always reported insufficient.
NO_SOURCE_TARGETS = ["RCC_Issues_est", "Total_Component_Issues_est"]

MONTH_TO_NUM = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}
NUM_TO_MONTH = {v: k for k, v in MONTH_TO_NUM.items()}
HOLIDAY_MONTHS = set(range(1, 13))
FESTIVAL_MONTHS = {4, 5, 10, 12}

GROUP_LIST = ["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-"]
ENUM_TO_SHORT = {
    "A_POSITIVE": "A+", "B_POSITIVE": "B+", "AB_POSITIVE": "AB+",
    "O_POSITIVE": "O+", "A_NEGATIVE": "A-", "B_NEGATIVE": "B-",
    "AB_NEGATIVE": "AB-", "O_NEGATIVE": "O-",
}


def normalize_group(value):
    """Accept 'O+', 'o-', 'O_POSITIVE' ... -> canonical short form 'O+'."""
    if not value:
        return None
    v = str(value).strip().upper().replace("\u2212", "-").replace("−", "-")
    if v in ENUM_TO_SHORT:
        return ENUM_TO_SHORT[v]
    if v.endswith("POSITIVE") or v.endswith("NEGATIVE"):
        return None
    ab = v.replace("+", "").replace("-", "")
    if ab in ("A", "B", "O", "AB") and v[-1] in ("+", "-"):
        return f"{ab}{v[-1]}"
    return None


app = Flask(__name__)


# ---- load everything once at startup -------------------------------------

with open(METRICS_PATH, encoding="utf-8") as f:
    metrics = json.load(f)

models = {}
for target, meta in metrics.items():
    if meta.get("status") == "trained" and "model_file" in meta:
        m = xgb.XGBRegressor()
        m.load_model(str(BASE_DIR / meta["model_file"]))
        models[target] = m


def trained_metrics(target, group=None):
    meta = metrics.get(target)

    def _status(m):
        return (m or {}).get("status")

    if group:
        if not meta or _status(meta) != "trained":
            return None
        gm = meta.get("per_group", {}).get(group)
        if not gm or _status(gm) != "trained":
            return None
        return {"mae": gm.get("mae"), "r2": gm.get("r2")}
    if not meta:
        return None
    if _status(meta) != "trained":
        return None
    return {"mae": meta.get("mae"), "r2": meta.get("r2")}


def history():
    """Real training rows keyed by (target_kind, group) -> list of dicts."""
    csv = pd.read_csv(HISTORY_PATH)
    csv = csv[csv["IsEstimated"] == 0]
    out = {}
    for col in list(GROUP_TARGETS.values()) + ["RequestedUnits", "DonatedUnits", "WastedUnits"]:
        out[col] = {}
    for r in csv.itertuples(index=False):
        group = r.BloodGroup
        for col in ("DonatedUnits", "RequestedUnits", "WastedUnits"):
            out[col].setdefault(group, {})[(int(r.Year), MONTH_TO_NUM[r.Month])] = float(getattr(r, col))
    return out


HIST = history()

with open(STOCK_PATH, encoding="utf-8") as f:
    stock_snapshot = json.load(f)
OPENING_STOCK = stock_snapshot.get("opening_stock", {})


def availability_detail(target, group=None):
    """Human-readable detail for an insufficient (target[, group])."""
    if target in NO_SOURCE_TARGETS:
        return metrics[target].get("detail", f"No real source records for '{target}'.")
    meta = metrics.get(target) or {}
    if group:
        gm = (meta.get("per_group") or {}).get(group) or {}
        months = gm.get("months_with_real_records", 0)
        return (
            f"Blood group {group}: '{target}' has only {months} real month" + ("s" if months != 1 else "") + " "
            f"of history; at least {MIN_HISTORY_MONTHS} are required. "
            f"No model trained rather than inventing numbers."
        )
    detail = meta.get("detail")
    if detail:
        return detail
    return f"'{target}' has no trained model after real-data evaluation."


def insufficient_error(target=None, group=None, extra=None):
    payload = {
        "error": "insufficient_data",
        "detail": availability_detail(target, group) if target else
                  "Not enough real history for any requested entity; no numbers were invented.",
    }
    if target:
        payload["target"] = target
    if group:
        payload["blood_group"] = group
    if extra:
        payload.update(extra)
    return jsonify(payload), 422


# ---- group/target level helpers ------------------------------------------

def groups_with_real_history(target_col, min_months=MIN_HISTORY_MONTHS):
    eligible, excluded = [], {}
    for group in GROUP_LIST:
        series = HIST[target_col].get(group) or {}
        months = {ym for ym, v in series.items() if v > 0}
        if len(months) >= min_months:
            eligible.append(group)
        else:
            excluded[group] = {
                "months_with_real_records": sorted(months),
                "required_months": min_months,
            }
    return eligible, excluded


def next_month(year, month_num):
    return (year + 1, 1) if month_num == 12 else (year, month_num + 1)


def prev_month(year, month_num):
    return (year - 1, 12) if month_num == 1 else (year, month_num - 1)


def known_series(target, group="ALL"):
    """In-memory real + chained-predicted series per (target, group)."""
    col = GROUP_TARGETS[target] if target in GROUP_TARGETS else TARGETS[target][0]
    base = {k: dict(v) for k, v in (HIST[col].get(group) or {}).items()}
    return base


def build_features(year, month_num, target, group, known):
    """Assumes every month this needs (prev month, prev year, last 6 months)
    is already present in `known` - call ensure_predicted_through() first."""
    col = GROUP_TARGETS[target] if target in GROUP_TARGETS else TARGETS[target][0]
    kind = {"DonatedUnits": "Supply", "RequestedUnits": "Demand", "WastedUnits": "Wastage"}[col]
    tgt = target if target in GROUP_TARGETS else "Blood_Requests_est"

    py, pm = prev_month(year, month_num)
    prev_val = known[(py, pm)]
    prev_year_val = known[(year - 1, month_num)]

    seq = []
    yy, mm = year, month_num
    for _ in range(6):
        yy, mm = prev_month(yy, mm)
        seq.append(known[(yy, mm)])
    seq.reverse()

    rolling3 = sum(seq[-3:]) / 3
    rolling6 = sum(seq[-6:]) / 6
    angle = 2 * math.pi * (month_num - 1) / 12

    row = {
        "MonthNum": month_num,
        "Quarter": (month_num - 1) // 3 + 1,
        "HolidayMonth": 1 if month_num in HOLIDAY_MONTHS else 0,
        "FestivalMonth": 1 if month_num in FESTIVAL_MONTHS else 0,
        f"PrevMonth{kind}": prev_val,
        f"PrevYear{kind}": prev_year_val,
        f"Rolling3{kind}Avg": rolling3,
        f"Rolling6{kind}Avg": rolling6,
        "MonthSin": math.sin(angle),
        "MonthCos": math.cos(angle),
    }
    if group != "ALL":
        row["BloodGroupNum"] = group_to_num(group)
    return pd.DataFrame([row])[model_features(tgt, group)]


def model_features(target, group):
    kind = {"Group_Supply_est": "Supply", "Group_Demand_est": "Demand",
            "Group_Wastage_est": "Wastage", "Blood_Requests_est": "Demand"}[target]
    feats = CALENDAR_FEATURES + [
        f"PrevMonth{kind}", f"PrevYear{kind}",
        f"Rolling3{kind}Avg", f"Rolling6{kind}Avg",
    ]
    if group != "ALL":
        feats = feats + ["BloodGroupNum"]
    return feats


def ensure_predicted_through(year, month_num, target, group, known):
    """Auto-chains forward like v2: predicts every month between the latest
    known real/predicted point and the requested month, caching results."""
    tgt_tuple = (year, month_num)
    if tgt_tuple in known:
        return
    latest = max(known.keys())
    if tgt_tuple <= latest:
        return
    cy, cm = next_month(*latest)
    while True:
        if (cy, cm) not in known:
            row = build_features(cy, cm, target, group, known)
            pred = float(models[target].predict(row)[0])
            known[(cy, cm)] = pred
        if (cy, cm) == tgt_tuple:
            break
        cy, cm = next_month(cy, cm)


def group_to_num(group):
    if group == "ALL":
        return 0
    return {"A+": 1, "A-": 2, "B+": 3, "B-": 4, "AB+": 5, "AB-": 6, "O+": 7, "O-": 8}[group]


def predict_one(year, month_num, target, group="ALL"):
    """Same point shape as v2 (ForecastDataPoint) plus group fields."""
    known = known_series(target, group)
    ensure_predicted_through(year, month_num, target, group, known)

    kind = {"Group_Supply_est": "Supply", "Group_Demand_est": "Demand",
            "Group_Wastage_est": "Wastage", "Blood_Requests_est": "Demand"}[target]
    lag_col = f"Rolling6{kind}Avg"

    pred = known[(year, month_num)]
    mma = trained_metrics(target, group if group != "ALL" else None)
    mae = mma["mae"] if mma and mma.get("mae") is not None else (metrics[target].get("mae") or 0)

    py, pm = prev_month(year, month_num)
    prev_val = known.get((py, pm))
    same_month_last_year = known.get((year - 1, month_num))

    trend = None
    if prev_val is not None:
        trend = "up" if pred > prev_val else ("down" if pred < prev_val else "flat")

    change_pct = None
    if same_month_last_year:
        change_pct = round((pred - same_month_last_year) / same_month_last_year * 100, 1)

    seq = []
    yy, mm = year, month_num
    for _ in range(6):
        yy, mm = prev_month(yy, mm)
        seq.append(known[(yy, mm)])
    rolling6 = sum(seq) / 6
    risk = "high" if pred > rolling6 * 1.15 else ("low" if pred < rolling6 * 0.85 else "normal")

    point = {
        "year": year,
        "month": NUM_TO_MONTH[month_num],
        "target": target,
        "predicted": round(pred),
        "confidence_range": [round(pred - mae), round(pred + mae)],
        "same_month_last_year": round(same_month_last_year) if same_month_last_year else None,
        "change_pct_vs_last_year": change_pct,
        "trend_vs_prev_month": trend,
        "risk": risk,
    }
    if group != "ALL":
        point["blood_group"] = group
    return point


# ---- /predict and /forecast (existing success contract preserved) --------

@app.route("/predict")
def predict_endpoint():
    year = int(request.args.get("year"))
    month_name = request.args.get("month")
    if month_name not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{month_name}'"}), 400
    month_num = MONTH_TO_NUM[month_name]

    results, insufficient = {}, []
    for target in list(TARGETS) + NO_SOURCE_TARGETS:
        if target not in models:
            insufficient.append({"target": target, "error": "insufficient_data",
                                 "detail": availability_detail(target)})
            continue
        try:
            results[target] = predict_one(year, month_num, target)
        except KeyError:
            insufficient.append({"target": target, "error": "insufficient_data",
                                 "detail": "Could not build a real-data prediction chain to this month."})

    if not results:
        return jsonify({"error": "insufficient_data",
                        "detail": "No aggregate target has a real-data model yet.",
                        "insufficient": insufficient}), 422

    return jsonify({"year": year, "month": month_name,
                    "predictions": results, "insufficient": insufficient})


@app.route("/forecast")
def forecast_endpoint():
    start_year = int(request.args.get("start_year"))
    start_month = request.args.get("start_month")
    months = int(request.args.get("months", 6))
    if start_month not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{start_month}'"}), 400

    year, month_num = start_year, MONTH_TO_NUM[start_month]
    forecast = {target: [] for target in models if target in TARGETS or target in NO_SOURCE_TARGETS}
    insufficient = [
        {"target": t, "error": "insufficient_data", "detail": availability_detail(t)}
        for t in (list(TARGETS) + NO_SOURCE_TARGETS) if t not in models
    ]

    try:
        for _ in range(months):
            for target in list(TARGETS):
                if target in models:
                    forecast[target].append(predict_one(year, month_num, target))
            year, month_num = next_month(year, month_num)
    except KeyError:
        return jsonify({"error": "Could not build a real-data prediction chain that far."}), 400

    if not any(forecast.values()):
        return jsonify({"error": "insufficient_data",
                        "detail": f"No aggregate target has a real-data model for {start_month} {start_year}.",
                        "insufficient": insufficient}), 422

    return jsonify({"months_forecast": months, "forecast": forecast, "insufficient": insufficient})


# ---- /why (existing contract preserved; optional blood_group added) ------

@app.route("/why")
def why_endpoint():
    target = request.args.get("target", "Blood_Requests_est")
    blood_group = request.args.get("blood_group")
    group = normalize_group(blood_group) if blood_group else None
    if blood_group and group is None:
        return jsonify({"error": f"Unknown blood_group '{blood_group}'."}), 400

    if target not in metrics:
        return jsonify({"error": f"Unknown target '{target}'. Options: {list(metrics.keys())}"}), 400

    m = trained_metrics(target, group)
    if m is None:
        return insufficient_error(target, group)
    return jsonify({
        "target": target,
        "blood_group": group,
        "model_mae": m["mae"],
        "model_r2": m["r2"],
        "feature_importance": metrics[target]["feature_importance"],
    })


# ---- Feature 1: /forecast/group ------------------------------------------

@app.route("/forecast/group")
def forecast_group_endpoint():
    start_year = int(request.args.get("start_year"))
    start_month = request.args.get("start_month")
    months = int(request.args.get("months", 6))
    if start_month not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{start_month}'"}), 400

    requested_group = None
    if request.args.get("blood_group"):
        requested_group = normalize_group(request.args.get("blood_group"))
        if requested_group is None:
            return jsonify({"error": f"Unknown blood_group '{request.args.get('blood_group')}'."}), 400
        if "Group_Demand_est" not in models or requested_group not in (metrics["Group_Demand_est"].get("per_group") or {}):
            return insufficient_error("Group_Demand_est", requested_group)
        if metrics["Group_Demand_est"]["per_group"][requested_group].get("status") != "trained":
            return insufficient_error("Group_Demand_est", requested_group)

    eligible, excluded = groups_with_real_history("RequestedUnits")
    if requested_group:
        eligible, excluded = [requested_group], {}
    if not eligible:
        return insufficient_error(
            "Group_Demand_est",
            extra={"excluded": {g: {"months_with_real_records": e["months_with_real_records"]}
                                for g, e in excluded.items()}},
        )

    year, month_num = start_year, MONTH_TO_NUM[start_month]
    forecast = []
    try:
        for _ in range(months):
            for group in sorted(eligible):
                point = predict_one(year, month_num, "Group_Demand_est", group)
                if "Group_Wastage_est" in models:
                    wp = predict_one(year, month_num, "Group_Wastage_est", group)
                    point["wastage_est"] = wp["predicted"]
                    point["wastage_confidence_range"] = wp["confidence_range"]
                forecast.append(point)
            year, month_num = next_month(year, month_num)
    except KeyError:
        return jsonify({"error": "Could not build a real-data prediction chain that far."}), 400

    return jsonify({
        "months_forecast": months,
        "start_year": start_year,
        "start_month": start_month,
        "blood_group": requested_group,
        "target": "Group_Demand_est",
        "forecast": forecast,
        "excluded": [
            {"blood_group": g, "error": "insufficient_data", "detail": availability_detail("Group_Demand_est", g)}
            for g, e in excluded.items()
        ],
    })


# ---- Feature 2 + 3: /netposition ------------------------------------------

@app.route("/netposition")
def netposition_endpoint():
    start_year = int(request.args.get("start_year"))
    start_month = request.args.get("start_month")
    months = int(request.args.get("months", 6))
    if start_month not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{start_month}'"}), 400

    missing = [t for t in GROUP_TARGETS if t not in models]
    if missing:
        return insufficient_error(
            missing[0],
            extra={"targets_missing": missing,
                   "detail": (f"Net position needs supply/demand/wastage models; none trained yet "
                              f"(missing: {missing}). Real opening stock is available but estimates would be invented.")},
        )

    eligible_all = []
    per_target = {}
    for target in GROUP_TARGETS:
        eligible, excluded = groups_with_real_history(GROUP_TARGETS[target])
        per_target[target] = excluded
        eligible_all.append(set(eligible))
    eligible = sorted(set.intersection(*eligible_all)) if eligible_all else []
    if not eligible:
        return insufficient_error(
            "Group_Supply_est",
            extra={"per_target": {t: {g: len(v["months_with_real_records"])
                                      for g, v in e.items()} for t, e in per_target.items()}},
        )

    year, month_num = start_year, MONTH_TO_NUM[start_month]
    positions = []
    last_close = {}
    try:
        for step in range(months):
            for group in sorted(eligible):
                supply = predict_one(year, month_num, "Group_Supply_est", group)
                demand = predict_one(year, month_num, "Group_Demand_est", group)
                wastage = predict_one(year, month_num, "Group_Wastage_est", group)
                opening = int(OPENING_STOCK.get(group, 0)) if step == 0 else last_close[group]
                supply_v = supply["predicted"]
                demand_v = demand["predicted"]
                wastage_v = wastage["predicted"]
                net = opening + supply_v - demand_v - wastage_v
                positions.append({
                    "year": year,
                    "month": NUM_TO_MONTH[month_num],
                    "blood_group": group,
                    "opening_stock": round(opening),
                    "supply_est": round(supply_v),
                    "supply_confidence_range": supply["confidence_range"],
                    "demand_est": round(demand_v),
                    "demand_confidence_range": demand["confidence_range"],
                    "wastage_est": round(wastage_v),
                    "wastage_confidence_range": wastage["confidence_range"],
                    "net_position": round(net),
                })
                last_close[group] = net
            year, month_num = next_month(year, month_num)
    except KeyError:
        return jsonify({"error": "Could not build a real-data prediction chain that far."}), 400

    return jsonify({
        "months_forecast": months,
        "start_year": start_year,
        "start_month": start_month,
        "as_of_utc": stock_snapshot.get("as_of_utc"),
        "opening_stock_definition": stock_snapshot.get("definition"),
        "opening_stock": OPENING_STOCK,
        "positions": positions,
        "excluded": [
            {"blood_group": g, "error": "insufficient_data",
             "detail": availability_detail("Group_Supply_est", g)}
            for g in GROUP_LIST if g not in eligible
        ],
    })


if __name__ == "__main__":
    app.run(debug=True, port=5005)