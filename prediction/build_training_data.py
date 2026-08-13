"""
build_training_data.py (real-data feature engineering)
--------------------------------------------------------
Reads raw_monthly_demand.csv (real month x blood_group aggregates produced
by generate_raw_dataset.py) and builds the model-ready training dataset
training_data.csv.

Per row (a blood group for a calendar month):
  - calendar features:  MonthNum, Quarter, HolidayMonth, FestivalMonth,
                        MonthSin, MonthCos   (same scheme as the previous
                        pipeline)
  - lag features per target, computed ONLY from real historical values:
                        PrevMonth<X>, PrevYearMonth<X>, Rolling3<X>, Rolling6<X>
                        where <X> is Supply / Demand / Wastage
  - BloodGroup as the categorical feature (single-model approach)
  - CampaignCounts (real campaign records per month; 0 where none exist)
  - IsEstimated = 0 on every row - all values trace back to real records.

An aggregate block (BloodGroup = "ALL") is appended for the legacy aggregate
targets (/predict, /forecast) - sums of real per-group values per month.

Usage:
    python3 build_training_data.py
"""

import math
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
RAW_PATH = BASE_DIR / "raw_monthly_demand.csv"
OUT_PATH = BASE_DIR / "training_data.csv"

HOLIDAY_MONTHS = set(range(1, 13))   # matches the previous pipeline definition
FESTIVAL_MONTHS = {4, 5, 10, 12}

TARGETS = {
    "Supply": "DonatedUnits",
    "Demand": "RequestedUnits",
    "Wastage": "WastedUnits",
}

OUT_COLUMNS = [
    "Year", "Month", "MonthNum", "Quarter", "HolidayMonth", "FestivalMonth",
    "MonthSin", "MonthCos", "BloodGroup", "CampaignCounts",
    "DonatedUnits", "RequestedUnits", "WastedUnits",
    "PrevMonthSupply", "PrevYearSupply", "Rolling3SupplyAvg", "Rolling6SupplyAvg",
    "PrevMonthDemand", "PrevYearDemand", "Rolling3DemandAvg", "Rolling6DemandAvg",
    "PrevMonthWastage", "PrevYearWastage", "Rolling3WastageAvg", "Rolling6WastageAvg",
    "IsEstimated", "SourceRecords",
]


def prev_month(year, month_num):
    return (year - 1, 12) if month_num == 1 else (year, month_num - 1)


def add_lag_features(rows):
    """Annotate each row with lag/rolling features built solely from the real
    values already present in the series (gap-safe: a missing prior value
    stays NaN rather than being interpolated)."""
    series = {}
    for r in rows:
        series.setdefault(r["BloodGroup"], {}).setdefault((r["Year"], r["MonthNum"]), r)
    agg = {}
    for r in rows:
        agg.setdefault((r["Year"], r["MonthNum"]), {"DonatedUnits": 0.0, "RequestedUnits": 0.0, "WastedUnits": 0.0})
        agg[(r["Year"], r["MonthNum"])]["DonatedUnits"] += r["DonatedUnits"]
        agg[(r["Year"], r["MonthNum"])]["RequestedUnits"] += r["RequestedUnits"]
        agg[(r["Year"], r["MonthNum"])]["WastedUnits"] += r["WastedUnits"]
    series["ALL"] = agg

    for r in rows:
        key = (r["Year"], r["MonthNum"])
        group_map = series[r["BloodGroup"]]

        for target_name, col in [("Supply", "DonatedUnits"), ("Demand", "RequestedUnits"), ("Wastage", "WastedUnits")]:
            py, pm = prev_month(r["Year"], r["MonthNum"])
            prev = group_map.get((py, pm))
            prev_year = group_map.get((r["Year"] - 1, r["MonthNum"]))

            seq = []
            cur = (r["Year"], r["MonthNum"])
            for _ in range(6):
                cur = prev_month(*cur)
                prior = group_map.get(cur)
                if prior is None:
                    seq = None
                    break
                seq = (seq or []) + [prior[col]]
            if seq is not None:
                seq.reverse()

            r[f"PrevMonth{target_name}"] = prev[col] if prev is not None else None
            r[f"PrevYear{target_name}"] = prev_year[col] if prev_year is not None else None
            r[f"Rolling3{target_name}Avg"] = (sum(seq[-3:]) / 3) if seq and len(seq) >= 3 else None
            r[f"Rolling6{target_name}Avg"] = (sum(seq[-6:]) / 6) if seq and len(seq) >= 6 else None

    return rows


def main():
    raw = pd.read_csv(RAW_PATH)
    print(f"Raw real rows: {len(raw)} (months: {sorted(raw['year'].unique())})")

    all_rows = []
    for group in sorted(raw["BloodGroup"].unique()):
        gdf = raw[raw["BloodGroup"] == group]
        for _, r in gdf.iterrows():
            month_num = int(r["MonthNum"])
            angle = 2 * math.pi * (month_num - 1) / 12
            source_records = int(r["DonatedUnits"]) + int(r["RequestedUnits"]) + int(r["WastedUnits"])
            all_rows.append({
                "Year": int(r["year"]),
                "Month": r["month"],
                "MonthNum": month_num,
                "Quarter": (month_num - 1) // 3 + 1,
                "HolidayMonth": 1 if month_num in HOLIDAY_MONTHS else 0,
                "FestivalMonth": 1 if month_num in FESTIVAL_MONTHS else 0,
                "MonthSin": round(math.sin(angle), 6),
                "MonthCos": round(math.cos(angle), 6),
                "BloodGroup": group,
                "CampaignCounts": int(r["CampaignCounts"]),
                "DonatedUnits": int(r["DonatedUnits"]),
                "RequestedUnits": int(r["RequestedUnits"]),
                "WastedUnits": int(r["WastedUnits"]),
                "IsEstimated": 0,
                "SourceRecords": source_records,
            })

    # Aggregate block for the legacy aggregate targets (/predict, /forecast).
    agg = {}
    for r in all_rows:
        key = (r["Year"], r["Month"])
        base = agg.setdefault(key, {
            "Year": r["Year"], "Month": r["Month"], "MonthNum": r["MonthNum"],
            "Quarter": r["Quarter"], "HolidayMonth": r["HolidayMonth"],
            "FestivalMonth": r["FestivalMonth"], "MonthSin": r["MonthSin"],
            "MonthCos": r["MonthCos"], "CampaignCounts": r["CampaignCounts"],
            "DonatedUnits": 0, "RequestedUnits": 0, "WastedUnits": 0,
            "IsEstimated": 0, "SourceRecords": 0, "BloodGroup": "ALL",
        })
        base["DonatedUnits"] += r["DonatedUnits"]
        base["RequestedUnits"] += r["RequestedUnits"]
        base["WastedUnits"] += r["WastedUnits"]
        base["SourceRecords"] += r["SourceRecords"]
    for key in sorted(agg):
        all_rows.append(agg[key])

    add_lag_features(all_rows)

    df = pd.DataFrame(all_rows)
    df["CampaignCounts"] = df["CampaignCounts"].fillna(0)
    df = df[OUT_COLUMNS]
    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(df)} rows -> training_data.csv (all IsEstimated=0)")
    print("Aggregate block (BloodGroup=ALL) included for legacy /predict,/forecast targets.")


if __name__ == "__main__":
    main()