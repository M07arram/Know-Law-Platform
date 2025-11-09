@echo off
echo ========================================
echo Know Law Server - Restart Script
echo ========================================
echo.

echo Checking for running Node.js processes...
for /f "tokens=2" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Found process using port 3000: PID %%a
    echo Stopping process...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo Could not stop process. You may need to stop it manually.
    ) else (
        echo Process stopped successfully.
    )
)

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting server...
echo.
node server.js

pause





