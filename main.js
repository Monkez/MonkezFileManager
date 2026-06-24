const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Start Express backend directly in the main process
require('./backend/server.js');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "Monkez File Manager",
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true, // Hide default file/edit menu bar for a clean native app look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open the local server URL
  mainWindow.loadURL('http://localhost:3001');

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
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Give the Express server a tiny moment (500ms) to start listening
    setTimeout(createWindow, 500);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Native file drag-out support
ipcMain.on('ondragstart', (event, files) => {
  const fs = require('fs');
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
