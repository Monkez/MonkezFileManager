const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Disable GPU rasterization to fix blurry font rendering on Windows
app.commandLine.appendSwitch('disable-gpu-rasterization');


let mainWindow = null;

const getLaunchTargetPath = (args) => {
  for (let i = args.length - 1; i >= 0; i -= 1) {
    const arg = args[i];
    if (
      typeof arg !== 'string'
      || arg.startsWith('--')
      || arg === '.'
      || arg.endsWith('.js')
      || arg === process.execPath
    ) {
      continue;
    }

    try {
      if (fs.existsSync(arg)) {
        return arg;
      }
    } catch (err) {
      // Ignore invalid shell arguments and keep scanning.
    }
  }
  return '';
};

const makeAppUrl = (targetPath = '') => {
  const url = new URL('http://localhost:3001');
  if (targetPath) {
    url.searchParams.set('path', targetPath);
  }
  return url.toString();
};

const navigateWindowToPath = (targetPath) => {
  if (!mainWindow || !targetPath) return;
  mainWindow.loadURL(makeAppUrl(targetPath));
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "Monkez File Manager",
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true, // Hide default file/edit menu bar for a clean native app look
    backgroundColor: '#0b0f19', // Fix blurry fonts on Windows by forcing subpixel antialiasing
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open the local server URL
  mainWindow.loadURL(makeAppUrl(getLaunchTargetPath(process.argv)));

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost:3001')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.exit(0);
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      navigateWindowToPath(getLaunchTargetPath(commandLine));
    }
  });

  app.whenReady().then(() => {
    // Start Express backend only for the primary instance
    require('./backend/server.js');
    // Give the Express server a tiny moment (500ms) to start listening
    setTimeout(createWindow, 500);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Ensure background Node.js handles (like Express server) are terminated
  process.exit(0);
});

// Native file drag-out support
ipcMain.on('ondragstart', (event, files) => {
  const { nativeImage } = require('electron');
  let isDirectory = false;
  try {
    const targetFile = Array.isArray(files) ? files[0] : files;
    if (targetFile && fs.existsSync(targetFile)) {
      isDirectory = fs.statSync(targetFile).isDirectory();
    }
  } catch (err) {
    console.error(err);
  }

  const iconName = isDirectory ? 'drag_folder.png' : 'drag_file.png';
  let iconPath = path.join(__dirname, iconName);

  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'icon.png');
  }

  let dragIcon = nativeImage.createFromPath(iconPath);
  if (dragIcon.isEmpty()) {
    dragIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  }

  if (Array.isArray(files)) {
    event.sender.startDrag({
      files: files,
      icon: dragIcon
    });
  } else {
    event.sender.startDrag({
      file: files,
      icon: dragIcon
    });
  }
});
