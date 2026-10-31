# Daily Update QR & PR

Web dashboard for the daily ERP exports:

- **ERP PR List by Buyer (DDMMYY).xlsx**: open PRs (raw sheet + `PR_SUMMARY` pivot)
- **ERP QR List by Buyer (DDMMYY).xlsx**: `Buyer Update` + `BU_SUMMARY`, `Buyer Verify` + `BV_SUMMARY`

Upload both files each day. Every upload is kept as a dated snapshot, so the app can show day-to-day changes and monthly trends.
The `*_SUMMARY` pivots are **recomputed from the raw sheets**, so they don't need to be refreshed in Excel before uploading.

## Run it

First time only (needs Python 3.11+ and Node 18+):

```
setup.bat
```

Then every day:

```
start.bat        -> opens http://localhost:8000
```

## Pages

| Page | What it shows |
|---|---|
| Dashboard | Totals for PR / Buyer Update / Buyer Verify, change vs previous upload (new / cleared), items older than 3 days (set by `AGED_DAYS` in `backend/app/main.py` and `frontend/src/api.js`), counts per buyer |
| PR, QR Buyer Update, QR Buyer Verify | The two pivots from the `*_SUMMARY` sheets (buyer × aging days, buyer → category), plus a searchable item list with NEW badges and a "cleared since last upload" list |
| Monthly Trend | Per-buyer count for every day of the month with Avg/day (like the old monthly Summary sheet) and a line chart |
| Upload | Upload the two files, set the date if needed, view and delete past uploads |

## How the upload works

- **Date**: taken from `(261026)` in the filename (DDMMYY). If it isn't there, the DDMMYY sheet name is used, or you can pick the date on the Upload page.
  Uploading again for the same date **replaces** that day's data.
- **PR**: the sheet with a `PR_No` column is used. The pivot sheet is ignored.
- **QR**: sheets with a `QR No.` column are used. Each row goes to Buyer Update or Buyer Verify based on its `Status`.
- **Name clean-up**: the ERP uses different spellings for the same buyer and category (e.g. a buyer's short name vs full name, `Non-OEM` / `Non OEM`).
  The mappings live in `backend/app/aliases.json`. Create it by copying [backend/app/aliases.example.json](backend/app/aliases.example.json) and filling in the real names.
  After editing it, restart the app and re-upload any older files you want the new names applied to.

Data is stored in `backend/data/app.db` (SQLite). Back up that file to keep your history.

## Confidential data

The ERP exports (`*.xlsx`), the database (`backend/data/`), `backend/app/aliases.json` (real staff names) and any `.env` files are git-ignored.
Never commit them. Check `git status` before each push.

## Development

```
# terminal 1: API with auto-reload on :8000
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload

# terminal 2: React dev server on :5173 (proxies /api to :8000)
cd frontend
npm run dev
```

- Backend: FastAPI + pandas/openpyxl + SQLite ([backend/app](backend/app))
- Frontend: React 18 + Vite + Recharts ([frontend/src](frontend/src))
- API docs: http://localhost:8000/docs

### Moving to the company intranet later

Run `start.bat` with `--host 0.0.0.0` (or behind IIS/nginx) so other PCs can reach it, and add a login first.
There is no authentication yet because this version is for single-user, local use.
