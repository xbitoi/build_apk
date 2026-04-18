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

:: ---- Move to project root ----
cd /d "%~dp0"
echo [OK] Working directory: %CD%

:: ---- Clean Linux lock file and node_modules to allow Windows-native rebuild ----
echo.
echo [STEP 1/3] Cleaning old dependencies for Windows compatibility...
if exist "pnpm-lock.yaml" (
    del /f /q "pnpm-lock.yaml"
    echo [OK] Removed Linux lock file.
)
if exist "node_modules" (
    echo [INFO] Removing node_modules (this may take a moment)...
    rmdir /s /q "node_modules"
    echo [OK] Removed node_modules.
)

:: ---- Install dependencies fresh for Windows ----
echo.
echo [STEP 2/4] Installing dependencies for Windows...
call pnpm install --no-frozen-lockfile
if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

:: ---- Build API Server ----
echo.
echo [STEP 3/4] Building API Server...
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

:: ---- Launch API Server ----
echo.
echo [STEP 4/4] Launching servers...
echo.

start "APK Builder - API Server (port 8080)" cmd /k "cd /d "%~dp0artifacts\api-server" && set NODE_ENV=production && set PORT=8080 && node --enable-source-maps ./dist/index.mjs"

timeout /t 4 /nobreak >nul

:: ---- Launch Frontend ----
start "APK Builder - Frontend (port 5173)" cmd /k "cd /d "%~dp0artifacts\apk-builder" && set NODE_ENV=development && set PORT=5173 && set BASE_PATH=/ && pnpm run dev"

echo  ================================================
echo   Application started successfully!
echo.
echo   API Server  :  http://localhost:8080
echo   Frontend    :  http://localhost:5173
echo.
echo   Open your browser at: http://localhost:5173
echo  ================================================
echo.

timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo  You can close this window. The two server windows must stay open.
echo.
pause
