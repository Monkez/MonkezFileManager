const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const { getContextMenu } = require('./contextMenuHelper');
const {
  normalizeInputPath,
  resolveChildPath,
  validatePathArray,
  sendPathError
} = require('./security/pathGuard');
const { TaskManager } = require('./services/taskManager');
const { createTasksRouter } = require('./routes/tasks.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const taskManager = new TaskManager();

const allowedOrigins = new Set([
  `http://localhost:3000`,
  `http://127.0.0.1:3000`,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

app.use((req, res, next) => {
  const hostHeader = req.headers.host || '';
  const hostName = hostHeader.split(':')[0].toLowerCase();
  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

  if (hostName && !allowedHosts.has(hostName)) {
    return res.status(403).json({ error: 'Only localhost access is allowed' });
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin is not allowed'));
  }
}));
app.use(express.json());
app.use('/api/tasks', createTasksRouter(taskManager));

// Bookmark JSON storage path - support Electron userData path and packaged writeable path
let bookmarksCachedPath = null;
const getBookmarksFile = () => {
  if (bookmarksCachedPath) return bookmarksCachedPath;

  const isElectron = process.versions.electron !== undefined;
  if (isElectron) {
    try {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      bookmarksCachedPath = path.join(userDataPath, 'bookmarks.json');
    } catch (e) {
      console.warn('Failed to get Electron userData path, trying folder path fallback', e);
    }
  }

  if (!bookmarksCachedPath) {
    const isPackaged = process.pkg !== undefined;
    if (isPackaged) {
      bookmarksCachedPath = path.join(path.dirname(process.execPath), 'bookmarks.json');
    } else {
      // Fallback to local user AppData
      const userProfile = process.env.USERPROFILE || 'C:\\Users\\tiend';
      const appData = process.env.APPDATA || path.join(userProfile, 'AppData\\Roaming');
      const monkezDataFolder = path.join(appData, 'MonkezFileManager');
      try {
        if (!fs.existsSync(monkezDataFolder)) {
          fs.mkdirSync(monkezDataFolder, { recursive: true });
        }
        bookmarksCachedPath = path.join(monkezDataFolder, 'bookmarks.json');
      } catch (err) {
        bookmarksCachedPath = path.join(__dirname, 'bookmarks.json');
      }
    }
  }

  // Initialize empty bookmarks if not exist
  try {
    if (!fs.existsSync(bookmarksCachedPath)) {
      fs.writeFileSync(bookmarksCachedPath, JSON.stringify([
        { name: 'Home', path: process.env.USERPROFILE || 'C:\\' },
      ], null, 2));
    }
  } catch (err) {
    console.error('Failed to initialize bookmarks file:', err);
  }

  return bookmarksCachedPath;
};

// Helper to check if running on Windows
const isWindows = process.platform === 'win32';

const escapePowerShellSingleQuoted = (value) => String(value).replace(/'/g, "''");

const runPowerShellScript = (script, callback) => {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const child = spawn('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    encoded
  ], { windowsHide: true });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', data => {
    stdout += data.toString();
  });
  child.stderr.on('data', data => {
    stderr += data.toString();
  });
  child.on('error', callback);
  child.on('close', code => {
    if (code !== 0) {
      const err = new Error(stderr || `PowerShell exited with code ${code}`);
      err.stderr = stderr;
      return callback(err, stdout, stderr);
    }
    callback(null, stdout, stderr);
  });
};

const runProcess = (command, args, callback) => {
  const child = spawn(command, args, { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', data => {
    stdout += data.toString();
  });
  child.stderr.on('data', data => {
    stderr += data.toString();
  });
  child.on('error', callback);
  child.on('close', code => {
    if (code !== 0) {
      const err = new Error(stderr || `${command} exited with code ${code}`);
      err.stderr = stderr;
      return callback(err, stdout, stderr);
    }
    callback(null, stdout, stderr);
  });
};

// ----------------------------------------------------
// Real-time Drive Plug/Unplug Detector (Windows WMI)
// ----------------------------------------------------
let driveWatcherProcess = null;
const driveClients = new Set();

const startDriveWatcher = () => {
  if (!isWindows) return;
  if (driveWatcherProcess) return;

  const psCmd = `
    $ErrorActionPreference = 'Stop'
    try {
      Register-WmiEvent -Class Win32_VolumeChangeEvent -SourceIdentifier "USBChange" -Action {
        $evt = $Event.SourceEventArgs.NewEvent
        Write-Host "VOLUME_CHANGE:$($evt.EventType):$($evt.DriveName)"
        [System.Console]::Out.Flush()
      }
      Write-Host "WMI_LISTENER_STARTED"
      [System.Console]::Out.Flush()
      while ($true) {
        Start-Sleep -Seconds 1
      }
    } catch {
      Write-Host "ERROR:$($_.Exception.Message)"
      [System.Console]::Out.Flush()
    }
  `;

  try {
    driveWatcherProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCmd]);

    driveWatcherProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('VOLUME_CHANGE:')) {
          const parts = trimmed.split(':');
          const eventType = parts[1]; // '2' plugged, '3' unplugged
          const driveName = parts[2]; // e.g. 'E:'
          
          console.log(`[DriveWatcher] Event: Type=${eventType}, Drive=${driveName}`);
          
          const payload = JSON.stringify({ eventType, driveName });
          for (const client of driveClients) {
            try {
              client.write(`data: ${payload}\n\n`);
            } catch (err) {
              console.error('[DriveWatcher] Failed to write to client:', err.message);
            }
          }
        } else if (trimmed.startsWith('ERROR:')) {
          console.error('[DriveWatcher] PowerShell inner error:', trimmed);
        }
      }
    });

    driveWatcherProcess.stderr.on('data', (data) => {
      console.error('[DriveWatcher] stderr:', data.toString().trim());
    });

    driveWatcherProcess.on('error', (err) => {
      console.error('[DriveWatcher] Failed to start process:', err);
    });

    driveWatcherProcess.on('exit', (code) => {
      console.log(`[DriveWatcher] Process exited with code ${code}`);
      driveWatcherProcess = null;
      // Restart watcher if we still have active connections
      if (driveClients.size > 0) {
        console.log('[DriveWatcher] Restarting in 5 seconds...');
        setTimeout(startDriveWatcher, 5000);
      }
    });
  } catch (err) {
    console.error('[DriveWatcher] Spawn exception:', err);
  }
};

const stopDriveWatcher = () => {
  if (driveWatcherProcess) {
    try {
      driveWatcherProcess.kill();
    } catch (e) {}
      driveWatcherProcess = null;
  }
};

