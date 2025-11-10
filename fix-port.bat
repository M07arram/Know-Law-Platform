@echo off
echo ========================================
echo Know Law Server - Port Fixer
echo ========================================
echo.

echo Step 1: Stopping any existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo Found process ID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo Warning: Could not stop process %%a
    ) else (
        echo Process %%a stopped successfully
    )
)

echo.
echo Step 2: Waiting for port to be released...
timeout /t 3 /nobreak >nul

echo.
echo Step 3: Starting server...
echo.
node server.js







