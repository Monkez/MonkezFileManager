@echo off
cd /d "%~dp0"

echo ===================================================
echo [Monkez File Manager] Dang chay test...
echo ===================================================

call npm test

if %ERRORLEVEL% NEQ 0 (
    echo [Loi] Test that bai. Vui long xem log phia tren.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo [Thanh cong] Tat ca test da chay xong.
echo ===================================================
pause
