@echo off
echo ========================================
echo ChatGPT API Setup for Know Law
echo ========================================
echo.
echo This script will help you set up the ChatGPT API key.
echo.
echo Step 1: Get your API key from https://platform.openai.com/api-keys
echo Step 2: Enter your API key below
echo.
set /p API_KEY="Enter your OpenAI API key: "

if "%API_KEY%"=="" (
    echo.
    echo Error: API key cannot be empty!
    pause
    exit /b 1
)

set OPENAI_API_KEY=%API_KEY%
echo.
echo ✅ API key set for this session!
echo.
echo To make it permanent, add this to your system environment variables:
echo   OPENAI_API_KEY=%API_KEY%
echo.
echo Starting server with ChatGPT enabled...
echo.
npm start