// Ensure background processes are cleaned up when Node exits
process.on('exit', stopDriveWatcher);
process.on('SIGINT', () => {
  stopDriveWatcher();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopDriveWatcher();
  process.exit(0);
});

// Get Resolved System Paths API
app.get('/api/system-paths', (req, res) => {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\tiend';

  const getSystemPath = (folderName) => {
    // Check if OneDrive folder exists and has this subfolder
    const onedrivePath = path.join(userProfile, 'OneDrive', folderName);
    if (fs.existsSync(onedrivePath)) {
      return onedrivePath;
    }
    return path.join(userProfile, folderName);
  };

  const desktop = getSystemPath('Desktop');
  const downloads = getSystemPath('Downloads');
  const documents = getSystemPath('Documents');
  const pictures = getSystemPath('Pictures');
  const videos = getSystemPath('Videos');
  const music = getSystemPath('Music');
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const windowsDir = process.env.SystemRoot || 'C:\\Windows';
  const appData = process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming');
  const tempDir = process.env.TEMP || path.join(userProfile, 'AppData', 'Local', 'Temp');

  res.json({
    userProfile,
    desktop,
    downloads,
    documents,
    pictures,
    videos,
    music,
    programFiles,
    programFilesX86,
    windowsDir,
    appData,
    tempDir
  });
});

// Launch System Utility Tools API
app.post('/api/launch-tool', (req, res) => {
  const { tool } = req.body;
  let target = '';

  switch (tool) {
    case 'control-panel':
      target = 'control';
      break;
    case 'settings':
      target = 'ms-settings:';
      break;
    case 'add-remove-programs':
      target = 'ms-settings:appsfeatures';
      break;
    case 'task-manager':
      target = 'taskmgr';
      break;
    case 'disk-management':
      target = 'diskmgmt.msc';
      break;
    case 'device-manager':
      target = 'devmgmt.msc';
      break;
    case 'registry-editor':
      target = 'regedit';
      break;
    case 'command-prompt':
      target = 'cmd';
      break;
    case 'powershell':
      target = 'powershell';
      break;
    case 'services':
      target = 'services.msc';
      break;
    case 'resource-monitor':
      target = 'resmon';
      break;
    default:
      return res.status(400).json({ error: 'Unknown system utility tool' });
  }

  // Prepend 'start ' to launch GUI as a detached process and exit cmd.exe immediately
  const command = `start ${target}`;

  exec(command, (error) => {
    if (error) {
      console.error(`Failed to launch tool ${tool}:`, error);
    }
  });

  // Return success immediately to the client
  res.json({ success: true });
});

// Watch logical drives endpoint (SSE)
app.get('/api/watch-drives', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  driveClients.add(res);
  console.log(`[DriveWatcher] Client connected. Total: ${driveClients.size}`);

  // Ensure watcher process is running
  startDriveWatcher();

  req.on('close', () => {
    driveClients.delete(res);
    console.log(`[DriveWatcher] Client disconnected. Total: ${driveClients.size}`);
    if (driveClients.size === 0) {
      stopDriveWatcher();
    }
  });
});

