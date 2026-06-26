const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const contextMenuCache = {};

function getContextMenu(targetPath, callback) {
  const isDir = fs.statSync(targetPath).isDirectory();
  const ext = isDir ? 'DIRECTORY' : path.extname(targetPath).toLowerCase() || 'FILE';

  if (contextMenuCache[ext]) {
    return callback(null, contextMenuCache[ext]);
  }

  let keysToQuery = [
    'Registry::HKEY_CLASSES_ROOT\\*\\shell',
    'Registry::HKEY_CURRENT_USER\\Software\\Classes\\*\\shell'
  ];
  
  if (isDir) {
    keysToQuery.push('Registry::HKEY_CLASSES_ROOT\\Directory\\shell');
    keysToQuery.push('Registry::HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell');
    keysToQuery.push('Registry::HKEY_CLASSES_ROOT\\Directory\\Background\\shell');
    keysToQuery.push('Registry::HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell');
  } else if (ext && ext !== 'FILE') {
    keysToQuery.push(`Registry::HKEY_CLASSES_ROOT\\${ext}\\shell`);
    keysToQuery.push(`Registry::HKEY_CURRENT_USER\\Software\\Classes\\${ext}\\shell`);
    // Ideally we should look up the ProgID, but let's query the extension directly for now.
    // Also query SystemFileAssociations
    keysToQuery.push(`Registry::HKEY_CLASSES_ROOT\\SystemFileAssociations\\${ext}\\shell`);
    keysToQuery.push(`Registry::HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell`);
  }

  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    $items = @()
    $keys = @(${keysToQuery.map(k => `'${k}'`).join(',')})

    foreach ($baseKey in $keys) {
        if (Test-Path -LiteralPath $baseKey) {
            $subKeys = Get-ChildItem -LiteralPath $baseKey
            foreach ($key in $subKeys) {
                $path = $key.PSPath
                
                # 1. Try to get MUIVerb for a better localized string
                $name = (Get-ItemProperty -LiteralPath $path -Name "MUIVerb" -ErrorAction SilentlyContinue).MUIVerb

                # 2. Try the default value if MUIVerb doesn't exist
                if (-not $name) {
                    $name = (Get-ItemProperty -LiteralPath $path -Name "(Default)" -ErrorAction SilentlyContinue)."(Default)"
                }

                # 3. Fallback to the key name
                if (-not $name) {
                    $name = $key.PSChildName
                }

                # Skip raw DLL resource strings that weren't resolved
                if ($name -match '^@') {
                    continue
                }

                $icon = (Get-ItemProperty -LiteralPath $path -Name 'Icon' -ErrorAction SilentlyContinue).Icon
                $command = (Get-ItemProperty -LiteralPath "$($path)\\command" -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
                
                $iconPath = ""
                if ($icon) {
                    $iconPath = $icon
                } elseif ($command) {
                    if ($command -match '\"([^\"]+\.exe)\"') {
                        $iconPath = $matches[1]
                    } elseif ($command -match '([^\s]+\.exe)') {
                        $iconPath = $matches[1]
                    }
                }

                if ($iconPath) {
                    # Expand environment variables like %ProgramFiles%
                    $iconPath = [System.Environment]::ExpandEnvironmentVariables($iconPath)
                    # Strip any comma suffix for icons (e.g. icon.exe,0)
                    if ($iconPath -match '^(.*),\d+$') {
                        $iconPath = $matches[1]
                    }
                }
                
                if ($command) {
                    $items += @{
                        id = $key.PSChildName
                        name = $name
                        icon = $iconPath
                        command = $command
                    }
                }
            }
        }
    }
    
    # Try to resolve ProgID for file extensions
    if ("${ext}" -ne "DIRECTORY" -and "${ext}" -ne "FILE") {
        $progId = (Get-ItemProperty -LiteralPath "Registry::HKEY_CLASSES_ROOT\\${ext}" -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
        if (-not $progId) {
            $progId = (Get-ItemProperty -LiteralPath "Registry::HKEY_CURRENT_USER\\Software\\Classes\\${ext}" -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
        }
        if ($progId) {
            $progIdKeys = @(
                "Registry::HKEY_CLASSES_ROOT\\$progId\\shell",
                "Registry::HKEY_CURRENT_USER\\Software\\Classes\\$progId\\shell"
            )
            foreach ($progIdKey in $progIdKeys) {
                if (Test-Path -LiteralPath $progIdKey) {
                    $subKeys = Get-ChildItem -LiteralPath $progIdKey
                    foreach ($key in $subKeys) {
                        $name = $key.PSChildName
                        $defaultVal = (Get-ItemProperty -LiteralPath $key.PSPath -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
                        $icon = (Get-ItemProperty -LiteralPath $key.PSPath -Name 'Icon' -ErrorAction SilentlyContinue).Icon
                        $command = (Get-ItemProperty -LiteralPath "$($key.PSPath)\\command" -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
                        
                        if ($command) {
                            $items += @{
                                id = $name
                                name = if ($defaultVal) { $defaultVal } else { $name }
                                icon = $icon
                                command = $command
                            }
                        }
                    }
                }
            }
        }
    }

    # Check for WinRAR
    $winRarPath = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WinRAR.exe' -ErrorAction SilentlyContinue).'(default)'
    if ($winRarPath -and (Test-Path -LiteralPath $winRarPath)) {
        if ("${ext}" -eq "DIRECTORY") {
            $items += @{
                id = "WinRAR_Add"
                name = "WinRAR: Add to archive..."
                icon = $winRarPath
                command = '"{0}" a -ep1 "%1.rar" "%1"' -f $winRarPath
            }
        } elseif ("${ext}" -ne "FILE") {
            $items += @{
                id = "WinRAR_Add"
                name = "WinRAR: Add to archive..."
                icon = $winRarPath
                command = '"{0}" a "%1.rar" "%1"' -f $winRarPath
            }
            if ("${ext}" -eq ".zip" -or "${ext}" -eq ".rar" -or "${ext}" -eq ".7z" -or "${ext}" -eq ".tar" -or "${ext}" -eq ".gz" -or "${ext}" -eq ".iso") {
                $items += @{
                    id = "WinRAR_Extract"
                    name = "WinRAR: Extract files..."
                    icon = $winRarPath
                    command = '"{0}" x "%1"' -f $winRarPath
                }
                $items += @{
                    id = "WinRAR_Extract_Here"
                    name = "WinRAR: Extract Here"
                    icon = $winRarPath
                    command = '"{0}" e "%1"' -f $winRarPath
                }
            }
        }
    }

    # Check for 7-Zip
    $7zPath = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\\7zFM.exe' -ErrorAction SilentlyContinue).'(default)'
    if (-not $7zPath) {
        if (Test-Path "C:\Program Files\\7-Zip\\7zFM.exe") {
            $7zPath = "C:\Program Files\\7-Zip\\7zFM.exe"
        }
    }
    if ($7zPath -and (Test-Path -LiteralPath $7zPath)) {
        $7zG = $7zPath -replace "7zFM.exe", "7zG.exe"
        if ("${ext}" -eq "DIRECTORY") {
            $items += @{
                id = "7Zip_Add"
                name = "7-Zip: Add to archive..."
                icon = $7zPath
                command = '"{0}" a -ad "%1.7z" "%1"' -f $7zG
            }
        } elseif ("${ext}" -ne "FILE") {
            $items += @{
                id = "7Zip_Add"
                name = "7-Zip: Add to archive..."
                icon = $7zPath
                command = '"{0}" a "%1.7z" "%1"' -f $7zG
            }
            if ("${ext}" -eq ".zip" -or "${ext}" -eq ".rar" -or "${ext}" -eq ".7z" -or "${ext}" -eq ".tar" -or "${ext}" -eq ".gz" -or "${ext}" -eq ".iso") {
                $items += @{
                    id = "7Zip_Extract"
                    name = "7-Zip: Extract files..."
                    icon = $7zPath
                    command = '"{0}" x -ad "%1"' -f $7zG
                }
                $items += @{
                    id = "7Zip_Extract_Here"
                    name = "7-Zip: Extract Here"
                    icon = $7zPath
                    command = '"{0}" e "%1"' -f $7zG
                }
            }
        }
    }

    $items | ConvertTo-Json -Depth 3
  `;

  const child = spawn('powershell', ['-NoProfile', '-Command', '-']);
  
  let stdoutData = '';
  let stderrData = '';
  
  child.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    stderrData += data.toString();
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      return callback(new Error(`PowerShell process exited with code ${code}. Error: ${stderrData}`));
    }
    try {
      let parsed = stdoutData.trim() ? JSON.parse(stdoutData) : [];
      if (!Array.isArray(parsed)) parsed = [parsed];
      
      // Deduplicate by name
      const uniqueItems = [];
      const seen = new Set();
      for (const item of parsed) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          uniqueItems.push(item);
        }
      }
      
      contextMenuCache[ext] = uniqueItems;
      callback(null, uniqueItems);
    } catch (e) {
      callback(e);
    }
  });

  child.on('error', (err) => {
    callback(err);
  });

  child.stdin.write(script);
  child.stdin.end();
}

module.exports = { getContextMenu };
