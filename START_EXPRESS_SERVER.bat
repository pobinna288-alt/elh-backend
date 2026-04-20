@echo off
echo ========================================
echo    EL HANNORA Backend Server Starter
echo ========================================
echo.

cd express-server

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Checking if dependencies are installed...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting backend server on port 3001...
echo.
echo ========================================
echo  Server will start at:
echo  http://localhost:3001
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
