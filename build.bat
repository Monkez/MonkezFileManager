@echo off
:: Di chuyển đến thư mục chứa script này để đảm bảo chạy đúng đường dẫn tương đối
cd /d "%~dp0"

echo ===================================================
echo [Monkez File Manager] Dang build va dong goi ung dung...
echo Qua trinh nay se build frontend truoc va dong goi bang electron-packager.
echo ===================================================

:: Thực thi lệnh build và đóng gói
call npm run package:electron

if %ERRORLEVEL% NEQ 0 (
    echo [Loi] Build that bai! Vui long kiem tra log loi phia tren.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo [Thanh cong] Da dong goi ung dung hoan tat!
echo San pham duoc xuat ra tai thu muc: dist-electron-release/
echo ===================================================
pause
