@echo off
set SERVER_PORT=%PORT%
if "%SERVER_PORT%"=="" set SERVER_PORT=4000
echo ============================================
echo    EL HANNORA Backend Server Startup
echo ============================================
echo.
echo Starting server on port %SERVER_PORT%...
echo.
node server.js
pause
