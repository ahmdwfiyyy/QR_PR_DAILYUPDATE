"""Parse the daily ERP exports into normalized item rows.

PR file : one raw sheet (header contains PR_No) + a pivot sheet (ignored, recomputed by the app).
QR file : 'Buyer Update' and 'Buyer Verify' raw sheets (header contains 'QR No.') + pivot sheets (ignored).
"""
import io
import json
import re
from datetime import date, datetime
from pathlib import Path

import pandas as pd

# aliases.json holds the real names and is git-ignored; fall back to the committed example
_ALIASES_FILE = Path(__file__).parent / "aliases.json"
if not _ALIASES_FILE.exists():
    _ALIASES_FILE = Path(__file__).parent / "aliases.example.json"
_ALIASES = json.loads(_ALIASES_FILE.read_text(encoding="utf-8"))
BUYER_ALIASES = {k.strip().lower(): v for k, v in _ALIASES["buyers"].items()}
CATEGORY_ALIASES = {k.strip().lower(): v for k, v in _ALIASES["categories"].items()}


class ParseError(ValueError):
    pass


def normalize_buyer(name):
    if not name:
        return None
    return BUYER_ALIASES.get(name.lower(), name)


def normalize_category(name):
    if not name:
        return None
    return CATEGORY_ALIASES.get(name.lower(), name)


def _clean(value):
    """Cell value -> trimmed str / None."""
    if value is None or (isinstance(value, float) and pd.isna(value)) or value is pd.NaT:
        return None
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.strftime("%Y-%m-%d") if value.time() == datetime.min.time() else value.strftime("%Y-%m-%d %H:%M:%S")
    text = str(value).strip()
    return text or None


def _to_date(value):
    if value is None:
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.strftime("%Y-%m-%d")


def _to_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _ddmmyy(text):
    try:
        return datetime.strptime(text, "%d%m%y").date()
    except ValueError:
        return None


def detect_date(filename, sheet_names):
    """Snapshot date from '(261026)' in the filename, else from a DDMMYY sheet name."""
    match = re.search(r"\((\d{6})\)", filename or "")
    if match and (found := _ddmmyy(match.group(1))):
        return found
    for name in sheet_names:
        if re.fullmatch(r"\d{6}", name.strip()) and (found := _ddmmyy(name.strip())):
            return found
    return None


def _read_sheets(content):
    """All sheets as DataFrames with trimmed headers and str/None cells."""
    try:
        sheets = pd.read_excel(io.BytesIO(content), sheet_name=None, dtype=object)
    except Exception as exc:  # noqa: BLE001 - surface any reader error to the user
        raise ParseError(f"Could not read Excel file: {exc}") from exc
    result = {}
    for name, df in sheets.items():
        df.columns = [str(c).strip() for c in df.columns]
        df = df.dropna(how="all")
        result[name] = df.map(_clean) if hasattr(df, "map") else df.applymap(_clean)
    return result


def parse_pr(content, filename=""):
    sheets = _read_sheets(content)
    raw = [(n, df) for n, df in sheets.items() if "PR_No" in df.columns]
    if not raw:
        raise ParseError("No PR data sheet found (expected a sheet with a 'PR_No' column).")
    name, df = raw[0]
    items = []
    for row in df.to_dict("records"):
        if not row.get("PR_No"):
            continue
        items.append({
            "dataset": "PR",
            "doc_no": row["PR_No"],
            "doc_date": _to_date(row.get("Created_Date")),
            "description": row.get("Remarks"),
            "category": normalize_category(row.get("PRCategory")),
            "category_raw": row.get("PRCategory"),
            "buyer": normalize_buyer(row.get("Buyer")),
            "buyer_raw": row.get("Buyer"),
            "requestor": row.get("Requestor"),
            "department": row.get("Department"),
            "approver": (row.get("ApproveUser") or "").strip(",") or None,
            "status": row.get("ApproveStatus"),
            "aging_days": _to_int(row.get("DaysAging")),
            "vendor": (row.get("Vendor_Recommended") or "").lstrip("- ").strip() or None,
            "total_price": _to_float(row.get("TotalPrice")),
            "currency": row.get("Currency"),
            "cost_block": row.get("CostBlock"),
            "cer_no": row.get("CER_No"),
            "mer_no": row.get("MER_No"),
        })
    return {"date": detect_date(filename, list(sheets)), "items": items, "sheets": [name]}


def _qr_dataset(status, sheet_name):
    text = f"{status or ''} {sheet_name}".lower()
    if "update" in text:
        return "BU"
    if "verify" in text:
        return "BV"
    return None


def parse_qr(content, filename=""):
    sheets = _read_sheets(content)
    raw = [(n, df) for n, df in sheets.items() if "QR No." in df.columns]
    if not raw:
        raise ParseError("No QR data sheets found (expected sheets with a 'QR No.' column).")
    items = []
    for name, df in raw:
        for row in df.to_dict("records"):
            if not row.get("QR No."):
                continue
            dataset = _qr_dataset(row.get("Status"), name)
            if dataset is None:
                raise ParseError(f"Sheet '{name}': cannot tell if row {row['QR No.']} is Buyer Update or Buyer Verify.")
            items.append({
                "dataset": dataset,
                "doc_no": row["QR No."],
                "doc_date": _to_date(row.get("QR Date")),
                "description": row.get("Description"),
                "category": normalize_category(row.get("Category")),
                "category_raw": row.get("Category"),
                "buyer": normalize_buyer(row.get("Buyer")),
                "buyer_raw": row.get("Buyer"),
                "requestor": row.get("Requestor"),
                "department": row.get("Site"),
                "approver": row.get("Current Approver"),
                "status": row.get("Status"),
                "aging_days": _to_int(row.get("Elapsed(Days)")),
                "vendor": row.get("Pending"),
                "expenditure_type": row.get("Expenditure Type"),
                "last_operate": row.get("Last Operate Date"),
                "submission_date": _to_date(row.get("Submission Date")),
            })
    return {"date": detect_date(filename, list(sheets)), "items": items, "sheets": [n for n, _ in raw]}


def parse_date_param(text):
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise ParseError(f"Invalid date '{text}', expected YYYY-MM-DD.") from exc
