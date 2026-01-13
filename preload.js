const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  doAction: (payload) => ipcRenderer.invoke('do-action', payload),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  openExternal: (url) => shell.openExternal(url),
  
  // 自動更新 API
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (callback) => {
      const handler = (event, data) => callback(data)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    },
    onProgress: (callback) => {
      const handler = (event, data) => callback(data)
      ipcRenderer.on('update:progress', handler)
      return () => ipcRenderer.removeListener('update:progress', handler)
    }
  }
})