// 1. Get Drives API
app.get('/api/drives', (req, res) => {
  if (!isWindows) {
    // Fallback for non-Windows (mock C: drive pointing to workspace/root)
    return res.json([
      { DeviceID: '/', VolumeName: 'Root', Size: 50000000000, FreeSpace: 25000000000 }
    ]);
  }

  // Windows CimInstance check
  const cmd = `powershell -Command "Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object DeviceID, VolumeName, Size, FreeSpace | ConvertTo-Json"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Error fetching drives:', error);
      return res.status(500).json({ error: 'Failed to retrieve logical drives.' });
    }
    try {
      let drives = JSON.parse(stdout);
      // If CIM returns single drive, it's a JSON object, convert to array
      if (!Array.isArray(drives)) {
        drives = drives ? [drives] : [];
      }
      res.json(drives);
    } catch (e) {
      // Fallback manual query A-Z
      const fallbackDrives = [];
      for (let i = 65; i <= 90; i++) {
        const driveLetter = String.fromCharCode(i) + ':';
        try {
          if (fs.existsSync(driveLetter + '\\')) {
            fallbackDrives.push({
              DeviceID: driveLetter,
              VolumeName: driveLetter === 'C:' ? 'System' : 'Local Disk',
              Size: 0,
              FreeSpace: 0
            });
          }
        } catch (err) {}
      }
      res.json(fallbackDrives);
    }
  });
});

// Helper: safe stats
const getFileStats = (fullPath) => {
  try {
    const stats = fs.statSync(fullPath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      birthtime: stats.birthtime,
      isDirectory: stats.isDirectory()
    };
  } catch (err) {
    return {
      size: 0,
      mtime: new Date(0),
      birthtime: new Date(0),
      isDirectory: false,
      error: err.message
    };
  }
};

// Icon Cache and Resolver
const iconCache = {};
const isElectronApp = process.versions.electron !== undefined;

const fetchItemIcon = async (fileObj) => {
  if (fileObj.isDirectory) return;

  const ext = fileObj.ext;
  const isGenericExtension = ext && !['.exe', '.lnk', '.ico', '.app'].includes(ext);

  if (isGenericExtension && iconCache[ext]) {
    fileObj.icon = iconCache[ext];
    return;
  }

  if (isElectronApp) {
    try {
      const { app } = require('electron');
      const icon = await app.getFileIcon(fileObj.path, { size: 'normal' });
      const dataUrl = icon.toDataURL();

      if (isGenericExtension) {
        iconCache[ext] = dataUrl;
      }
      fileObj.icon = dataUrl;
    } catch (err) {
      // Ignore error and leave icon as null
    }
  }
};

// App Icon Extraction API for Context Menu
app.get('/api/app-icon', async (req, res) => {
  let iconPath = req.query.path;
  if (!iconPath) return res.status(400).send('Path missing');
  
  // Clean up things like "C:\App.exe,0" or "%SystemRoot%\system32\imageres.dll,-104"
  // Expand environment variables
  iconPath = iconPath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
  
  // Remove icon index (e.g., ,0 or ,-104)
  const commaIndex = iconPath.lastIndexOf(',');
  if (commaIndex !== -1) {
    iconPath = iconPath.substring(0, commaIndex);
  }
  // Remove quotes
  iconPath = iconPath.replace(/^["']|["']$/g, '').trim();

  // If using electron, we can extract the icon
  if (isElectronApp) {
    try {
      const { app } = require('electron');
      const icon = await app.getFileIcon(iconPath, { size: 'small' });
      const dataUrl = icon.toDataURL();
      return res.json({ icon: dataUrl });
    } catch (err) {
      return res.status(404).json({ error: 'Icon extraction failed' });
    }
  } else {
    // Cannot easily extract EXE icons without electron, return 404 to fallback
    return res.status(404).json({ error: 'Electron required for icon extraction' });
  }
});

// File Icon Extraction API
app.get('/api/file-icon', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).send('Path missing');

  try {
    const ext = path.extname(filePath).toLowerCase();
    const isGenericExtension = ext && !['.exe', '.lnk', '.ico', '.app'].includes(ext);

    // If cached, return it
    if (isGenericExtension && iconCache[ext]) {
      const base64Data = iconCache[ext].replace(/^data:image\/\w+;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      return res.send(imgBuffer);
    }

    if (isElectronApp) {
      const { app: electronApp } = require('electron');
      const icon = await electronApp.getFileIcon(filePath, { size: 'normal' });
      const imgBuffer = icon.toPNG(); // Get raw PNG buffer directly

      if (isGenericExtension) {
        iconCache[ext] = icon.toDataURL();
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(imgBuffer);
    } else {
      return res.status(404).send('Not supported');
    }
  } catch (err) {
    console.error('Error fetching file icon:', err);
    return res.status(500).send(err.message);
  }
});

// 2. Directory Listing API
app.get('/api/files', async (req, res) => {
  let targetPath = req.query.path;

  if (!targetPath) {
    targetPath = process.env.USERPROFILE || 'C:\\';
  }

  // Ensure trailing backslash for drive letters (e.g., C: -> C:\)
  if (isWindows && /^[A-Za-z]:$/.test(targetPath)) {
    targetPath += '\\';
  }

  try {
    targetPath = normalizeInputPath(targetPath);
  } catch (err) {
    return sendPathError(res, err);
  }

  // Auto-redirect standard profile folders to OneDrive if they don't exist directly
  if (isWindows && !fs.existsSync(targetPath)) {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\tiend';
    const relative = path.relative(userProfile, targetPath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      const parts = relative.split(path.sep);
      if (parts.length === 1) {
        const folderName = parts[0];
        const onedrivePath = path.join(userProfile, 'OneDrive', folderName);
        if (fs.existsSync(onedrivePath)) {
          targetPath = onedrivePath;
        }
      }
    }
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: `Path does not exist: ${targetPath}` });
    }

    const stat = await fs.promises.stat(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Path is not a directory: ${targetPath}` });
    }

    const rawItems = await fs.promises.readdir(targetPath, { withFileTypes: true });

    const itemPromises = rawItems.map(async (item) => {
      const itemPath = path.join(targetPath, item.name);
      const isDir = item.isDirectory();
      let stats = { size: 0, mtime: new Date(0), birthtime: new Date(0) };
      try {
        stats = await fs.promises.stat(itemPath);
      } catch (err) {}

      return {
        name: item.name,
        path: itemPath,
        isDirectory: isDir,
        size: stats.size,
        mtime: stats.mtime,
        ext: isDir ? '' : path.extname(item.name).toLowerCase(),
        isHidden: item.name.startsWith('.') || item.name.startsWith('$'),
        icon: null
      };
    });

    const items = await Promise.all(itemPromises);

    const folders = items.filter(i => i.isDirectory);
    const files = items.filter(i => !i.isDirectory);

    // Skip heavy icon fetching here for performance. Frontend will lazy load them.

    // Sort: Folders first, alphabetical
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Breadcrumbs list
    const breadcrumbs = [];
    const normalized = targetPath.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    
    let accumulatedPath = '';
    
    // For Windows drives (e.g. C:)
    if (isWindows && segments[0] && segments[0].endsWith(':')) {
      accumulatedPath = segments[0] + '\\';
      breadcrumbs.push({ name: segments[0], path: accumulatedPath });
      for (let i = 1; i < segments.length; i++) {
        accumulatedPath = path.join(accumulatedPath, segments[i]);
        breadcrumbs.push({ name: segments[i], path: accumulatedPath });
      }
    } else {
      // Linux/macOS style or non-drive paths
      accumulatedPath = '/';
      breadcrumbs.push({ name: 'Root', path: accumulatedPath });
      for (const segment of segments) {
        accumulatedPath = path.join(accumulatedPath, segment);
        breadcrumbs.push({ name: segment, path: accumulatedPath });
      }
    }

    const parentPath = path.dirname(targetPath) === targetPath ? null : path.dirname(targetPath);

    res.json({
      currentPath: targetPath,
      parentPath: parentPath,
      breadcrumbs: breadcrumbs,
      items: [...folders, ...files]
    });

  } catch (err) {
    console.error('Error reading directory:', err);
    res.status(500).json({
      error: `Access denied or empty directory. Detail: ${err.message}`,
      currentPath: targetPath,
      parentPath: path.dirname(targetPath) === targetPath ? null : path.dirname(targetPath),
      breadcrumbs: [],
      items: []
    });
  }
});

