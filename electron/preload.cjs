const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nightwolf', {
    platform: process.platform,
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
    },
});
