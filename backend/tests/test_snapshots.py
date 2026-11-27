from tests.conftest import upload
from tests.factories import pr_workbook, qr_workbook


def test_history_lists_days_newest_first(client):
    upload(client, pr_workbook(), qr_workbook(), day="231026")
    upload(client, pr_workbook(), day="261026")
    days = client.get("/api/snapshots").json()
    assert [d["date"] for d in days] == ["2026-10-26", "2026-10-23"]
    assert days[0]["QR"] is None  # QR not uploaded on the 26th
    assert days[1]["QR"]["filename"] == "ERP QR List by Buyer (231026).xlsx"


def test_delete_one_kind(client, uploaded):
    assert client.delete("/api/snapshots/PR/2026-10-26").status_code == 204
    days = client.get("/api/snapshots").json()
    assert days[0]["PR"] is None and days[0]["QR"] is not None
    assert client.get("/api/items", params={"dataset": "PR"}).status_code == 404


def test_delete_missing(client):
    assert client.delete("/api/snapshots/QR/2026-10-26").status_code == 404
    assert client.delete("/api/snapshots/XX/2026-10-26").status_code == 422
