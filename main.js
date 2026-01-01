const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const { processAction } = require('./converters')
let win
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)
}
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
ipcMain.handle('select-files', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] })
  return r.canceled ? [] : r.filePaths
})
ipcMain.handle('select-dir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})
ipcMain.handle('do-action', async (e, payload) => {
  try {
    const data = await processAction(payload.action, payload.files || [], payload.output_dir || null)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) }
  }
})
