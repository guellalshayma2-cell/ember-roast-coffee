"""Flask frontend over the SQLite database produced by clean_and_merge.py.

Routes:
  GET /        -> main page (merged orders table + per-region summary)
  GET /api/data -> JSON version of both tables (used for auto-refresh)
"""

import os
import sqlite3

from flask import Flask, jsonify, render_template

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(os.path.dirname(BASE), "orders.db")

app = Flask(__name__)


def query_all(sql: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(sql).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_orders() -> list[dict]:
    return query_all(
        """
        SELECT order_id, customer_id, customer_name, region,
               amount, currency, amount_cny
        FROM orders
        ORDER BY order_id
        """
    )


def get_summary() -> list[dict]:
    return query_all(
        """
        SELECT region, avg_amount_cny
        FROM region_summary
        ORDER BY region
        """
    )


@app.route("/")
def index():
    # Queried on every request, so the page always reflects the
    # current state of the database.
    return render_template(
        "index.html",
        orders=get_orders(),
        summary=get_summary(),
    )


@app.route("/api/data")
def data():
    return jsonify({"orders": get_orders(), "summary": get_summary()})


if __name__ == "__main__":
    # Run `python clean_and_merge.py` first so orders.db exists.
    app.run(host="0.0.0.0", port=5000, debug=True)
