@echo off
rem One-time setup (re-run after pulling changes to the frontend)
cd /d "%~dp0backend"
if not exist .venv python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt || goto :error
if not exist app\aliases.json copy app\aliases.example.json app\aliases.json >nul

cd /d "%~dp0frontend"
call npm install || goto :error
call npm run build || goto :error

echo.
echo Setup complete. Run start.bat to launch the app.
pause
exit /b 0

:error
echo Setup failed.
pause
exit /b 1
