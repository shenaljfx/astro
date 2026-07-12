@echo off
setlocal EnableExtensions
title Grahachara Launcher
chcp 65001 >nul

REM ============================================================
REM   Grahachara - one-click start
REM   Launches the API server + the Expo app, each in its own
REM   window. First run auto-installs dependencies.
REM   This file must stay in the project root (next to server\ and mobile\).
REM ============================================================

REM Work from the folder this .bat lives in (repo root).
cd /d "%~dp0"

echo ============================================
echo    Grahachara - starting up
echo ============================================
echo    Root: %cd%
echo.

REM --- Require Node.js on PATH -------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on your PATH.
  echo         Install the LTS build from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo    Node %%v detected.
echo.

REM --- First-run: install server dependencies ----------------
if not exist "server\node_modules" (
  echo [setup] Installing server dependencies ^(first run, this can take a few minutes^)...
  pushd server
  call npm install
  popd
  echo.
)

REM --- First-run: install mobile dependencies ----------------
if not exist "mobile\node_modules" (
  echo [setup] Installing mobile dependencies ^(first run, this can take a few minutes^)...
  pushd mobile
  call npm install
  popd
  echo.
)

REM --- Launch the API server (nodemon = auto-restart on edits)
echo [start] API server  -^> http://localhost:3000
start "Grahachara API (server)" /D "%~dp0server" cmd /k "npm run dev"

REM Give the server a moment to bind port 3000 before Expo starts.
timeout /t 3 /nobreak >nul

REM --- Launch the Expo dev server ----------------------------
echo [start] Expo app     -^> press a=Android  w=web  or scan the QR code
start "Grahachara App (Expo)" /D "%~dp0mobile" cmd /k "npm start"

echo.
echo ============================================
echo    Both are starting in separate windows.
echo    Close either window to stop that part.
echo ============================================
echo.
echo This launcher window will close in 8 seconds...
timeout /t 8 /nobreak >nul
exit /b 0
