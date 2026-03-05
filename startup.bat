@echo off
setlocal

set STALKER_DIR=C:\Users\AvadaGroup\Desktop\stalker
set DATABASE_URL=postgresql://stalker:stalker_pass@localhost:5435/competitor_stalker
set PORT=4000
set API_URL=http://localhost:%PORT%

:: Check if already ran today
set TODAY_MARKER=%TEMP%\stalker_ran_%date:~-4,4%%date:~-7,2%%date:~-10,2%.tmp
if exist "%TODAY_MARKER%" (
    echo [stalker] Already ran today, skipping.
    exit /b 0
)

echo [stalker] Starting Competitor Stalker...

:: Start Docker Desktop if not running
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I "Docker Desktop.exe" >NUL
if errorlevel 1 (
    echo [stalker] Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 20 /nobreak >NUL
)

:: Start docker compose (PostgreSQL)
echo [stalker] Starting PostgreSQL...
cd /d "%STALKER_DIR%"
docker compose up -d
if errorlevel 1 (
    echo [stalker] ERROR: Failed to start Docker containers
    exit /b 1
)

:: Wait for PostgreSQL to be ready (max 30s)
echo [stalker] Waiting for PostgreSQL...
set /a attempts=0
:WAIT_PG
set /a attempts+=1
if %attempts% gtr 15 (
    echo [stalker] ERROR: PostgreSQL not ready after 30s
    exit /b 1
)
docker exec stalker-postgres-1 pg_isready -U stalker >NUL 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >NUL
    goto WAIT_PG
)
echo [stalker] PostgreSQL ready.

:: Start API in background (new window, minimized)
echo [stalker] Starting API server...
start "Stalker API" /MIN cmd /c "cd /d %STALKER_DIR% && set DATABASE_URL=%DATABASE_URL%&& set PORT=%PORT%&& bun apps/api/index.js >> %TEMP%\stalker-api.log 2>&1"

:: Wait for API to be ready (max 30s)
echo [stalker] Waiting for API...
set /a attempts=0
:WAIT_API
set /a attempts+=1
if %attempts% gtr 15 (
    echo [stalker] ERROR: API not ready after 30s
    exit /b 1
)
curl -s -o NUL -w "%%{http_code}" %API_URL%/api/health 2>NUL | find "200" >NUL
if errorlevel 1 (
    timeout /t 2 /nobreak >NUL
    goto WAIT_API
)
echo [stalker] API ready.

:: Trigger scrape-all
echo [stalker] Triggering scrape-all...
curl -s -X POST %API_URL%/api/scrape-all
echo.
echo [stalker] Scrape jobs queued successfully.

:: Mark as done for today
echo done > "%TODAY_MARKER%"

echo [stalker] Startup complete!
exit /b 0