// OS Clipboard APIs
app.post('/api/clipboard/copy', (req, res) => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: 'No paths provided' });
  }

  // Create a unique temporary file to pass paths safely to PowerShell
  const tempFile = path.join(os.tmpdir(), `monkez_cb_${crypto.randomBytes(6).toString('hex')}.txt`);

  try {
    fs.writeFileSync(tempFile, paths.join('\r\n'), 'utf8');

    // Use powershell -LiteralPath with Get-Content to copy files to clipboard
    const cmd = `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -LiteralPath (Get-Content -LiteralPath '${tempFile.replace(/'/g, "''")}' -Encoding utf8)"`;

    exec(cmd, (error) => {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (unlinkErr) {
        console.error('Failed to delete temporary clipboard file:', unlinkErr);
      }

      if (error) {
        console.error('Failed to copy to OS clipboard:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Failed to write temporary clipboard file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/clipboard/read', (req, res) => {
  const cmd = `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-Clipboard -Format FileDropList).FullName"`;
  
  exec(cmd, (error, stdout) => {
    if (error) {
      // It returns error if clipboard doesn't contain FileDropList
      return res.json({ paths: [] });
    }
    
    // Parse paths from stdout (each line is a path, outputted in UTF-8)
    const paths = stdout.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    res.json({ paths });
  });
});

// File Watcher API (SSE)
app.get('/api/watch', (req, res) => {
  let targetPath;
  try {
    targetPath = normalizeInputPath(req.query.path, { mustExist: true, directory: true });
  } catch (err) {
    return res.status(err.statusCode || 400).send(err.message);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let watcher = null;
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (watcher) {
      try {
        watcher.close();
      } catch (err) {}
      watcher = null;
    }
    try {
      res.end();
    } catch (err) {}
  };

  try {
    watcher = fs.watch(targetPath, (eventType, filename) => {
      if (isClosed) return;

      // Verify if path still exists
      fs.access(targetPath, fs.constants.F_OK, (err) => {
        if (err) {
          // Folder deleted/unplugged
          try {
            res.write(`data: ${JSON.stringify({ event: 'deleted' })}\n\n`);
          } catch (writeErr) {}
          cleanup();
          return;
        }

        // Folder still exists, normal change
        try {
          res.write(`data: ${JSON.stringify({ event: 'changed', fileEvent: eventType, filename })}\n\n`);
        } catch (writeErr) {}
      });
    });

    watcher.on('error', (err) => {
      console.error(`Watcher error for path ${targetPath}:`, err.message);
      try {
        res.write(`data: ${JSON.stringify({ event: 'deleted', error: err.message })}\n\n`);
      } catch (writeErr) {}
      cleanup();
    });

  } catch (err) {
    console.error('Failed to watch directory:', err);
    try {
      res.write(`data: ${JSON.stringify({ event: 'error', message: err.message })}\n\n`);
    } catch (writeErr) {}
    cleanup();
  }

  req.on('close', () => {
    cleanup();
  });
});

// 3. Create folder
app.post('/api/mkdir', (req, res) => {
  const { currentPath, name } = req.body;
  if (!currentPath || !name) {
    return res.status(400).json({ error: 'Missing currentPath or name' });
  }

  try {
    const targetPath = resolveChildPath(currentPath, name);
    if (fs.existsSync(targetPath)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }
    fs.mkdirSync(targetPath);
    res.json({ success: true, path: targetPath });
  } catch (err) {
    sendPathError(res, err);
  }
});

// 4. Create blank file
app.post('/api/mkfile', (req, res) => {
  const { currentPath, name } = req.body;
  if (!currentPath || !name) {
    return res.status(400).json({ error: 'Missing currentPath or name' });
  }

  try {
    const targetPath = resolveChildPath(currentPath, name);
    if (fs.existsSync(targetPath)) {
      return res.status(400).json({ error: 'File already exists' });
    }
    fs.writeFileSync(targetPath, '');
    res.json({ success: true, path: targetPath });
  } catch (err) {
    sendPathError(res, err);
  }
});

// 5. Rename item
app.post('/api/rename', (req, res) => {
  const { currentPath, oldName, newName } = req.body;
  if (!currentPath || !oldName || !newName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const oldPath = resolveChildPath(currentPath, oldName);
    const newPath = resolveChildPath(currentPath, newName);
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Source file/folder does not exist' });
    }
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'Destination already exists' });
    }
    fs.renameSync(oldPath, newPath);
    res.json({ success: true });
  } catch (err) {
    sendPathError(res, err);
  }
});

// 6. Delete file/folder
app.post('/api/delete', async (req, res) => {
  let paths;
  try {
    paths = validatePathArray(req.body.paths);
  } catch (err) {
    return sendPathError(res, err);
  }
  const errors = [];
  const isElectron = process.versions.electron !== undefined;
  
  for (const itemPath of paths) {
    try {
      if (fs.existsSync(itemPath)) {
        if (isElectron) {
          const { shell } = require('electron');
          await shell.trashItem(itemPath);
        } else {
          // Fallback to permanent delete if not running in electron
          fs.rmSync(itemPath, { recursive: true, force: true });
        }
      }
    } catch (err) {
      errors.push({ path: itemPath, error: err.message });
    }
  }

  if (errors.length > 0) {
    res.status(207).json({ success: false, errors });
  } else {
    res.json({ success: true });
  }
});

// 6b. Delete Permanent file/folder
app.post('/api/delete-permanent', (req, res) => {
  let paths;
  try {
    paths = validatePathArray(req.body.paths);
  } catch (err) {
    return sendPathError(res, err);
  }
  const errors = [];
  for (const itemPath of paths) {
    try {
      if (fs.existsSync(itemPath)) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
    } catch (err) {
      errors.push({ path: itemPath, error: err.message });
    }
  }

  if (errors.length > 0) {
    res.status(207).json({ success: false, errors });
  } else {
    res.json({ success: true });
  }
});

