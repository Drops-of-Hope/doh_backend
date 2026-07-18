"""
train_model.py (v2 - trains all 3 targets)
--------------------------------------------
Trains one XGBoost model per demand target:
  - Blood_Requests_est        -> model_requests.json
  - RCC_Issues_est             -> model_rcc_issues.json
  - Total_Component_Issues_est -> model_total_issues.json

Also saves metrics.json with each model's test MAE (average error),
which api_server.py uses to build a "confidence range" around each
prediction, and feature_importance per model for the "why" endpoint.

Usage:
    python3 train_model.py
"""

import json
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

DATA_PATH = "training_data.csv"

FEATURES = [
    "MonthNum", "Quarter", "HolidayMonth", "FestivalMonth",
    "PrevMonthDemand", "PrevYearDemand",
    "Rolling3DemandAvg", "Rolling6DemandAvg",
    "MonthSin", "MonthCos",
]

# target column -> output model filename
TARGETS = {
    "Blood_Requests_est": "model_requests.json",
    "RCC_Issues_est": "model_rcc_issues.json",
    "Total_Component_Issues_est": "model_total_issues.json",
}


def main():
    df = pd.read_csv(DATA_PATH)
    df = df.dropna(subset=FEATURES + list(TARGETS.keys()))
    print(f"Training on {len(df)} usable rows.\n")

    metrics = {}

    for target_col, out_path in TARGETS.items():
        X = df[FEATURES]
        y = df[target_col]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
        )
        model.fit(X_train, y_train)

        preds = model.predict(X_test)
        mae = float(mean_absolute_error(y_test, preds))
        r2 = float(r2_score(y_test, preds))

        importances = dict(zip(FEATURES, [float(x) for x in model.feature_importances_]))
        top_features = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)

        print(f"[{target_col}] MAE={mae:.1f}  R^2={r2:.3f}  -> saved {out_path}")

        model.save_model(out_path)

        metrics[target_col] = {
            "model_file": out_path,
            "mae": mae,
            "r2": r2,
            "feature_importance": [{"feature": f, "importance": round(v, 4)} for f, v in top_features],
        }

    with open("metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print("\nSaved metrics.json (used by api_server.py for confidence ranges + 'why' info)")


if __name__ == "__main__":
    main()
