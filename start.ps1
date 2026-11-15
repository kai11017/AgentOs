# ========================================================
# AgentOS / LocalFlow - One-Click Launcher (PowerShell)
# ========================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting AgentOS / LocalFlow Platform..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Check & Start PostgreSQL Docker Container if available
Write-Host "`n[1/3] Checking Database..." -ForegroundColor Yellow
$DockerRunning = (docker info 2>$null)
if ($DockerRunning) {
    $PgContainer = (docker ps -a --filter "name=agentos-postgres" --format "{{.Status}}" 2>$null)
    if ($PgContainer) {
        if (-not ($PgContainer -like "Up*")) {
            Write-Host "Starting agentos-postgres Docker container..." -ForegroundColor Green
            docker start agentos-postgres | Out-Null
        } else {
            Write-Host "agentos-postgres is already running." -ForegroundColor Green
        }
    } else {
        Write-Host "Creating agentos-postgres container on port 5433..." -ForegroundColor Green
        docker run -d --name agentos-postgres -p 5433:5432 -e POSTGRES_DB=agentos -e POSTGRES_USER=agentos -e POSTGRES_PASSWORD=agentos_secret postgres:16-alpine | Out-Null
    }
} else {
    Write-Host "Docker is not running. LocalFlow will use local async fallback." -ForegroundColor DarkGray
}

# 2. Start Backend API Server
Write-Host "`n[2/3] Starting Backend API Server (FastAPI on http://127.0.0.1:8000)..." -ForegroundColor Yellow
$BackendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; & '.\.venv\Scripts\Activate.ps1'; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -PassThru

# 3. Start Frontend Development Server
Write-Host "`n[3/3] Starting Frontend Dev Server (Vite on http://localhost:5173)..." -ForegroundColor Yellow
$FrontendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$RootPath\frontend'; npm run dev" -PassThru

Write-Host "`nWaiting for servers to initialize..." -ForegroundColor Green
Start-Sleep -Seconds 3

# 4. Open Browser
Write-Host "`nOpening LocalFlow Studio in your default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`nAgentOS / LocalFlow is up and running!" -ForegroundColor Green
Write-Host "  • Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  • Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  • API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nKeep the terminal windows open while working.`n" -ForegroundColor DarkGray
