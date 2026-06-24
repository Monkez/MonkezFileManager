const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

  targetPath = path.resolve(targetPath);

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

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Path is not a directory: ${targetPath}` });
    }

    const rawItems = fs.readdirSync(targetPath, { withFileTypes: true });
    const files = [];
    const folders = [];

    for (const item of rawItems) {
      const itemPath = path.join(targetPath, item.name);
      const isDir = item.isDirectory();
      const stats = getFileStats(itemPath);

      const fileObj = {
        name: item.name,
        path: itemPath,
        isDirectory: isDir,
        size: stats.size,
        mtime: stats.mtime,
        ext: isDir ? '' : path.extname(item.name).toLowerCase(),
        isHidden: item.name.startsWith('.') || item.name.startsWith('$'),
        icon: null
      };

      if (isDir) {
        folders.push(fileObj);
      } else {
        files.push(fileObj);
      }
    }

    // Fetch icons for all files concurrently
    await Promise.all(files.map(fetchItemIcon));

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

// 3. Create folder
app.post('/api/mkdir', (req, res) => {
  const { currentPath, name } = req.body;
  if (!currentPath || !name) {
    return res.status(400).json({ error: 'Missing currentPath or name' });
  }

  const targetPath = path.join(currentPath, name);
  try {
    if (fs.existsSync(targetPath)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }
    fs.mkdirSync(targetPath);
    res.json({ success: true, path: targetPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Create blank file
app.post('/api/mkfile', (req, res) => {
  const { currentPath, name } = req.body;
  if (!currentPath || !name) {
    return res.status(400).json({ error: 'Missing currentPath or name' });
  }

  const targetPath = path.join(currentPath, name);
  try {
    if (fs.existsSync(targetPath)) {
      return res.status(400).json({ error: 'File already exists' });
    }
    fs.writeFileSync(targetPath, '');
    res.json({ success: true, path: targetPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Rename item
app.post('/api/rename', (req, res) => {
  const { currentPath, oldName, newName } = req.body;
  if (!currentPath || !oldName || !newName) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const oldPath = path.join(currentPath, oldName);
  const newPath = path.join(currentPath, newName);

  try {
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Source file/folder does not exist' });
    }
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'Destination already exists' });
    }
    fs.renameSync(oldPath, newPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete file/folder
app.post('/api/delete', (req, res) => {
  const { paths } = req.body; // Expects array of paths
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: 'Paths must be an array' });
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

// 7. Copy file/folder
app.post('/api/copy', (req, res) => {
  const { sources, destinationDir } = req.body;
  if (!sources || !Array.isArray(sources) || !destinationDir) {
    return res.status(400).json({ error: 'Missing sources or destinationDir' });
  }

  const errors = [];
  for (const src of sources) {
    try {
      const name = path.basename(src);
      const dest = path.join(destinationDir, name);
      if (src === dest) {
        // Handle copy to same directory: Appending "- Copy"
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        const copyName = `${base} - Copy${ext}`;
        const copyDest = path.join(destinationDir, copyName);
        fs.cpSync(src, copyDest, { recursive: true });
      } else {
        fs.cpSync(src, dest, { recursive: true });
      }
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
  const { sources, destinationDir } = req.body;
  if (!sources || !Array.isArray(sources) || !destinationDir) {
    return res.status(400).json({ error: 'Missing sources or destinationDir' });
  }

  const errors = [];
  for (const src of sources) {
    try {
      const name = path.basename(src);
      const dest = path.join(destinationDir, name);
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
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

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
    res.status(500).json({ error: err.message });
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
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).send('File not found');
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
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
    res.status(500).send(err.message);
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

  const isWin = process.platform === 'win32';
  let cmd = '';
  if (isWin) {
    const formattedSources = sources.map(src => `'${src.replace(/'/g, "''")}'`).join(',');
    cmd = `powershell -Command "Compress-Archive -Path ${formattedSources} -DestinationPath '${destination.replace(/'/g, "''")}' -Force"`;
  } else {
    const formattedSources = sources.map(src => `"${src.replace(/"/g, '\\"')}"`).join(' ');
    cmd = `zip -r "${destination.replace(/"/g, '\\"')}" ${formattedSources}`;
  }

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('ZIP Error:', error, stderr);
      return res.status(500).json({ error: `ZIP failed: ${stderr || error.message}` });
    }
    res.json({ success: true, path: destination });
  });
});

// 13. Extract ZIP
app.post('/api/extract', (req, res) => {
  const { source, targetDir } = req.body;
  if (!source || !targetDir) {
    return res.status(400).json({ error: 'Missing source or targetDir' });
  }

  const isWin = process.platform === 'win32';
  let cmd = '';
  if (isWin) {
    cmd = `powershell -Command "Expand-Archive -Path '${source.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force"`;
  } else {
    cmd = `unzip "${source.replace(/"/g, '\\"')}" -d "${targetDir.replace(/"/g, '\\"')}"`;
  }

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Unzip Error:', error, stderr);
      return res.status(500).json({ error: `Extraction failed: ${stderr || error.message}` });
    }
    res.json({ success: true });
  });
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

  let resolvedPath = path.resolve(targetPath);

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
  const targetPath = req.query.path;
  if (!targetPath) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Automatically open browser in app mode (no address bar/tabs) on Windows/production if NOT in Electron
  const isElectron = process.versions.electron !== undefined;
  if (!isElectron && (process.pkg !== undefined || process.env.NODE_ENV === 'production')) {
    const url = `http://localhost:${PORT}`;
    let startCmd = '';
    
    if (process.platform === 'win32') {
      // Start Edge in Application Mode (no tabs, address bar, or navigation buttons)
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
  }
});
