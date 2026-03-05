@echo off
:: Run this ONCE as Administrator to register the Task Scheduler job
:: Right-click -> "Run as administrator"

set STALKER_DIR=C:\Users\AvadaGroup\Desktop\stalker
set TASK_NAME=CompetitorStalkerStartup

echo [setup] Registering Task Scheduler job: %TASK_NAME%

:: Delete old task if exists
schtasks /delete /tn "%TASK_NAME%" /f >NUL 2>&1

:: Create task: runs startup.bat at logon, only once per day (today marker prevents re-run)
schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "cmd /c \"%STALKER_DIR%\startup.bat\" >> \"%TEMP%\stalker-startup.log\" 2>&1" ^
  /sc ONLOGON ^
  /rl HIGHEST ^
  /f

if errorlevel 1 (
    echo [setup] ERROR: Failed to create task. Make sure you run as Administrator.
    pause
    exit /b 1
)

echo.
echo [setup] Done! Task "%TASK_NAME%" registered.
echo [setup] startup.bat will run automatically on every login.
echo [setup] It uses a daily marker file so it only triggers scrape ONCE per day.
echo.
echo [setup] To test manually: double-click startup.bat
echo [setup] To view logs: %TEMP%\stalker-startup.log
echo [setup] To view API logs: %TEMP%\stalker-api.log
echo.
pause