// Helper for cross-drive copy-then-delete moving
const moveItem = (src, dest) => {
  // Check if they are on different drives
  const srcDrive = path.parse(src).root;
  const destDrive = path.parse(dest).root;

  if (srcDrive.toLowerCase() === destDrive.toLowerCase()) {
    // Same drive - can just rename
    fs.renameSync(src, dest);
  } else {
    // Cross-drive - copy and delete
    fs.cpSync(src, dest, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
};

const getAvailableDestination = (destinationDir, baseName) => {
  let candidate = path.join(destinationDir, baseName);
  if (!fs.existsSync(candidate)) return candidate;

  const parsed = path.parse(baseName);
  let index = 1;
  do {
    const suffix = index === 1 ? ' - Copy' : ` - Copy ${index}`;
    candidate = path.join(destinationDir, `${parsed.name}${suffix}${parsed.ext}`);
    index += 1;
  } while (fs.existsSync(candidate));

  return candidate;
};

// 7. Copy file/folder
app.post('/api/copy', (req, res) => {
  let sources;
  let destinationDir;
  try {
    sources = validatePathArray(req.body.sources);
    destinationDir = normalizeInputPath(req.body.destinationDir, {
      mustExist: true,
      directory: true
    });
  } catch (err) {
    return sendPathError(res, err);
  }

  const errors = [];
  for (const src of sources) {
    try {
      const name = path.basename(src);
      const dest = getAvailableDestination(destinationDir, name);
      fs.cpSync(src, dest, { recursive: true, force: false, errorOnExist: true });
    } catch (err) {
      errors.push({ source: src, error: err.message });
    }
  }

  if (errors.length > 0) {
    res.status(207).json({ success: false, errors });
  } else {
    res.json({ success: true });
  }
});

// 8. Move file/folder
app.post('/api/move', (req, res) => {
  let sources;
  let destinationDir;
  try {
    sources = validatePathArray(req.body.sources);
    destinationDir = normalizeInputPath(req.body.destinationDir, {
      mustExist: true,
      directory: true
    });
  } catch (err) {
    return sendPathError(res, err);
  }

  const errors = [];
  for (const src of sources) {
    try {
      const name = path.basename(src);
      const dest = getAvailableDestination(destinationDir, name);
      moveItem(src, dest);
    } catch (err) {
      errors.push({ source: src, error: err.message });
    }
  }

  if (errors.length > 0) {
    res.status(207).json({ success: false, errors });
  } else {
    res.json({ success: true });
  }
});

// 9. File Preview API (Text / Code / Metadata)
app.get('/api/preview', (req, res) => {
  try {
    const filePath = normalizeInputPath(req.query.path, { mustExist: true });
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return res.json({ type: 'directory', size: stats.size });
    }

    const ext = path.extname(filePath).toLowerCase();
    
    // Check if it is text/code/json/markdown
    const textExtensions = [
      '.txt', '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css',
      '.py', '.sh', '.bat', '.ps1', '.ini', '.cfg', '.yaml', '.yml', '.xml',
      '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.sql'
    ];

    if (textExtensions.includes(ext)) {
      // Read first 10KB safely to avoid lagging on huge logs
      const buffer = Buffer.alloc(10240);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 10240, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf8', 0, bytesRead);
      return res.json({
        type: 'text',
        size: stats.size,
        content: content,
        truncated: stats.size > bytesRead
      });
    }

    // Media preview details
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const videoExtensions = ['.mp4', '.webm', '.ogg'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];

    if (imageExtensions.includes(ext)) {
      return res.json({ type: 'image', size: stats.size });
    }
    if (videoExtensions.includes(ext)) {
      return res.json({ type: 'video', size: stats.size });
    }
    if (audioExtensions.includes(ext)) {
      return res.json({ type: 'audio', size: stats.size });
    }

    // Generic binary file details
    res.json({
      type: 'binary',
      size: stats.size,
      mtime: stats.mtime,
      birthtime: stats.birthtime
    });

  } catch (err) {
    sendPathError(res, err);
  }
});

// ICO to PNG converter — parses the ICO binary directory and extracts the best image as PNG
// ICO entries can be either embedded PNG or raw BMP pixel data (DIB).
function icoToPng(icoBuffer) {
  const zlib = require('zlib');

  if (icoBuffer.length < 6) return null;
  const reserved = icoBuffer.readUInt16LE(0);
  const type = icoBuffer.readUInt16LE(2);
  const count = icoBuffer.readUInt16LE(4);
  if (reserved !== 0 || (type !== 1 && type !== 2) || count === 0) return null;

  // Parse ICO directory entries, pick the largest one
  let bestEntry = null;
  let bestPixels = 0;
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    if (offset + 16 > icoBuffer.length) break;
    let w = icoBuffer.readUInt8(offset);
    let h = icoBuffer.readUInt8(offset + 1);
    if (w === 0) w = 256;
    if (h === 0) h = 256;
    const dataSize = icoBuffer.readUInt32LE(offset + 8);
    const dataOffset = icoBuffer.readUInt32LE(offset + 12);
    const pixels = w * h;
    if (pixels > bestPixels && dataOffset + dataSize <= icoBuffer.length) {
      bestPixels = pixels;
      bestEntry = { w, h, dataSize, dataOffset };
    }
  }
  if (!bestEntry) return null;

  const imgData = icoBuffer.slice(bestEntry.dataOffset, bestEntry.dataOffset + bestEntry.dataSize);

  // Check if the entry is already PNG (starts with PNG magic header)
  if (imgData.length >= 8 && imgData[0] === 0x89 && imgData[1] === 0x50 && imgData[2] === 0x4E && imgData[3] === 0x47) {
    return imgData; // Already a PNG, return as-is
  }

  // Otherwise it's a BMP DIB — convert to PNG
  try {
    // BMP info header (BITMAPINFOHEADER)
    const biSize = imgData.readUInt32LE(0);
    const biWidth = imgData.readInt32LE(4);
    // biHeight in ICO is doubled (includes mask), actual image height is half
    const biHeightFull = imgData.readInt32LE(8);
    const biHeight = Math.abs(biHeightFull) / 2;
    const biBitCount = imgData.readUInt16LE(14);
    const w = biWidth;
    const h = biHeight;

    if (w <= 0 || h <= 0 || w > 1024 || h > 1024) return null;

    // Parse pixel data based on bit depth
    let pixelDataOffset = biSize;
    let palette = [];

    if (biBitCount <= 8) {
      const paletteCount = 1 << biBitCount;
      for (let i = 0; i < paletteCount; i++) {
        const po = biSize + i * 4;
        if (po + 4 > imgData.length) break;
        palette.push({
          b: imgData.readUInt8(po),
          g: imgData.readUInt8(po + 1),
          r: imgData.readUInt8(po + 2),
          a: 255
        });
      }
      pixelDataOffset = biSize + paletteCount * 4;
    }

    // XOR mask (color data) — rows are bottom-up and padded to 4-byte boundaries
    const xorRowSize = Math.ceil((w * biBitCount) / 32) * 4;
    const andRowSize = Math.ceil(w / 32) * 4;
    const xorData = imgData.slice(pixelDataOffset, pixelDataOffset + xorRowSize * h);
    const andData = imgData.slice(pixelDataOffset + xorRowSize * h, pixelDataOffset + xorRowSize * h + andRowSize * h);

    // Build RGBA pixel array (top-to-bottom)
    const rgba = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      const srcY = h - 1 - y; // BMP is bottom-up
      for (let x = 0; x < w; x++) {
        const dstIdx = (y * w + x) * 4;
        let r = 0, g = 0, b = 0, a = 255;

        if (biBitCount === 32) {
          const srcIdx = srcY * xorRowSize + x * 4;
          if (srcIdx + 3 < xorData.length) {
            b = xorData[srcIdx];
            g = xorData[srcIdx + 1];
            r = xorData[srcIdx + 2];
            a = xorData[srcIdx + 3];
          }
        } else if (biBitCount === 24) {
          const srcIdx = srcY * xorRowSize + x * 3;
          if (srcIdx + 2 < xorData.length) {
            b = xorData[srcIdx];
            g = xorData[srcIdx + 1];
            r = xorData[srcIdx + 2];
          }
        } else if (biBitCount === 8) {
          const srcIdx = srcY * xorRowSize + x;
          if (srcIdx < xorData.length) {
            const paletteIdx = xorData[srcIdx];
            if (paletteIdx < palette.length) {
              r = palette[paletteIdx].r;
              g = palette[paletteIdx].g;
              b = palette[paletteIdx].b;
            }
          }
        } else if (biBitCount === 4) {
          const srcIdx = srcY * xorRowSize + Math.floor(x / 2);
          if (srcIdx < xorData.length) {
            const nibble = (x % 2 === 0) ? (xorData[srcIdx] >> 4) : (xorData[srcIdx] & 0x0F);
            if (nibble < palette.length) {
              r = palette[nibble].r;
              g = palette[nibble].g;
              b = palette[nibble].b;
            }
          }
        } else if (biBitCount === 1) {
          const srcIdx = srcY * xorRowSize + Math.floor(x / 8);
          if (srcIdx < xorData.length) {
            const bit = (xorData[srcIdx] >> (7 - (x % 8))) & 1;
            if (bit < palette.length) {
              r = palette[bit].r;
              g = palette[bit].g;
              b = palette[bit].b;
            }
          }
        }

        // Apply AND mask for transparency (if no alpha channel in 32-bit)
        if (biBitCount !== 32 && andData.length > 0) {
          const andIdx = srcY * andRowSize + Math.floor(x / 8);
          if (andIdx < andData.length) {
            const andBit = (andData[andIdx] >> (7 - (x % 8))) & 1;
            if (andBit === 1) a = 0; // transparent
          }
        }

        rgba[dstIdx] = r;
        rgba[dstIdx + 1] = g;
        rgba[dstIdx + 2] = b;
        rgba[dstIdx + 3] = a;
      }
    }

    // Encode as PNG using zlib
    // PNG filter type 0 (None) for each row
    const rawData = Buffer.alloc(h * (1 + w * 4));
    for (let y = 0; y < h; y++) {
      rawData[y * (1 + w * 4)] = 0; // filter byte
      rgba.copy(rawData, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
    }

    const deflated = zlib.deflateSync(rawData);

    // Build PNG file
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const makeCRC = (type, data) => {
      const combined = Buffer.concat([type, data]);
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < combined.length; i++) {
        crc ^= combined[i];
        for (let k = 0; k < 8; k++) {
          crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
        }
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const makeChunk = (typeStr, data) => {
      const type = Buffer.from(typeStr, 'ascii');
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length, 0);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(makeCRC(type, data), 0);
      return Buffer.concat([length, type, data, crc]);
    };

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(w, 0);
    ihdrData.writeUInt32BE(h, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type (RGBA)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdr = makeChunk('IHDR', ihdrData);
    const idat = makeChunk('IDAT', deflated);
    const iend = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([pngSignature, ihdr, idat, iend]);
  } catch (err) {
    console.error('ICO BMP-to-PNG conversion failed:', err.message);
    return null;
  }
}

// 10. Raw File Streaming API (For image/audio/video src tags)
app.get('/api/raw', (req, res) => {
  try {
    const filePath = normalizeInputPath(req.query.path, { mustExist: true, file: true });
    
    // Set explicit content-type headers for images to prevent application/octet-stream fallback
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.ico') {
      // Convert ICO to PNG for browser compatibility (Chromium cannot render .ico in <img>)
      try {
        const icoData = fs.readFileSync(filePath);
        const pngData = icoToPng(icoData);
        if (pngData) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(pngData);
        }
      } catch (e) {
        console.error('ICO conversion failed, falling back to raw:', e.message);
      }
      // Fallback: serve as-is
      res.setHeader('Content-Type', 'image/x-icon');
      return res.sendFile(filePath);
    }

    if (ext === '.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    } else if (ext === '.bmp') {
      res.setHeader('Content-Type', 'image/bmp');
    }
    
    res.sendFile(filePath);
  } catch (err) {
    res.status(err.statusCode || 500).send(err.message);
  }
});

