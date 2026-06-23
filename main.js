const { app, BrowserWindow } = require('electron');
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
      contextIsolation: true
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

app.whenReady().then(() => {
  // Give the Express server a tiny moment (500ms) to start listening
  setTimeout(createWindow, 500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
