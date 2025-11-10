@echo off
echo ========================================
echo Stopping Server on Port 3000
echo ========================================
echo.

echo Finding process using port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    set PID=%%a
    echo Found process ID: %%a
    echo Stopping process...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo Could not stop process %%a. It may have already stopped or you may need administrator rights.
    ) else (
        echo Process %%a stopped successfully.
    )
)

echo.
echo Waiting 2 seconds for port to be released...
timeout /t 2 /nobreak >nul

echo.
echo Checking if port 3000 is now available...
netstat -ano | findstr :3000 >nul
if errorlevel 1 (
    echo ✅ Port 3000 is now available!
) else (
    echo ⚠️ Port 3000 is still in use. You may need to restart your computer or use a different port.
)

echo.
pause







