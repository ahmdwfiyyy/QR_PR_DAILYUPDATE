@echo off
rem Starts the app at http://localhost:8000 (backend + built frontend)
cd /d "%~dp0backend"
start "" http://localhost:8000
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
