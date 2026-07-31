const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const {
  PathValidationError,
  normalizeInputPath,
  validatePathArray
} = require('../security/pathGuard');

const POWERSHELL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Write-Result([object]$Value) {
  $Value | ConvertTo-Json -Depth 6 -Compress
}

function Get-ShellItem([string]$TargetPath) {
  $shell = New-Object -ComObject Shell.Application
  $parentPath = [System.IO.Path]::GetDirectoryName($TargetPath.TrimEnd('\'))
  $leafName = [System.IO.Path]::GetFileName($TargetPath.TrimEnd('\'))
  $folder = $shell.Namespace($parentPath)
  if ($null -eq $folder) {
    throw "Windows Shell cannot open parent folder: $parentPath"
  }
  $item = $folder.ParseName($leafName)
  if ($null -eq $item) {
    throw "Windows Shell cannot resolve item: $TargetPath"
  }
  return @{ Shell = $shell; Folder = $folder; Item = $item }
}

$request = Get-Content -LiteralPath $env:MONKEZ_SHELL_REQUEST -Raw -Encoding UTF8 | ConvertFrom-Json

switch ($request.operation) {
  'setClipboard' {
    Add-Type -AssemblyName System.Windows.Forms
    $dropList = New-Object System.Collections.Specialized.StringCollection
    foreach ($filePath in @($request.paths)) {
      [void]$dropList.Add([string]$filePath)
    }

    $effect = if ($request.mode -eq 'cut') { 2 } else { 1 }
    $dataObject = New-Object System.Windows.Forms.DataObject
    $dataObject.SetFileDropList($dropList)
    $dataObject.SetData('Preferred DropEffect', [byte[]]@($effect, 0, 0, 0))
    [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
    Write-Result @{ success = $true; mode = $request.mode; count = $dropList.Count }
  }
  'readClipboard' {
    Add-Type -AssemblyName System.Windows.Forms
    $dataObject = [System.Windows.Forms.Clipboard]::GetDataObject()
    $paths = @()
    $mode = 'copy'

    if ($null -ne $dataObject -and $dataObject.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
      $paths = @($dataObject.GetFileDropList())
      if ($dataObject.GetDataPresent('Preferred DropEffect')) {
        $effectData = $dataObject.GetData('Preferred DropEffect')
        if ($effectData -is [System.IO.MemoryStream]) {
          $effectData.Position = 0
          $effect = $effectData.ReadByte()
        } elseif ($effectData -is [byte[]]) {
          $effect = $effectData[0]
        }
        if (($effect -band 2) -eq 2) {
          $mode = 'cut'
        }
      }
    }

    Write-Result @{ success = $true; mode = $mode; paths = $paths }
  }
  'paste' {
    $shell = New-Object -ComObject Shell.Application
    $folder = $shell.Namespace([string]$request.destination)
    if ($null -eq $folder) {
      throw "Windows Shell cannot open destination: $($request.destination)"
    }
    $folder.Self.InvokeVerb('paste')
    Write-Result @{ success = $true; destination = $request.destination }
  }
  'listVerbs' {
    $resolved = Get-ShellItem ([string]$request.path)
    $verbs = @()
    $index = 0
    foreach ($verb in @($resolved.Item.Verbs())) {
      $name = ([string]$verb.Name).Replace('&', '').Trim()
      if ($name) {
        $verbs += @{ id = $index; name = $name }
      }
      $index++
    }
    Write-Result @{ success = $true; verbs = $verbs }
  }
  'invokeVerb' {
    $resolved = Get-ShellItem ([string]$request.path)
    $matched = $null
    $matchedName = $null
    $index = 0
    foreach ($verb in @($resolved.Item.Verbs())) {
      if ($index -eq [int]$request.verbId) {
        $matched = $verb
        $matchedName = ([string]$verb.Name).Replace('&', '').Trim()
        break
      }
      $index++
    }
    if ($null -eq $matched) {
      throw "Shell verb is no longer available: $($request.verbId)"
    }
    $matched.DoIt()
    Write-Result @{ success = $true; verbName = $matchedName }
  }
  'invokeCanonicalVerb' {
    $resolved = Get-ShellItem ([string]$request.path)
    $resolved.Item.InvokeVerb([string]$request.verb)
    Write-Result @{ success = $true; verb = $request.verb }
  }
  'createShortcut' {
    $targetPath = [string]$request.path
    $destination = [string]$request.destination
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($targetPath)
    if ([System.IO.Directory]::Exists($targetPath)) {
      $baseName = [System.IO.Path]::GetFileName($targetPath.TrimEnd('\'))
    }
    if ([string]::IsNullOrWhiteSpace($baseName)) {
      $baseName = 'Shortcut'
    }

    $shortcutPath = Join-Path $destination "$baseName - Shortcut.lnk"
    $copyIndex = 2
    while (Test-Path -LiteralPath $shortcutPath) {
      $shortcutPath = Join-Path $destination "$baseName - Shortcut ($copyIndex).lnk"
      $copyIndex++
    }

    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = if ([System.IO.Directory]::Exists($targetPath)) {
      $targetPath
    } else {
      [System.IO.Path]::GetDirectoryName($targetPath)
    }
    $shortcut.Save()
    Write-Result @{ success = $true; shortcutPath = $shortcutPath }
  }
  default {
    throw "Unsupported Windows Shell operation: $($request.operation)"
  }
}
`;

const encodePowerShell = script => Buffer.from(script, 'utf16le').toString('base64');

class WindowsShellService {
  constructor({
    platform = process.platform,
    spawnImpl = spawn,
    tempDir = os.tmpdir(),
    timeoutMs = 15000
  } = {}) {
    this.platform = platform;
    this.spawnImpl = spawnImpl;
    this.tempDir = tempDir;
    this.timeoutMs = timeoutMs;
  }

  getCapabilities() {
    const available = this.platform === 'win32';
    return {
      available,
      experimental: true,
      clipboard: available,
      paste: available,
      shellVerbs: available,
      shortcuts: available
    };
  }

  assertAvailable() {
    if (this.platform !== 'win32') {
      throw new PathValidationError('Windows Shell mode is only available on Windows', 501);
    }
  }

  async run(request) {
    this.assertAvailable();
    const requestPath = path.join(
      this.tempDir,
      `monkez-shell-${process.pid}-${crypto.randomBytes(8).toString('hex')}.json`
    );
    await fs.promises.writeFile(requestPath, JSON.stringify(request), 'utf8');

    try {
      return await new Promise((resolve, reject) => {
        const child = this.spawnImpl('powershell.exe', [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-STA',
          '-EncodedCommand',
          encodePowerShell(POWERSHELL_SCRIPT)
        ], {
          env: {
            ...process.env,
            MONKEZ_SHELL_REQUEST: requestPath
          },
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill();
          reject(new Error('Windows Shell operation timed out'));
        }, this.timeoutMs);

        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
        child.stdout?.on('data', chunk => {
          stdout += chunk;
        });
        child.stderr?.on('data', chunk => {
          stderr += chunk;
        });
        child.once('error', err => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
        child.once('close', code => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (code !== 0) {
            reject(new Error(stderr.trim() || `Windows Shell helper exited with code ${code}`));
            return;
          }
          try {
            resolve(JSON.parse(stdout.trim()));
          } catch {
            reject(new Error(`Windows Shell returned an invalid response: ${stdout.trim()}`));
          }
        });
      });
    } finally {
      await fs.promises.rm(requestPath, { force: true }).catch(() => {});
    }
  }

  setClipboard(paths, mode = 'copy') {
    const normalizedPaths = validatePathArray(paths);
    if (!['copy', 'cut'].includes(mode)) {
      throw new PathValidationError('Clipboard mode must be copy or cut');
    }
    return this.run({ operation: 'setClipboard', paths: normalizedPaths, mode });
  }

  readClipboard() {
    return this.run({ operation: 'readClipboard' });
  }

  paste(destination) {
    const normalizedDestination = normalizeInputPath(destination, {
      mustExist: true,
      directory: true
    });
    return this.run({ operation: 'paste', destination: normalizedDestination });
  }

  listVerbs(targetPath) {
    const normalizedPath = normalizeInputPath(targetPath, { mustExist: true });
    return this.run({ operation: 'listVerbs', path: normalizedPath });
  }

  invokeVerb(targetPath, verbId) {
    const normalizedPath = normalizeInputPath(targetPath, { mustExist: true });
    if (!Number.isInteger(verbId) || verbId < 0 || verbId > 4096) {
      throw new PathValidationError('A valid Shell verb ID is required');
    }
    return this.run({
      operation: 'invokeVerb',
      path: normalizedPath,
      verbId
    });
  }

  invokeCanonicalVerb(targetPath, verb) {
    const normalizedPath = normalizeInputPath(targetPath, { mustExist: true });
    const allowedVerbs = new Set(['properties']);
    if (!allowedVerbs.has(verb)) {
      throw new PathValidationError('Unsupported canonical Shell verb');
    }
    return this.run({
      operation: 'invokeCanonicalVerb',
      path: normalizedPath,
      verb
    });
  }

  createShortcut(targetPath, destination) {
    const normalizedPath = normalizeInputPath(targetPath, { mustExist: true });
    const normalizedDestination = normalizeInputPath(destination, {
      mustExist: true,
      directory: true
    });
    return this.run({
      operation: 'createShortcut',
      path: normalizedPath,
      destination: normalizedDestination
    });
  }
}

module.exports = { WindowsShellService, POWERSHELL_SCRIPT };
