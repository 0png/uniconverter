const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('api', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  doAction: (payload) => ipcRenderer.invoke('do-action', payload)
})
