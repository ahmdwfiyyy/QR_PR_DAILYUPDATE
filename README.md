# Carsem Daily QR & PR

Daily dashboard for the ERP exports that Purchasing pulls every morning:

- **ERP PR List by Buyer (DDMMYY).xlsx**: open PRs (raw sheet + `PR_SUMMARY` pivot)
- **ERP QR List by Buyer (DDMMYY).xlsx**: `Buyer Update` + `BU_SUMMARY`, `Buyer Verify` + `BV_SUMMARY`

Upload both files each day. Every upload is kept as a dated snapshot, so the app shows what is new or cleared since the last upload, which items are older than 3 days, and a monthly trend per buyer.
The `*_SUMMARY` pivots are **recomputed from the raw sheets**, so they don't need refreshing in Excel before upload.

## Stack

FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 16 · pandas/openpyxl · React 18 + TypeScript + Vite + Tailwind v4 + Recharts · Docker Compose

Same layout and UI kit as [PO Tracker](https://github.com/ahmdwfiyyy/PO_TRACKER).

## Run it

```bash
cp .env.example .env                                         # optional: change ports or AGED_DAYS
cp backend/config/aliases.example.json backend/config/aliases.json   # then fill in the real names
docker compose up --build -d                                 # db, backend (runs migrations on start), frontend
```

- App: http://localhost:8080
- API docs: http://localhost:8001/docs

Ports default to 8080 / 8001 / 5433 so the app can run next to PO Tracker (80 / 8000 / 5432). Change them in `.env`.

To try the app without real data: `docker compose exec backend python seed.py` (fake buyers, last 10 working days).
`seed.py --reset` deletes **all** uploads first.

## Pages

| Page | What it shows |
|---|---|
| Dashboard | Totals for PR / Buyer Update / Buyer Verify, change vs previous upload (new / cleared), items older than 3 days, counts per buyer |
| PR, QR Buyer Update, QR Buyer Verify | The two `*_SUMMARY` pivots (buyer × aging days, buyer → category), a searchable item list with NEW badges, and what was cleared since the last upload |
| Monthly trend | Per-buyer count for every day of the month with Avg/day, and a line chart |
| Upload | Upload the two files (date from the filename, or pick one), view and delete past uploads |

The selected day and filters are kept in the URL, so a filtered view can be bookmarked.

## How the upload works

- **Date**: taken from `(261026)` in the filename (DDMMYY), else from a DDMMYY sheet name, else picked on the Upload page.
  Uploading again for the same date **replaces** that day's PR or QR data.
- **PR**: the sheet with a `PR_No` column is read. **QR**: sheets with a `QR No.` column are read, and each row goes to Buyer Update or Buyer Verify by its `Status`.
- If either file is wrong, nothing from that upload is saved.
- **Name mapping**: the ERP spells some buyers and categories differently between exports (a short name vs a full name, `Non OEM` vs `Non-OEM`).
  `backend/config/aliases.json` maps each spelling to one name. After editing it, run `docker compose restart backend` and re-upload any older files you want re-mapped.
- Items older than `AGED_DAYS` (default 3) are flagged.

## Development

```bash
# Backend tests (separate qr_pr_test database, created automatically on first DB start)
docker compose exec backend pytest

# Quick backend tests without Docker (SQLite stand-in)
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt
TEST_DATABASE_URL=sqlite:///test.db .venv/Scripts/python -m pytest

# New migration after changing app/models
docker compose exec backend alembic revision --autogenerate -m "describe the change"
docker compose cp backend:/app/alembic/versions ./backend/alembic

# Frontend with hot reload (proxies /api to the backend on localhost:8001)
cd frontend && npm install && npm run dev     # http://localhost:5173
```

### Copying data from the old SQLite version

Before the move to Docker, uploads were stored in `backend/data/app.db`. To copy them into PostgreSQL (days that already exist are skipped):

```bash
docker compose up -d db
cd backend && .venv/Scripts/python migrate_sqlite.py data/app.db
```

After checking the data in the app, `backend/data/` can be deleted.

## Project layout

```
backend/
  app/
    core/       config (settings from .env, "today" in Malaysia time), deps (DB session; auth goes here later)
    models/     SQLAlchemy tables (snapshots, items) and enums (PR / QR, PR / BU / BV)
    schemas/    Pydantic response models
    routers/    uploads, snapshots, reports  (all under /api)
    services/   excel (read the ERP exports), aliases (name mapping), snapshots (store / replace / delete),
                reports (dashboard, pivots, item lists, monthly trend)
  alembic/      migrations
  config/       aliases.example.json (aliases.json beside it is git-ignored)
  tests/        fake workbooks built in memory, no real data
  seed.py  migrate_sqlite.py
frontend/src/
  api/          fetch client, types, formatting
  components/   UI kit (Carsem style, from PO Tracker), layout, pivots, item table
  context/      SnapshotContext (uploaded days, selected day)
  pages/        dashboard, PR / QR lists, monthly trend, upload
```

## Confidential data

The ERP exports (`*.xlsx`), databases (`*.db`, `backend/data/`), `backend/config/aliases.json` (real staff names) and `.env` are git-ignored, and `aliases.json` is kept out of the Docker image (it is mounted at runtime).
Never commit them. Check `git status` before each push.

There is no login yet, because the app is for local use. Add login (as in PO Tracker) before putting it on the intranet.
