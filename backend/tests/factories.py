"""Fake ERP exports, built in memory with the same layout as the real files (no real data)."""
import io
from datetime import datetime

from openpyxl import Workbook

PR_HEADER = [
    "PR_No", "Created_Date", "Remarks", "CostBlock", "TotalPrice", "Currency", "Vendor_Recommended", "CER_No",
    "MER_No", "PRCategory", "Buyer", "Requestor", "Department", "ApproveUser", "ApproveStatus", "DaysAging",
]
# The real QR export has a trailing space after every header
QR_HEADER = [
    "QR No. ", "QR Date ", "Expenditure Type ", "Category ", "Description ", "Requestor ", "Buyer ", "Site ",
    "Status ", "Current Approver ", "Elapsed(Days) ", "Last Operate Date ", "Submission Date ", "Pending ",
]

# (PR_No, buyer as in the file, category, days aging, price, currency)
DEFAULT_PRS = [
    ("PR-001", "Alice Fullname", "OEM", 1, 100.5, "RM"),
    ("PR-002", "Alice", "OEM", 5, 2500, "USD"),
    ("PR-003", "Bob", "Non OEM", 3, 40, "RM"),
    ("PR-004", "Old Buyer", "Chem/Gas", 12, 999.99, "SGD"),
    ("PR-005", "Carol", "OEM", 4, 10, "RM"),
]
# (QR No., buyer, category, elapsed days, status)
DEFAULT_QRS = [
    ("QR-101", "Alice", "OEM", 2, "Pending Buyer Update"),
    ("QR-102", "Bob", "IT", 6, "Pending Buyer Update"),
    ("QR-201", "Alice Fullname", "Non OEM", 3, "Pending Buyer Verify"),
    ("QR-202", "Carol", "OEM", 10, "Pending Buyer Verify"),
    ("QR-203", "Carol", "OEM", 48, "Pending Buyer Verify"),
]


def _save(wb: Workbook) -> bytes:
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _pivot_sheet(wb: Workbook, title: str) -> None:
    """Stand-in for the *_SUMMARY pivot sheets, which the app must ignore."""
    ws = wb.create_sheet(title)
    ws.append([])
    ws.append([])
    ws.append(["Count of PR_No", "Column Labels"])
    ws.append(["Row Labels", 1, 2, "Grand Total"])


def pr_workbook(rows=DEFAULT_PRS, sheet_name: str = "261026") -> bytes:
    wb = Workbook()
    _pivot_sheet(wb, "PR_SUMMARY")
    ws = wb.active
    ws.title = sheet_name
    ws.append(PR_HEADER)
    for no, buyer, category, aging, price, currency in rows:
        ws.append([
            no, datetime(2026, 10, 20), f"Item for {no}", "CB01", price, currency, "- ACME SUPPLIES SDN BHD",
            None, None, category, buyer, "REQ1", "Dept A", "APPROVER1,APPROVER2,", "OPEN", aging,
        ])
    return _save(wb)


def qr_workbook(rows=DEFAULT_QRS) -> bytes:
    wb = Workbook()
    sheets = {"Pending Buyer Update": wb.active, "Pending Buyer Verify": wb.create_sheet("Buyer Verify")}
    sheets["Pending Buyer Update"].title = "Buyer Update"
    _pivot_sheet(wb, "BU_SUMMARY")
    _pivot_sheet(wb, "BV_SUMMARY")
    for ws in sheets.values():
        ws.append(QR_HEADER)
    for no, buyer, category, elapsed, status in rows:
        sheets[status].append([
            no, "2026-10-01", "Opex", category, f"Quote for {no}", "Requester", buyer, "S", status,
            "Approver A,Approver B", elapsed, "2026-10-20 10:00:00", "2026-10-01",
            "VENDOR ONE; VENDOR TWO" if "Verify" in status else None,
        ])
    return _save(wb)