// 11. Bookmarks API
app.get('/api/bookmarks', (req, res) => {
  try {
    const bookmarksFile = getBookmarksFile();
    const data = fs.readFileSync(bookmarksFile, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', (req, res) => {
  const { bookmarks } = req.body;
  if (!bookmarks || !Array.isArray(bookmarks)) {
    return res.status(400).json({ error: 'Bookmarks must be an array' });
  }

  try {
    const bookmarksFile = getBookmarksFile();
    fs.writeFileSync(bookmarksFile, JSON.stringify(bookmarks, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Compress files to ZIP
app.post('/api/compress', (req, res) => {
  const { sources, destination } = req.body;
  if (!sources || !Array.isArray(sources) || !destination) {
    return res.status(400).json({ error: 'Missing sources or destination' });
  }

  let safeSources;
  let safeDestination;
  try {
    safeSources = validatePathArray(sources);
    safeDestination = normalizeInputPath(destination);
  } catch (err) {
    return sendPathError(res, err);
  }

  const done = (error, stdout, stderr) => {
    if (error) {
      console.error('ZIP Error:', error, stderr);
      return res.status(500).json({ error: `ZIP failed: ${stderr || error.message}` });
    }
    res.json({ success: true, path: safeDestination });
  };

  if (process.platform === 'win32') {
    const formattedSources = safeSources.map(src => `'${escapePowerShellSingleQuoted(src)}'`).join(',');
    const script = `Compress-Archive -LiteralPath @(${formattedSources}) -DestinationPath '${escapePowerShellSingleQuoted(safeDestination)}' -Force`;
    return runPowerShellScript(script, done);
  }

  return runProcess('zip', ['-r', safeDestination, ...safeSources], done);
});

// 13. Extract ZIP
app.post('/api/extract', (req, res) => {
  const { source, targetDir } = req.body;
  if (!source || !targetDir) {
    return res.status(400).json({ error: 'Missing source or targetDir' });
  }

  let safeSource;
  let safeTargetDir;
  try {
    safeSource = normalizeInputPath(source, { mustExist: true, file: true });
    safeTargetDir = normalizeInputPath(targetDir, { mustExist: true, directory: true });
  } catch (err) {
    return sendPathError(res, err);
  }

  const done = (error, stdout, stderr) => {
    if (error) {
      console.error('Unzip Error:', error, stderr);
      return res.status(500).json({ error: `Extraction failed: ${stderr || error.message}` });
    }
    res.json({ success: true });
  };

  if (process.platform === 'win32') {
    const script = `Expand-Archive -LiteralPath '${escapePowerShellSingleQuoted(safeSource)}' -DestinationPath '${escapePowerShellSingleQuoted(safeTargetDir)}' -Force`;
    return runPowerShellScript(script, done);
  }

  return runProcess('unzip', [safeSource, '-d', safeTargetDir], done);
});

// Recursive search helper
const recursiveSearch = (dir, query, results = [], maxResults = 100) => {
  if (results.length >= maxResults) return results;
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
      if (results.length >= maxResults) break;
      const fullPath = path.join(dir, file.name);
      
      // Match query
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        const stats = getFileStats(fullPath);
        results.push({
          name: file.name,
          path: fullPath,
          isDirectory: file.isDirectory(),
          size: stats.size,
          mtime: stats.mtime,
          ext: file.isDirectory() ? '' : path.extname(file.name).toLowerCase(),
          isHidden: file.name.startsWith('.') || file.name.startsWith('$')
        });
      }

      if (file.isDirectory() && !file.name.startsWith('.') && !file.name.startsWith('$')) {
        recursiveSearch(fullPath, query, results, maxResults);
      }
    }
  } catch (err) {
    // ignore access denied or empty folder errors
  }
  return results;
};

// 14. Search API
app.get('/api/search', async (req, res) => {
  const { path: targetPath, query } = req.query;
  if (!targetPath || !query) {
    return res.status(400).json({ error: 'Missing path or query' });
  }

  let resolvedPath;
  try {
    resolvedPath = normalizeInputPath(targetPath);
  } catch (err) {
    return sendPathError(res, err);
  }

  // Auto-redirect standard profile folders to OneDrive if they don't exist directly
  if (isWindows && !fs.existsSync(resolvedPath)) {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\tiend';
    const relative = path.relative(userProfile, resolvedPath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      const parts = relative.split(path.sep);
      if (parts.length === 1) {
        const folderName = parts[0];
        const onedrivePath = path.join(userProfile, 'OneDrive', folderName);
        if (fs.existsSync(onedrivePath)) {
          resolvedPath = onedrivePath;
        }
      }
    }
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Search path does not exist' });
    }
    const results = recursiveSearch(resolvedPath, query);
    
    // Fetch icons for all search result items concurrently
    await Promise.all(results.map(fetchItemIcon));
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Open File in OS Default Application API
app.post('/api/open', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const isElectron = process.versions.electron !== undefined;
    if (isElectron) {
      const { shell } = require('electron');
      shell.openPath(filePath).then((err) => {
        if (err) {
          console.error('Failed to open file via electron:', err);
          return res.status(500).json({ error: 'Failed to open file in system default application.' });
        }
        res.json({ success: true });
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
      return;
    }

    let cmd = '';
    if (process.platform === 'win32') {
      // Escape paths containing spaces or quotes
      cmd = `start "" "${filePath}"`;
    } else if (process.platform === 'darwin') {
      cmd = `open "${filePath}"`;
    } else {
      cmd = `xdg-open "${filePath}"`;
    }

    exec(cmd, (error) => {
      if (error) {
        console.error('Failed to open file:', error);
        return res.status(500).json({ error: 'Failed to open file in system default application.' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15b. Reveal File/Folder in OS Explorer API
app.post('/api/reveal', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File/Folder not found' });
    }

    const isElectron = process.versions.electron !== undefined;
    if (isElectron) {
      const { shell } = require('electron');
      shell.showItemInFolder(filePath);
      return res.json({ success: true });
    }

    let cmd = '';
    if (process.platform === 'win32') {
      cmd = `explorer.exe /select,"${filePath}"`;
    } else if (process.platform === 'darwin') {
      cmd = `open -R "${filePath}"`;
    } else {
      cmd = `xdg-open "${path.dirname(filePath)}"`;
    }

    exec(cmd, (error) => {
      if (error) {
        console.error('Failed to reveal file:', error);
        return res.status(500).json({ error: 'Failed to reveal in Explorer.' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Get Folder Size API (Recursive Calculation)
app.get('/api/foldersize', (req, res) => {
  try {
    const targetPath = normalizeInputPath(req.query.path, { mustExist: true, directory: true });

    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;

    const calculate = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            folderCount++;
            calculate(fullPath);
          } else {
            fileCount++;
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          }
        }
      } catch (err) {
        // ignore errors on unreadable/permission-restricted files
      }
    };

    calculate(targetPath);

    res.json({
      path: targetPath,
      size: totalSize,
      fileCount,
      folderCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// App detection helpers
const fileExists = (filePath) => {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};

const getShellApps = () => {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\tiend';
  const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData\\Local');
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  // 1. VS Code paths
  const vsCodePaths = [
    path.join(localAppData, 'Programs\\Microsoft VS Code\\Code.exe'),
    path.join(localAppData, 'Programs\\Microsoft VS Code\\bin\\code.cmd'),
    path.join(programFiles, 'Microsoft VS Code\\Code.exe'),
    path.join(programFiles, 'Microsoft VS Code\\bin\\code.cmd'),
  ];
  let vscodePath = '';
  for (const p of vsCodePaths) {
    if (fileExists(p)) {
      vscodePath = p;
      break;
    }
  }

  // 2. WinRAR paths
  const winrarPaths = [
    path.join(programFiles, 'WinRAR\\WinRAR.exe'),
    path.join(programFilesX86, 'WinRAR\\WinRAR.exe')
  ];
  let winrarPath = '';
  for (const p of winrarPaths) {
    if (fileExists(p)) {
      winrarPath = p;
      break;
    }
  }

  // 3. Antigravity paths
  const antigravityPaths = [
    path.join(localAppData, 'Programs\\Antigravity IDE\\Antigravity IDE.exe'),
    path.join(localAppData, 'Programs\\Antigravity\\Antigravity.exe'),
    path.join(programFiles, 'Antigravity IDE\\Antigravity IDE.exe'),
    path.join(programFiles, 'Antigravity\\Antigravity.exe')
  ];
  let antigravityPath = '';
  for (const p of antigravityPaths) {
    if (fileExists(p)) {
      antigravityPath = p;
      break;
    }
  }

  // 4. Windows Terminal paths
  const wtPaths = [
    path.join(localAppData, 'Microsoft\\WindowsApps\\wt.exe'),
    'C:\\Windows\\System32\\wt.exe'
  ];
  let wtPath = '';
  for (const p of wtPaths) {
    if (fileExists(p)) {
      wtPath = p;
      break;
    }
  }

  return {
    terminal: { available: true, path: wtPath || 'powershell' },
    vscode: { available: vscodePath !== '', path: vscodePath },
    antigravity: { available: antigravityPath !== '', path: antigravityPath },
    winrar: { available: winrarPath !== '', path: winrarPath }
  };
};

// 17. Get Shell Apps (availability of VS Code, WinRAR, Antigravity, Terminal)
app.get('/api/shell-apps', (req, res) => {
  try {
    const apps = getShellApps();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17.5 Get Dynamic Context Menu from Registry
app.get('/api/context-menu', (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) {
    return res.status(400).json({ error: 'Missing path' });
  }
  
  getContextMenu(targetPath, async (err, items) => {
    if (err) {
      console.error('Context menu error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Process icons using Electron's getFileIcon if available
    const processedItems = [];
    try {
      for (const item of items) {
        let iconBase64 = null;
        let iconPath = item.icon || item.Icon;
        const cmd = item.command || item.Command;
        const name = item.name || item.Name || '';
        const id = item.id || item.Id;
        
        // If no icon explicitly set, try to use the executable from the command
        if (!iconPath && cmd) {
          const match = cmd.match(/"([^"]+\.exe)"/i) || cmd.match(/([^ ]+\.exe)/i);
          if (match) {
            iconPath = match[1];
          }
        }
        
        // Clean up icon path (e.g., C:\path\icon.ico,0 -> C:\path\icon.ico)
        if (iconPath && typeof iconPath === 'string') {
          const commaIdx = iconPath.lastIndexOf(',');
          if (commaIdx !== -1) {
            iconPath = iconPath.substring(0, commaIdx);
          }
          iconPath = iconPath.replace(/"/g, '').trim();
        }

        if (isElectronApp && iconPath && fs.existsSync(iconPath)) {
          try {
            const { app } = require('electron');
            const icon = await app.getFileIcon(iconPath, { size: 'normal' });
            iconBase64 = icon.toDataURL();
          } catch (e) {
            // Ignore
          }
        }
        
        processedItems.push({
          id: id,
          name: typeof name === 'string' ? name.replace(/&/g, '') : String(name), // Remove Windows accelerator ampersands
          icon: iconBase64,
          command: cmd
        });
      }
      res.json(processedItems);
    } catch (processErr) {
      console.error('Error processing context menu items:', processErr);
      res.status(500).json({ error: processErr.message });
    }
  });
});

// 18. Open With / Shell launch
app.post('/api/open-with', (req, res) => {
  const { app: appName, action, targetPath, terminalType = 'auto' } = req.body;
  if (!appName || !targetPath) {
    return res.status(400).json({ error: 'Missing app or targetPath' });
  }

  const apps = getShellApps();
  let cmd = '';

  if (appName === 'terminal') {
    // Open terminal inside the target folder. If targetPath is a file, open in parent folder.
    let dirPath = targetPath;
    try {
      const stats = fs.statSync(targetPath);
      if (!stats.isDirectory()) {
        dirPath = path.dirname(targetPath);
      }
    } catch (e) {}

    // Determine target terminal executable
    let chosenTerminal = terminalType;
    if (chosenTerminal === 'auto') {
      // If auto, use wt if it was detected, otherwise fallback to the path detected by getShellApps
      if (apps.terminal.path && apps.terminal.path !== 'cmd' && apps.terminal.path !== 'powershell') {
        chosenTerminal = 'wt';
      } else {
        chosenTerminal = apps.terminal.path;
      }
    }

    if (chosenTerminal === 'powershell') {
      cmd = `start powershell -NoExit -Command "cd -LiteralPath '${dirPath.replace(/'/g, "''")}'"`;
    } else if (chosenTerminal === 'cmd') {
      cmd = `start cmd /k "cd /d ${dirPath}"`;
    } else {
      // Use spawn with a clean environment to ensure Windows Terminal loads the user's default profile
      // correctly without inheriting node/electron variables that break python/PowerShell configs.
      const { spawn } = require('child_process');
      const cleanEnv = { ...process.env };
      Object.keys(cleanEnv).forEach(k => {
        if (k.startsWith('npm_') || k.startsWith('NODE_') || k.startsWith('VSCODE_') || 
            k === 'TERM_PROGRAM' || k === 'TERM_PROGRAM_VERSION' || k === 'INIT_CWD') {
          delete cleanEnv[k];
        }
      });
      
      const p = spawn('wt.exe', ['-d', dirPath, 'powershell'], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        env: cleanEnv
      });
      p.unref();
      console.log(`Spawned wt.exe detached in ${dirPath}`);
      return res.json({ success: true });
    }
  } else if (appName === 'vscode') {
    const execPath = apps.vscode.available ? `"${apps.vscode.path}"` : 'code';
    cmd = `start "" ${execPath} "${targetPath}"`;
  } else if (appName === 'antigravity') {
    if (!apps.antigravity.available) {
      return res.status(400).json({ error: 'Antigravity IDE is not installed.' });
    }
    cmd = `start "" "${apps.antigravity.path}" "${targetPath}"`;
  } else if (appName === 'winrar') {
    if (!apps.winrar.available) {
      return res.status(400).json({ error: 'WinRAR is not installed.' });
    }
    const winrarExe = `"${apps.winrar.path}"`;

    if (action === 'open') {
      cmd = `start "" ${winrarExe} "${targetPath}"`;
    } else if (action === 'compress') {
      const parentDir = path.dirname(targetPath);
      const baseName = path.basename(targetPath);
      const ext = path.extname(targetPath);
      const baseNameWithoutExt = ext ? path.basename(targetPath, ext) : baseName;
      const rarPath = path.join(parentDir, `${baseNameWithoutExt}.rar`);
      cmd = `start "" ${winrarExe} a -r "${rarPath}" "${targetPath}"`;
    } else if (action === 'extract-here') {
      const parentDir = path.dirname(targetPath);
      cmd = `start "" ${winrarExe} x "${targetPath}" "${parentDir}\\"`;
    } else if (action === 'extract-to') {
      const parentDir = path.dirname(targetPath);
      const baseName = path.basename(targetPath);
      const ext = path.extname(targetPath);
      const baseNameWithoutExt = ext ? path.basename(targetPath, ext) : baseName;
      const destDir = path.join(parentDir, baseNameWithoutExt);
      cmd = `start "" ${winrarExe} x "${targetPath}" "${destDir}\\"`;
    } else {
      return res.status(400).json({ error: 'Unknown WinRAR action' });
    }
  } else if (appName === 'dynamic') {
    const { dynamicCommand } = req.body;
    if (!dynamicCommand) {
      return res.status(400).json({ error: 'Missing dynamicCommand' });
    }
    // Replace %1 or "%1" with the targetPath. Note: command usually has "%1"
    let finalCmd = dynamicCommand.replace(/"%1"/g, `"${targetPath}"`);
    finalCmd = finalCmd.replace(/%1/g, `"${targetPath}"`);
    cmd = `start "" ${finalCmd}`;
  } else {
    return res.status(400).json({ error: 'Unknown app name' });
  }

  console.log(`Executing open-with command: ${cmd}`);

  exec(cmd, (error) => {
    if (error) {
      console.error('Failed to run shell-app command:', error);
      return res.status(500).json({ error: `Failed to execute: ${error.message}` });
    }
    res.json({ success: true });
  });
});

// Catch-all: serve static frontend if build exists
const buildPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const openProductionBrowser = () => {
  const isElectron = process.versions.electron !== undefined;
  if (isElectron || (process.pkg === undefined && process.env.NODE_ENV !== 'production')) {
    return;
  }

  const url = `http://localhost:${PORT}`;
  let startCmd = '';

  if (process.platform === 'win32') {
    startCmd = `start msedge --app=${url}`;
  } else if (process.platform === 'darwin') {
    startCmd = `open -a "Google Chrome" --args --app=${url} || open ${url}`;
  } else {
    startCmd = `google-chrome --app=${url} || xdg-open ${url}`;
  }

  exec(startCmd, (err) => {
    if (err) {
      console.warn('Failed to open in app mode. Falling back to default browser.', err);
      const fallbackCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
      exec(fallbackCmd);
    }
  });
};

const startServer = () => {
  return app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    openProductionBrowser();
  });
};

module.exports = { app, startServer, taskManager };
