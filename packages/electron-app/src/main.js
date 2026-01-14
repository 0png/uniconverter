const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')

// 在載入其他模組之前，先處理命令列參數
// 這可以防止 Electron 嘗試將檔案路徑當作模組載入
const launchArgs = process.argv.slice()

const { processAction } = require('@uniconvert/converters')
const { initAutoUpdater } = require('./updater')
const { initDiscordRPC, updatePresence, destroyDiscordRPC, setDiscordRPCEnabled, getDiscordRPCStatus } = require('./discord-rpc')
const historyManager = require('./historyManager')
const contextMenuManager = require('./contextMenuManager')
const { parseFileArguments } = require('./fileArgParser')

let win
let pendingFiles = [] // 儲存待處理的檔案（從命令列或第二實例傳入）

// 單一實例鎖定
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果無法取得鎖定，表示已有另一個實例在運行
  // 退出此實例（檔案參數會透過 second-instance 事件傳遞給第一個實例）
  app.quit()
} else {
  // 監聽第二實例啟動事件
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[SingleInstance] Second instance detected, commandLine:', commandLine)
    
    // 解析檔案參數
    const { files } = parseFileArguments(commandLine)
    
    if (files.length > 0 && win) {
      // 將檔案發送到前端
      win.webContents.send('files-from-args', files)
      
      // 將視窗帶到前景
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow() {
  // 計算根目錄路徑（從 packages/electron-app/src 往上三層）
  const rootDir = path.join(__dirname, '..', '..', '..')
  
  win = new BrowserWindow({
    width: 1000,
    height: 650,
    title: 'Uniconvert',
    icon: path.join(rootDir, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 允許在 renderer 中存取 File.path
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', '..', '..', 'web_dist', 'index.html'))
  }
  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)
  
  // 初始化自動更新
  initAutoUpdater(win)
  
  // 初始化 Discord RPC
  initDiscordRPC()
  
  // 視窗載入完成後，發送待處理的檔案
  win.webContents.on('did-finish-load', () => {
    // 解析啟動時的命令列參數（使用保存的 launchArgs）
    const { files } = parseFileArguments(launchArgs)
    if (files.length > 0) {
      console.log('[Main] Sending files from startup args:', files.length)
      win.webContents.send('files-from-args', files)
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  destroyDiscordRPC()
  if (process.platform !== 'darwin') app.quit()
})
// App Info IPC handler
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
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
ipcMain.handle('open-external', async (e, url) => {
  try {
    await shell.openExternal(url)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
ipcMain.handle('do-action', async (e, payload) => {
  try {
    console.log('[do-action] Starting:', payload.action, 'Files:', payload.files?.length || 0)
    
    // 更新 Discord 狀態為轉換中
    updatePresence('converting', `${payload.action} - ${payload.files?.length || 0} 個檔案`)
    
    const data = await processAction(payload.action, payload.files || [], payload.output_dir || null)
    console.log('[do-action] Result:', JSON.stringify(data))
    
    // 更新 Discord 狀態為完成或錯誤
    if (data.fail === 0) {
      updatePresence('completed', `${data.ok} 個檔案轉換成功`)
    } else if (data.ok > 0) {
      updatePresence('completed', `${data.ok} 成功, ${data.fail} 失敗`)
    } else {
      updatePresence('error', '轉換失敗')
    }
    
    // 5 秒後恢復閒置狀態
    setTimeout(() => updatePresence('idle'), 5000)
    
    // 記錄歷史（每個成功轉換的檔案）
    if (data.ok > 0 && payload.files?.length > 0) {
      const fileType = getFileTypeFromAction(payload.action)
      const outputDir = payload.output_dir || path.dirname(payload.files[0])
      
      // 為每個檔案建立歷史記錄
      for (const filePath of payload.files) {
        const fileName = path.basename(filePath)
        const outputExt = getOutputExtFromAction(payload.action)
        const outputFile = path.join(outputDir, fileName.replace(/\.[^.]+$/, `.${outputExt}`))
        
        try {
          await historyManager.addEntry({
            sourceFile: filePath,
            outputFile: outputFile,
            conversionType: payload.action,
            fileType: fileType,
            status: 'success'
          })
        } catch (historyErr) {
          console.error('[do-action] Failed to add history entry:', historyErr)
        }
      }
    }
    
    return { ok: true, data }
  } catch (err) {
    console.error('[do-action] Error:', err)
    updatePresence('error', err.message)
    setTimeout(() => updatePresence('idle'), 5000)
    return { ok: false, error: String(err && err.message ? err.message : err), stack: err?.stack }
  }
})

/**
 * 根據 action 判斷檔案類型
 */
function getFileTypeFromAction(action) {
  if (action.includes('PNG') || action.includes('JPG') || action.includes('WEBP') || 
      action.includes('ICO') || action.includes('BMP') || action.includes('GIF') || 
      action.includes('TIFF') || action === '合併圖片為PDF') {
    return 'image'
  }
  if (action.includes('MP4') || action.includes('MOV') || action === '批量轉/提取MP3') {
    return 'video'
  }
  if (action.includes('MP3') || action.includes('WAV') || action.includes('M4A')) {
    // 區分音訊轉換和影片提取音訊
    if (action === '批量轉/提取MP3') return 'video'
    return 'audio'
  }
  if (action.includes('PDF每頁')) {
    return 'document'
  }
  if (action.includes('Markdown')) {
    return 'markdown'
  }
  return 'image'
}

/**
 * 根據 action 取得輸出副檔名
 */
function getOutputExtFromAction(action) {
  if (action.includes('PNG') || action === 'PDF每頁轉PNG') return 'png'
  if (action.includes('JPG') || action === 'PDF每頁轉JPG') return 'jpg'
  if (action.includes('WEBP')) return 'webp'
  if (action.includes('ICO')) return 'ico'
  if (action.includes('BMP')) return 'bmp'
  if (action.includes('GIF')) return 'gif'
  if (action.includes('TIFF')) return 'tiff'
  if (action.includes('MP4')) return 'mp4'
  if (action.includes('MOV')) return 'mov'
  if (action.includes('MP3')) return 'mp3'
  if (action.includes('WAV')) return 'wav'
  if (action.includes('M4A')) return 'm4a'
  if (action === '合併圖片為PDF' || action.includes('Markdown')) return 'pdf'
  return 'out'
}


// Discord RPC IPC handlers
ipcMain.handle('discord:set-enabled', async (e, enabled) => {
  return await setDiscordRPCEnabled(enabled)
})

ipcMain.handle('discord:get-status', async () => {
  return getDiscordRPCStatus()
})

// History IPC handlers
ipcMain.handle('history:get-all', async () => {
  try {
    return { ok: true, data: await historyManager.getAll() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:add', async (e, entry) => {
  try {
    const newEntry = await historyManager.addEntry(entry)
    return { ok: true, data: newEntry }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:remove', async (e, id) => {
  try {
    const result = await historyManager.removeEntry(id)
    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:clear', async () => {
  try {
    await historyManager.clearAll()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:get-counts', async () => {
  try {
    return { ok: true, data: await historyManager.getEntryCounts() }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('history:open-location', async (e, filePath) => {
  const fs = require('fs')
  try {
    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: 'FILE_NOT_FOUND', message: `File not found: ${filePath}` }
    }
    await shell.showItemInFolder(filePath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})


// Context Menu IPC handlers
ipcMain.handle('context-menu:register', async () => {
  try {
    const result = await contextMenuManager.register()
    return result
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('context-menu:unregister', async () => {
  try {
    const result = await contextMenuManager.unregister()
    return result
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('context-menu:is-registered', async () => {
  try {
    const registered = await contextMenuManager.isRegistered()
    return { ok: true, registered }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
