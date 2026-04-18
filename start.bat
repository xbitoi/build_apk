@echo off
chcp 65001 >nul
title APK Builder Pro - Launcher

echo.
echo  ================================================
echo   APK Builder Pro - Windows 11 Launcher
echo  ================================================
echo.

:: ---- Check Node.js ----
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Please install it from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js: %NODE_VER%

:: ---- Check pnpm ----
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm not found. Installing...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do set PNPM_VER=%%v
echo [OK] pnpm: %PNPM_VER%

:: ---- Move to project root (same folder as this bat file) ----
cd /d "%~dp0"
echo [OK] Working directory: %CD%

:: ---- Install dependencies ----
echo.
echo [STEP 1/3] Installing dependencies (pnpm install)...
call pnpm install
if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

:: ---- Build API Server ----
echo.
echo [STEP 2/3] Building API Server...
cd /d "%~dp0artifacts\api-server"
call pnpm run build
if errorlevel 1 (
    echo [ERROR] API Server build failed.
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo [OK] API Server built.
cd /d "%~dp0"

:: ---- Create data directory if missing ----
if not exist "%~dp0artifacts\api-server\data" (
    mkdir "%~dp0artifacts\api-server\data"
    echo [OK] Created data directory.
)

:: ---- Launch API Server in a new window (port 8080) ----
echo.
echo [STEP 3/3] Launching servers...
echo.

start "APK Builder - API Server (port 8080)" cmd /k "cd /d "%~dp0artifacts\api-server" && set NODE_ENV=production && set PORT=8080 && node --enable-source-maps ./dist/index.mjs"

:: Wait for the API server to start
timeout /t 4 /nobreak >nul

:: ---- Launch Frontend dev server in a new window (port 5173) ----
start "APK Builder - Frontend (port 5173)" cmd /k "cd /d "%~dp0artifacts\apk-builder" && set NODE_ENV=development && set PORT=5173 && pnpm run dev"

echo  ================================================
echo   Application started successfully!
echo.
echo   API Server  :  http://localhost:8080
echo   Frontend    :  http://localhost:5173
echo.
echo   Open your browser at: http://localhost:5173
echo  ================================================
echo.

:: Open browser after frontend has a moment to start
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo  You can close this window. The two server windows must stay open.
echo.
pause
