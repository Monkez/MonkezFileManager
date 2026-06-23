@echo off
:: Di chuyển đến thư mục chứa script này để đảm bảo chạy đúng đường dẫn tương đối
cd /d "%~dp0"

echo ===================================================
echo [Monkez File Manager] Bat dau cai dat dependencies...
echo ===================================================

:: Chạy cài đặt tất cả các package
call npm run install:all

if %ERRORLEVEL% NEQ 0 (
    echo [Loi] Cai dat that bai! Vui long kiem tra Node.js/npm da duoc cai dat va nam trong PATH.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo [Thanh cong] Da cai dat xong tat ca dependencies!
echo Gio ban co the chay ung dung bang cach nhap dup run.bat
echo ===================================================
pause
