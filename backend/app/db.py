import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("QRPR_DB") or Path(__file__).resolve().parent.parent / "data" / "app.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS snapshots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kind          TEXT NOT NULL,          -- 'PR' or 'QR'
    snapshot_date TEXT NOT NULL,          -- YYYY-MM-DD
    filename      TEXT,
    uploaded_at   TEXT NOT NULL,
    UNIQUE (kind, snapshot_date)
);

-- One row per open item per snapshot. dataset: 'PR', 'BU' (QR Buyer Update), 'BV' (QR Buyer Verify)
CREATE TABLE IF NOT EXISTS items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id      INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    dataset          TEXT NOT NULL,
    doc_no           TEXT NOT NULL,       -- PR_No / QR No.
    doc_date         TEXT,                -- Created_Date / QR Date
    description      TEXT,                -- Remarks / Description
    category         TEXT,
    category_raw     TEXT,
    buyer            TEXT,
    buyer_raw        TEXT,
    requestor        TEXT,
    department       TEXT,                -- PR Department / QR Site
    approver         TEXT,                -- PR ApproveUser / QR Current Approver
    status           TEXT,
    aging_days       INTEGER,             -- DaysAging / Elapsed(Days)
    vendor           TEXT,                -- PR Vendor_Recommended / QR Pending (quoted vendors)
    total_price      REAL,
    currency         TEXT,
    cost_block       TEXT,
    cer_no           TEXT,
    mer_no           TEXT,
    expenditure_type TEXT,
    last_operate     TEXT,
    submission_date  TEXT
);

CREATE INDEX IF NOT EXISTS ix_items_snapshot ON items (snapshot_id, dataset);
CREATE INDEX IF NOT EXISTS ix_items_doc ON items (dataset, doc_no);
"""


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
