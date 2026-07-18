"""
api_server.py (v2 - all 7 enhancements)
-----------------------------------------
Run:
    python3 api_server.py
Serves at http://localhost:5005

ENDPOINTS

1) GET /predict?year=2025&month=January
   Single month prediction, all 3 targets + comparison + confidence +
   risk flag + trend.

2) GET /forecast?start_year=2025&start_month=January&months=6
   Rolling forecast for N months ahead (for a chart), each target.

3) GET /why?target=Blood_Requests_est
   Feature importance for a given target model (for a "why this
   forecast?" tooltip). target must be one of:
   Blood_Requests_est, RCC_Issues_est, Total_Component_Issues_est
"""

import json
import math
import pandas as pd
import xgboost as xgb
from flask import Flask, request, jsonify

HISTORY_PATH = "training_data.csv"
METRICS_PATH = "metrics.json"

FEATURES = [
    "MonthNum", "Quarter", "HolidayMonth", "FestivalMonth",
    "PrevMonthDemand", "PrevYearDemand",
    "Rolling3DemandAvg", "Rolling6DemandAvg",
    "MonthSin", "MonthCos",
]

TARGETS = {
    "Blood_Requests_est": "model_requests.json",
    "RCC_Issues_est": "model_rcc_issues.json",
    "Total_Component_Issues_est": "model_total_issues.json",
}

MONTH_TO_NUM = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}
NUM_TO_MONTH = {v: k for k, v in MONTH_TO_NUM.items()}
HOLIDAY_MONTHS = set(range(1, 13))
FESTIVAL_MONTHS = {4, 5, 10, 12}

app = Flask(__name__)

# ---- load everything once at startup ----
models = {}
for target_col, filename in TARGETS.items():
    m = xgb.XGBRegressor()
    m.load_model(filename)
    models[target_col] = m

with open(METRICS_PATH) as f:
    metrics = json.load(f)

history = pd.read_csv(HISTORY_PATH)
# in-memory "known" series per target, keyed by (year, monthnum) -> value.
# Real predictions get appended here too, so /forecast can chain forward.
known = {
    target: {(int(r.Year), MONTH_TO_NUM[r.Month]): getattr(r, target) for r in history.itertuples()}
    for target in TARGETS
}


def next_month(year, month_num):
    return (year + 1, 1) if month_num == 12 else (year, month_num + 1)


def prev_month(year, month_num):
    return (year - 1, 12) if month_num == 1 else (year, month_num - 1)


def build_features(year, month_num, target):
    """Assumes every month this needs (prev month, prev year, last 6 months)
    is already present in known[target] - call ensure_predicted_through()
    first to guarantee that."""
    py, pm = prev_month(year, month_num)
    prev_val = known[target][(py, pm)]
    prev_year_val = known[target][(year - 1, month_num)]

    seq = []
    yy, mm = year, month_num
    for _ in range(6):
        yy, mm = prev_month(yy, mm)
        seq.append(known[target][(yy, mm)])
    seq.reverse()

    rolling3 = sum(seq[-3:]) / 3
    rolling6 = sum(seq[-6:]) / 6
    angle = 2 * math.pi * (month_num - 1) / 12

    return pd.DataFrame([{
        "MonthNum": month_num,
        "Quarter": (month_num - 1) // 3 + 1,
        "HolidayMonth": 1 if month_num in HOLIDAY_MONTHS else 0,
        "FestivalMonth": 1 if month_num in FESTIVAL_MONTHS else 0,
        "PrevMonthDemand": prev_val,
        "PrevYearDemand": prev_year_val,
        "Rolling3DemandAvg": rolling3,
        "Rolling6DemandAvg": rolling6,
        "MonthSin": math.sin(angle),
        "MonthCos": math.cos(angle),
    }])[FEATURES]


def ensure_predicted_through(year, month_num, target):
    """Auto-chains forward: if the target month is beyond known real/predicted
    history, this fills in every month in between (predicting each one using
    the previous predictions) so ANY future month - 2025, 2026, 2030 - works
    without a separate /forecast call first. Cached in `known`, so repeat
    calls are instant."""
    target_tuple = (year, month_num)
    if target_tuple in known[target]:
        return  # already known (real history or previously predicted)

    latest = max(known[target].keys())
    if target_tuple <= latest:
        return  # gap in the middle of real history - not expected, nothing we can do

    cy, cm = next_month(*latest)
    while True:
        if (cy, cm) not in known[target]:
            row = build_features(cy, cm, target)
            pred = float(models[target].predict(row)[0])
            known[target][(cy, cm)] = pred
        if (cy, cm) == target_tuple:
            break
        cy, cm = next_month(cy, cm)


def predict_one(year, month_num, target):
    """Returns a dict with prediction + comparison + confidence + trend + risk.
    Auto-chains forward from known history if the month is far in the future."""
    ensure_predicted_through(year, month_num, target)
    pred = known[target][(year, month_num)]

    mae = metrics[target]["mae"]
    py, pm = prev_month(year, month_num)
    prev_val = known[target].get((py, pm))
    same_month_last_year = known[target].get((year - 1, month_num))

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
        seq.append(known[target][(yy, mm)])
    rolling6 = sum(seq) / 6
    risk = "high" if pred > rolling6 * 1.15 else ("low" if pred < rolling6 * 0.85 else "normal")

    return {
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


@app.route("/predict")
def predict_endpoint():
    year = int(request.args.get("year"))
    month_name = request.args.get("month")
    if month_name not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{month_name}'"}), 400
    month_num = MONTH_TO_NUM[month_name]

    try:
        results = {target: predict_one(year, month_num, target) for target in TARGETS}
    except KeyError:
        return jsonify({"error": "Could not build a prediction chain to this month."}), 400

    return jsonify({
        "year": year,
        "month": month_name,
        "predictions": results,
    })


@app.route("/forecast")
def forecast_endpoint():
    start_year = int(request.args.get("start_year"))
    start_month = request.args.get("start_month")
    months = int(request.args.get("months", 6))
    if start_month not in MONTH_TO_NUM:
        return jsonify({"error": f"Unknown month '{start_month}'"}), 400

    year, month_num = start_year, MONTH_TO_NUM[start_month]
    forecast = {target: [] for target in TARGETS}

    try:
        for _ in range(months):
            for target in TARGETS:
                forecast[target].append(predict_one(year, month_num, target))
            year, month_num = next_month(year, month_num)
    except KeyError:
        return jsonify({"error": "Could not build a prediction chain that far."}), 400

    return jsonify({"months_forecast": months, "forecast": forecast})


@app.route("/why")
def why_endpoint():
    target = request.args.get("target", "Blood_Requests_est")
    if target not in metrics:
        return jsonify({"error": f"Unknown target '{target}'. Options: {list(metrics.keys())}"}), 400
    return jsonify({
        "target": target,
        "model_mae": metrics[target]["mae"],
        "model_r2": metrics[target]["r2"],
        "feature_importance": metrics[target]["feature_importance"],
    })


if __name__ == "__main__":
    app.run(debug=True, port=5005)
