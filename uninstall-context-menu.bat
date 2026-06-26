@echo off
echo Removing "Open with Monkez File Manager" from context menu...
reg delete "HKCU\Software\Classes\Directory\shell\MonkezFileManager" /f
reg delete "HKCU\Software\Classes\Directory\Background\shell\MonkezFileManager" /f
echo Done!
pause
