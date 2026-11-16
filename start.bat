@echo off
title LocalFlow / AgentOS Platform Launcher
color 0B
echo ========================================================
echo   Starting LocalFlow / AgentOS Platform...
echo ========================================================

set ROOT_DIR=%~dp0

:: 1. Database Check
echo.
echo [1/3] Checking Database Container...
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker ps --filter "name=agentos-postgres" --format "{{.Names}}" | findstr /I "agentos-postgres" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo PostgreSQL container is active.
    ) else (
        echo Starting PostgreSQL container...
        docker start agentos-postgres >nul 2>&1 || docker run -d --name agentos-postgres -p 5433:5432 -e POSTGRES_DB=agentos -e POSTGRES_USER=agentos -e POSTGRES_PASSWORD=agentos_secret postgres:16-alpine >nul 2>&1
    )
) else (
    echo Docker not detected. LocalFlow will use local storage fallback.
)

:: 2. Launch Backend Server in new window
echo.
echo [2/3] Launching FastAPI Backend (http://127.0.0.1:8005)...
start "LocalFlow Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8005 --reload"

:: 3. Launch Frontend Server in new window
echo.
echo [3/3] Launching Vite Frontend (http://localhost:3000)...
start "LocalFlow Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

ping 127.0.0.1 -n 4 >nul

echo.
echo Opening LocalFlow Studio in browser...
start http://localhost:3000

echo.
echo ========================================================
echo   LocalFlow / AgentOS is running!
echo   Frontend:  http://localhost:3000
echo   Backend:   http://127.0.0.1:8005
echo   API Docs:  http://127.0.0.1:8005/docs
=======================================================
echo.
pause
