"""Read the daily ERP exports into item rows.

PR file: one raw sheet (header contains PR_No) plus a pivot sheet, which is ignored and recomputed by the app.
QR file: 'Buyer Update' and 'Buyer Verify' raw sheets (header contains 'QR No.') plus pivot sheets (ignored).
"""
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import pandas as pd

from app.models import Dataset, SnapshotKind
from app.services.aliases import normalize_buyer, normalize_category
from app.services.errors import ServiceError


@dataclass
class ParsedFile:
    kind: SnapshotKind
    date: date | None  # detected from the filename or a sheet name
    items: list[dict] = field(default_factory=list)  # keys are Item column names
    sheets: list[str] = field(default_factory=list)  # raw sheets that were read


# --------------------------------------------------------------------------- cell helpers
def _clean(value):
    """Cell value -> trimmed str / None."""
    if value is None or value is pd.NaT or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, (datetime, pd.Timestamp)):
        fmt = "%Y-%m-%d" if value.time() == datetime.min.time() else "%Y-%m-%d %H:%M:%S"
        return value.strftime(fmt)
    text = str(value).strip()
    return text or None


def _to_date(value) -> date | None:
    if value is None:
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.date()


def _to_int(value) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_decimal(value) -> Decimal | None:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (TypeError, ValueError, InvalidOperation):
        return None


def _ddmmyy(text: str) -> date | None:
    try:
        return datetime.strptime(text, "%d%m%y").date()
    except ValueError:
        return None


def detect_date(filename: str | None, sheet_names: list[str]) -> date | None:
    """Snapshot date from '(261026)' in the filename, else from a DDMMYY sheet name."""
    match = re.search(r"\((\d{6})\)", filename or "")
    if match and (found := _ddmmyy(match.group(1))):
        return found
    for name in sheet_names:
        if re.fullmatch(r"\d{6}", name.strip()) and (found := _ddmmyy(name.strip())):
            return found
    return None


def _read_sheets(content: bytes) -> dict[str, pd.DataFrame]:
    """All sheets as DataFrames with trimmed headers and str/None cells."""
    try:
        sheets = pd.read_excel(io.BytesIO(content), sheet_name=None, dtype=object)
    except Exception as exc:  # noqa: BLE001 - any reader error means the file is not a usable workbook
        raise ServiceError(f"Could not read the Excel file: {exc}") from exc
    result = {}
    for name, df in sheets.items():
        df.columns = [str(c).strip() for c in df.columns]
        result[name] = df.dropna(how="all").map(_clean)
    return result


# --------------------------------------------------------------------------- PR
def parse_pr(content: bytes, filename: str = "") -> ParsedFile:
    sheets = _read_sheets(content)
    raw = [(n, df) for n, df in sheets.items() if "PR_No" in df.columns]
    if not raw:
        raise ServiceError("No PR data sheet found (expected a sheet with a 'PR_No' column).")
    name, df = raw[0]
    items = []
    for row in df.to_dict("records"):
        if not row.get("PR_No"):
            continue
        items.append({
            "dataset": Dataset.PR,
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
            "total_price": _to_decimal(row.get("TotalPrice")),
            "currency": row.get("Currency"),
            "cost_block": row.get("CostBlock"),
            "cer_no": row.get("CER_No"),
            "mer_no": row.get("MER_No"),
        })
    return ParsedFile(SnapshotKind.PR, detect_date(filename, list(sheets)), items, [name])


# --------------------------------------------------------------------------- QR
def _qr_dataset(status: str | None, sheet_name: str) -> Dataset | None:
    text = f"{status or ''} {sheet_name}".lower()
    if "update" in text:
        return Dataset.BU
    if "verify" in text:
        return Dataset.BV
    return None


def parse_qr(content: bytes, filename: str = "") -> ParsedFile:
    sheets = _read_sheets(content)
    raw = [(n, df) for n, df in sheets.items() if "QR No." in df.columns]
    if not raw:
        raise ServiceError("No QR data sheets found (expected sheets with a 'QR No.' column).")
    items = []
    for name, df in raw:
        for row in df.to_dict("records"):
            if not row.get("QR No."):
                continue
            dataset = _qr_dataset(row.get("Status"), name)
            if dataset is None:
                raise ServiceError(
                    f"Sheet '{name}': cannot tell if {row['QR No.']} is Buyer Update or Buyer Verify."
                )
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
    return ParsedFile(SnapshotKind.QR, detect_date(filename, list(sheets)), items, [n for n, _ in raw])


PARSERS = {SnapshotKind.PR: parse_pr, SnapshotKind.QR: parse_qr}
