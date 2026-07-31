@echo off
setlocal
cd /d "%~dp0"

set "SOURCE=backend\native\properties-helper.cpp"
set "OUTPUT=backend\native\properties-helper.exe"
set "VCVARS="

for %%V in (
  "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
  "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
  "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
  "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
) do if not defined VCVARS if exist %%V set "VCVARS=%%~V"

if not defined VCVARS (
  if exist "%OUTPUT%" (
    echo [native] Visual C++ Build Tools not found; using bundled helper.
    exit /b 0
  )
  echo [native] Visual C++ Build Tools are required to create %OUTPUT%.
  exit /b 1
)

call "%VCVARS%" >nul
cl /nologo /EHsc /O2 /DUNICODE /D_UNICODE "%SOURCE%" /Fo:"backend\native\properties-helper.obj" /Fe:"%OUTPUT%" /link /SUBSYSTEM:WINDOWS shell32.lib ole32.lib user32.lib
if errorlevel 1 exit /b 1

del /q backend\native\properties-helper.obj 2>nul
echo [native] Built %OUTPUT%.
endlocal
