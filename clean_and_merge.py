"""Clean the raw order/customer data, convert amounts to CNY, merge the
two sources, and write the results to a SQLite database.

Tables created in orders.db:
  - orders         : merged orders + customer info, amounts converted to CNY
  - region_summary : average amount_cny per customer region
"""

import os
import sqlite3

import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")
DB_PATH = os.path.join(BASE, "orders.db")

# Conversion rates to CNY
RATES = {"USD": 6.9, "EUR": 7.5, "CNY": 1.0, "JPY": 0.05}


def load_data():
    orders = pd.read_csv(os.path.join(DATA_DIR, "order.txt"))
    customers = pd.read_csv(os.path.join(DATA_DIR, "customer.txt"))
    return orders, customers


def clean(orders: pd.DataFrame, customers: pd.DataFrame):
    """Remove duplicate rows (based on the natural key of each table)."""
    orders = orders.drop_duplicates(subset="order_id").copy()
    customers = customers.drop_duplicates(subset="customer_id").copy()
    return orders, customers


def convert_to_cny(orders: pd.DataFrame) -> pd.DataFrame:
    """Convert every amount to CNY using the fixed rate table."""
    orders["amount_cny"] = orders.apply(
        lambda row: round(float(row["amount"]) * RATES[row["currency"]], 2),
        axis=1,
    )
    return orders


def merge(orders: pd.DataFrame, customers: pd.DataFrame) -> pd.DataFrame:
    return orders.merge(customers, on="customer_id", how="left")


def build_summary(merged: pd.DataFrame) -> pd.DataFrame:
    summary = (
        merged.groupby("region", as_index=False)["amount_cny"]
        .mean()
        .rename(columns={"amount_cny": "avg_amount_cny"})
        .round(2)
    )
    return summary


def write_to_db(merged: pd.DataFrame, summary: pd.DataFrame):
    conn = sqlite3.connect(DB_PATH)
    try:
        merged.to_sql("orders", conn, if_exists="replace", index=False)
        summary.to_sql("region_summary", conn, if_exists="replace", index=False)
        conn.commit()
    finally:
        conn.close()


def main():
    orders, customers = load_data()
    orders, customers = clean(orders, customers)
    orders = convert_to_cny(orders)
    merged = merge(orders, customers)
    summary = build_summary(merged)
    write_to_db(merged, summary)

    print(f"Merged orders written to {DB_PATH} ({len(merged)} rows)")
    print(f"Region summary ({len(summary)} rows):")
    print(summary.to_string(index=False))


if __name__ == "__main__":
    main()
