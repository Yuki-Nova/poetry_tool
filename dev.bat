@echo off
title Poetry Tool - Dev Mode

echo.
echo  ========================================
echo   Poetry Tool (poetry-tool)
echo   Server :3001  ^|  Frontend :5174
echo  ========================================
echo.

cd /d "%~dp0server"
echo [1/2] Starting Express server on :3001 ...
start "poetry-server" cmd /c "node app.js"

cd /d "%~dp0tool"
echo [2/2] Starting Vite dev server on :5174 ...
echo.
echo Open http://localhost:5174
echo Press Ctrl+C to stop
echo.

npm run dev

echo.
echo Stopping backend server...
taskkill /fi "WINDOWTITLE eq poetry-server" /f >nul 2>&1
