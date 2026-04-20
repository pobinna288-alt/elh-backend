@echo off
set SERVER_PORT=%PORT%
if "%SERVER_PORT%"=="" set SERVER_PORT=4000
echo ========================================
echo EL HANNORA Backend Server Startup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    call npm install
    echo.
)

echo [2/3] Starting backend server...
echo.
echo ========================================
echo SERVER STARTING ON PORT %SERVER_PORT%
echo ========================================
echo.
echo Frontend should connect to:
echo http://localhost:%SERVER_PORT%
echo.
echo Demo Account:
echo Email: demo@gmail.com
echo Password: password123
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

node server.js

pause
