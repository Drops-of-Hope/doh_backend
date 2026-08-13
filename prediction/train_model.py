"""
train_model.py (real-data models, per-group targets)
------------------------------------------------------
Trains ONE XGBoost regressor per target. Group targets use `BloodGroup`
as a categorical feature (single model across all blood groups) unless
a group has insufficient real history - such groups are excluded from
training and recorded as insufficient_data in metrics.json.

Targets:
  Group_Supply_est      <- DonatedUnits (real Blood unit records)
  Group_Demand_est      <- RequestedUnits (real Request records)
  Group_Wastage_est     <- WastedUnits (real disposed/expired-unused units)
  Blood_Requests_est    <- aggregate monthly demand (legacy /predict target,
                           real Request records summed over all groups)

RCC_Issues_est / Total_Component_Issues_est are NOT trained: the main
backend contains no issue/dispatch records to back them (0 records in the
BloodRequest / BloodTransit tables today), so they are recorded as
insufficient_data rather than fitted to invented history.

Minimum history: any (target, blood group) needs at least
MIN_HISTORY_MONTHS calendar months holding real records before it is
eligible (env MIN_HISTORY_MONTHS, default 12). Rows whose lag features
cannot be built from real values are dropped, never interpolated.

Writes metrics.json with per-group MAE/R2 (evaluated on each group's own
test rows) plus training provenance.

Usage:
    python3 train_model.py
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "training_data.csv"
MIN_HISTORY_MONTHS = int(os.environ.get("MIN_HISTORY_MONTHS", "12"))

CALENDAR_FEATURES = [
    "MonthNum", "Quarter", "HolidayMonth", "FestivalMonth",
    "MonthSin", "MonthCos",
]

# target name -> (target kind, training column, is_group_target)
TARGETS = {
    "Group_Supply_est": ("Supply", "DonatedUnits", True),
    "Group_Demand_est": ("Demand", "RequestedUnits", True),
    "Group_Wastage_est": ("Wastage", "WastedUnits", True),
    "Blood_Requests_est": ("Demand", "RequestedUnits", False),
}

# Legacy targets with no real source: recorded, never trained.
NO_SOURCE_TARGETS = [
    "RCC_Issues_est",
    "Total_Component_Issues_est",
]

LEVELS = {"S": 0, "A": 1, "B": 2, "O": 3, "+": 0, "-": 1}


def group_to_num(group):
    """Deterministic ordinal encoding of a blood group ("O+", "A-", ...)."""
    if group == "ALL":
        return 0
    level = LEVELS[group[0]]
    sign = LEVELS[group[1]]
    return (LEVELS[group[0]] * 2 + sign) or 0


def lag_features(target_kind):
    return [
        f"PrevMonth{target_kind}", f"PrevYear{target_kind}",
        f"Rolling3{target_kind}Avg", f"Rolling6{target_kind}Avg",
    ]


MONTH_LABEL = lambda n: f"{n} real month" + ("" if n == 1 else "s")


def months_with_records(df, target_col):
    """Calendar months that hold at least one real record for a group."""
    sub = df[df[target_col] > 0]
    return sorted(sub[["Year", "MonthNum"]].itertuples(index=False, name=None))


def main():
    df = pd.read_csv(DATA_PATH)
    df = df[df["IsEstimated"] == 0]
    metrics = {}

    for legacy in NO_SOURCE_TARGETS:
        metrics[legacy] = {
            "status": "insufficient_data",
            "detail": (
                f"No real source records exist in the main backend for '{legacy}' "
                "(0 rows in BloodRequest / BloodTransit - no issue/dispatch events). "
                "Target retrains automatically once real issue records exist."
            ),
            "real_record_count": 0,
        }

    for target, (target_kind, target_col, is_group) in TARGETS.items():
        features = CALENDAR_FEATURES + lag_features(target_kind) + (["BloodGroupNum"] if is_group else [])
        model_file = f"model_{target}.json"

        if is_group:
            eligible = {}
            for group in sorted(df[df["BloodGroup"] != "ALL"]["BloodGroup"].unique()):
                gdf = df[df["BloodGroup"] == group]
                n_months = len(months_with_records(gdf, target_col))
                if n_months >= MIN_HISTORY_MONTHS:
                    eligible[group] = n_months
            if not eligible:
                metrics[target] = {
                    "status": "insufficient_data",
                    "model_file": model_file,
                    "min_months_required": MIN_HISTORY_MONTHS,
                    "per_group": {
                        g: {
                            "status": "insufficient_data",
                            "months_with_real_records": len(months_with_records(df[df["BloodGroup"] == g], target_col)),
                        }
                        for g in sorted(df[df["BloodGroup"] != "ALL"]["BloodGroup"].unique())
                    },
                    "detail": (
                        f"Every blood group has fewer than {MIN_HISTORY_MONTHS} real months "
                        f"of history for '{target}' - no model trained rather than inventing numbers."
                    ),
                }
                continue
            train_df = df[(df["BloodGroup"].isin(eligible)) & (~df["BloodGroup"].eq("ALL"))]
        else:
            train_df = df[df["BloodGroup"] == "ALL"]

        raw_months = len(months_with_records(train_df, target_col))
        train_df = train_df.dropna(subset=features + [target_col])
        usable_months = len(months_with_records(train_df, target_col))
        if raw_months < MIN_HISTORY_MONTHS:
            metrics[target] = {
                "status": "insufficient_data",
                "model_file": model_file,
                "min_months_required": MIN_HISTORY_MONTHS,
                "months_with_real_records": raw_months,
                "detail": (
                    f"Only {MONTH_LABEL(raw_months)} of history "
                    f"{'is' if raw_months == 1 else 'are'} available for '{target}'; "
                    f"at least {MIN_HISTORY_MONTHS} are required. No model trained."
                ),
            }
            continue
        if usable_months < 6:
            metrics[target] = {
                "status": "insufficient_data",
                "model_file": model_file,
                "min_months_required": MIN_HISTORY_MONTHS,
                "months_with_real_records": raw_months,
                "usable_months_after_lag_features": usable_months,
                "detail": (
                    f"'{target}' has {MONTH_LABEL(raw_months)} but only {usable_months} usable rows with "
                    f"complete real lag features; at least 6 are required. No model trained."
                ),
            }
            continue

        X = train_df[features].copy()
        if "BloodGroupNum" in features:
            X["BloodGroupNum"] = train_df["BloodGroup"].map(group_to_num)
        y = train_df[target_col]

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

        importances = dict(zip(features, [float(x) for x in model.feature_importances_]))
        top_features = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)

        model.save_model(BASE_DIR / model_file)

        entry = {
            "status": "trained",
            "model_file": model_file,
            "mae": mae,
            "r2": r2,
            "feature_importance": [
                {"feature": f, "importance": round(v, 4)} for f, v in top_features
            ],
        }

        if target.startswith("Group_"):
            per_group = {}
            X_test2 = X_test.copy()
            X_test2["BloodGroupNum"] = X_test["BloodGroupNum"]
            test_pairs = X_test2[["BloodGroupNum"]].assign(_y=y_test, _p=preds)
            for group in eligible:
                gnum = group_to_num(group)
                sub = test_pairs[test_pairs["BloodGroupNum"] == gnum]
                gdf = df[df["BloodGroup"] == group]
                if len(sub) >= 2:
                    g_mae = float(mean_absolute_error(sub["_y"], sub["_p"]))
                    g_r2 = float(r2_score(sub["_y"], sub["_p"]))
                else:
                    g_mae, g_r2 = None, None
                per_group[group] = {
                    "status": "trained",
                    "mae": None if g_mae is None else round(g_mae, 4),
                    "r2": None if g_r2 is None else round(g_r2, 4),
                    "months_with_real_records": len(months_with_records(gdf, target_col)),
                    "real_records": int(gdf[target_col].sum()),
                    "date_range": [
                        f"{gdf['Year'].min()}-{int(gdf['MonthNum'].min()):02d}",
                        f"{gdf['Year'].max()}-{int(gdf['MonthNum'].max()):02d}",
                    ],
                }
            entry["per_group"] = per_group

        entry["n_training_rows"] = int(len(train_df))
        entry["n_real_months"] = raw_months
        entry["trained_at"] = datetime.now(timezone.utc).isoformat()
        entry["date_range"] = [
            str(train_df["Year"].min()) + "-" + str(int(train_df["MonthNum"].min())).zfill(2),
            str(train_df["Year"].max()) + "-" + str(int(train_df["MonthNum"].max())).zfill(2),
        ]
        metrics[target] = entry
        print(f"[{target}] trained on {len(train_df)} real rows, MAE={mae:.1f} R^2={r2:.3f} -> {model_file}")

    with open(BASE_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print("\nSaved metrics.json (per-group entries for Group_* targets; insufficient_data where real history is too short)")


if __name__ == "__main__":
    main()