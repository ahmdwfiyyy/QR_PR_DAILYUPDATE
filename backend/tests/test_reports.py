from tests.conftest import upload
from tests.factories import DEFAULT_PRS, pr_workbook, qr_workbook


def test_overview_counts_and_aged(client, uploaded):
    data = client.get("/api/overview").json()
    assert data["date"] == "2026-10-26"
    assert data["aged_days"] == 3
    pr, bu, bv = (data["datasets"][k] for k in ("PR", "BU", "BV"))
    assert (pr["total"], pr["aged"], pr["oldest"]) == (5, 3, 12)  # aging 5, 12 and 4 are over 3 days
    assert (bu["total"], bu["aged"]) == (2, 1)
    assert (bv["total"], bv["aged"], bv["oldest"]) == (3, 2, 48)
    assert pr["prev_date"] is None and pr["new"] is None
    assert data["buyers"] == [
        {"buyer": "Alice", "PR": 2, "BU": 1, "BV": 1},
        {"buyer": "Bob", "PR": 2, "BU": 1, "BV": 0},
        {"buyer": "Carol", "PR": 1, "BU": 0, "BV": 2},
    ]


def test_overview_marks_missing_file_as_null(client):
    upload(client, pr_workbook())
    data = client.get("/api/overview").json()
    assert data["datasets"]["BU"] is None
    assert data["buyers"][0] == {"buyer": "Alice", "PR": 2, "BU": None, "BV": None}


def test_overview_empty(client):
    assert client.get("/api/overview").json() == {"date": None, "aged_days": 3, "datasets": {}, "buyers": []}


def test_summary_pivots(client, uploaded):
    data = client.get("/api/summary", params={"dataset": "PR"}).json()
    assert data["total"] == 5
    assert data["aging_columns"] == [1, 3, 4, 5, 12]
    assert data["buyers"][0] == {"buyer": "Alice", "counts": {"1": 1, "5": 1}, "total": 2}
    assert data["column_totals"] == {"1": 1, "5": 1, "3": 1, "12": 1, "4": 1}
    bob = next(b for b in data["categories"] if b["buyer"] == "Bob")
    assert bob["categories"] == [{"category": "Chem/Gas", "count": 1}, {"category": "Non-OEM", "count": 1}]


def test_new_and_cleared_since_previous_upload(client):
    upload(client, pr_workbook(DEFAULT_PRS[:3]), day="231026")
    upload(client, pr_workbook(DEFAULT_PRS[1:]), day="261026")

    headline = client.get("/api/overview").json()["datasets"]["PR"]
    assert (headline["prev_date"], headline["prev_total"], headline["new"], headline["cleared"]) == (
        "2026-10-23", 3, 2, 1
    )
    data = client.get("/api/items", params={"dataset": "PR"}).json()
    assert data["prev_date"] == "2026-10-23"
    assert {i["doc_no"] for i in data["items"] if i["is_new"]} == {"PR-004", "PR-005"}
    assert [i["doc_no"] for i in data["cleared"]] == ["PR-001"]
    # oldest first
    assert [i["aging_days"] for i in data["items"]] == [12, 5, 4, 3]


def test_items_for_a_given_day(client):
    upload(client, pr_workbook(DEFAULT_PRS[:1]), day="231026")
    upload(client, pr_workbook(), day="261026")
    data = client.get("/api/items", params={"dataset": "PR", "date": "2026-10-23"}).json()
    assert [i["doc_no"] for i in data["items"]] == ["PR-001"]
    assert data["items"][0]["total_price"] == 100.5
    assert client.get("/api/items", params={"dataset": "PR", "date": "2026-01-01"}).status_code == 404
    assert client.get("/api/items", params={"dataset": "ZZ"}).status_code == 422


def test_monthly_trend(client):
    upload(client, pr_workbook(DEFAULT_PRS[:2]), day="231026")
    upload(client, pr_workbook(), day="261026")
    upload(client, pr_workbook(), day="011126")  # another month

    data = client.get("/api/trend", params={"dataset": "PR", "month": "2026-10"}).json()
    assert len(data["days"]) == 31
    assert data["snapshot_days"] == ["2026-10-23", "2026-10-26"]
    alice = next(b for b in data["buyers"] if b["buyer"] == "Alice")
    assert alice["values"]["2026-10-23"] == 2 and alice["values"]["2026-10-24"] is None
    carol = next(b for b in data["buyers"] if b["buyer"] == "Carol")
    assert carol["values"]["2026-10-23"] == 0  # uploaded that day, but Carol had nothing
    assert carol["avg"] == 0.5
    assert data["total"]["avg"] == 3.5  # (2 + 5) / 2 upload days

    assert client.get("/api/months").json() == ["2026-11", "2026-10"]
    assert client.get("/api/trend", params={"dataset": "PR"}).json()["month"] == "2026-11"  # latest by default
    assert client.get("/api/trend", params={"dataset": "PR", "month": "Oct"}).status_code == 422


def test_trend_without_uploads(client):
    assert client.get("/api/trend", params={"dataset": "BV"}).status_code == 404


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
