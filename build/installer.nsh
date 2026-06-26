!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\shell\MonkezFileManager" "" "Open with Monkez File Manager"
  WriteRegStr HKCU "Software\Classes\Directory\shell\MonkezFileManager" "Icon" "$INSTDIR\Monkez File Manager.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\MonkezFileManager\command" "" '"$INSTDIR\Monkez File Manager.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MonkezFileManager" "" "Open with Monkez File Manager"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MonkezFileManager" "Icon" "$INSTDIR\Monkez File Manager.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MonkezFileManager\command" "" '"$INSTDIR\Monkez File Manager.exe" "%V"'
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\Directory\shell\MonkezFileManager"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\MonkezFileManager"
!macroend
