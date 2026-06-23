const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startDrag: (files) => ipcRenderer.send('ondragstart', files)
});
