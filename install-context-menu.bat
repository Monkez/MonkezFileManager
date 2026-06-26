@echo off
setlocal
set "EXE_PATH=%~dp0dist-electron-release\Monkez File Manager-win32-x64\Monkez File Manager.exe"

if not exist "%EXE_PATH%" (
    echo Error: Monkez File Manager.exe not found!
    echo Please run "npm run package:electron" first to build the app.
    pause
    exit /b 1
)

echo Registering context menu for: %EXE_PATH%
reg add "HKCU\Software\Classes\Directory\shell\MonkezFileManager" /ve /d "Open with Monkez File Manager" /f
reg add "HKCU\Software\Classes\Directory\shell\MonkezFileManager" /v "Icon" /d "\"%EXE_PATH%\"" /f
reg add "HKCU\Software\Classes\Directory\shell\MonkezFileManager\command" /ve /d "\"%EXE_PATH%\" \"%%1\"" /f

reg add "HKCU\Software\Classes\Directory\Background\shell\MonkezFileManager" /ve /d "Open with Monkez File Manager" /f
reg add "HKCU\Software\Classes\Directory\Background\shell\MonkezFileManager" /v "Icon" /d "\"%EXE_PATH%\"" /f
reg add "HKCU\Software\Classes\Directory\Background\shell\MonkezFileManager\command" /ve /d "\"%EXE_PATH%\" \"%%V\"" /f

echo.
echo Successfully added "Open with Monkez File Manager" to the context menu!
pause
