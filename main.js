const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const { processAction } = require('./converters')
const { initAutoUpdater } = require('./updater')

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 650,
    title: 'Uniconvert',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, 'web_dist', 'index.html'))
  }
  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)
  
  // 初始化自動更新（僅在打包後的環境中啟用）
  if (!process.env.VITE_DEV_SERVER_URL) {
    initAutoUpdater(win)
  }
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
ipcMain.handle('open-folder', async (e, folderPath) => {
  try {
    await shell.openPath(folderPath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
ipcMain.handle('do-action', async (e, payload) => {
  try {
    console.log('[do-action] Starting:', payload.action, 'Files:', payload.files?.length || 0)
    const data = await processAction(payload.action, payload.files || [], payload.output_dir || null)
    console.log('[do-action] Result:', JSON.stringify(data))
    return { ok: true, data }
  } catch (err) {
    console.error('[do-action] Error:', err)
    return { ok: false, error: String(err && err.message ? err.message : err), stack: err?.stack }
  }
})
