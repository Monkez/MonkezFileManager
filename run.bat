@echo off
:: Di chuyển đến thư mục chứa script này để đảm bảo chạy đúng đường dẫn tương đối
cd /d "%~dp0"

echo ===================================================
echo [Monkez File Manager] Dang khoi chay ung dung...
echo Backend port: 3001
echo Frontend dev server & Electron shell dang duoc tai.
echo ===================================================

:: Khởi chạy ứng dụng Electron trong chế độ phát triển
call npm run dev:electron

if %ERRORLEVEL% NEQ 0 (
    echo [Loi] Khong the khoi chay ung dung! Vui long kiem tra xem da chay setup.bat de cai dat dependencies chua.
    pause
    exit /b %ERRORLEVEL%
)
