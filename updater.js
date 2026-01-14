/**
 * Electron Auto Updater 模組
 * 負責檢查、下載和安裝來自 GitHub Releases 的更新
 */

const { autoUpdater } = require('electron-updater')
const { ipcMain } = require('electron')

// IPC 頻道常數
const UPDATE_CHANNELS = {
  // Main -> Renderer (events)
  STATUS: 'update:status',
  PROGRESS: 'update:progress',
  ERROR: 'update:error',
  
  // Renderer -> Main (commands)
  CHECK: 'update:check',
  DOWNLOAD: 'update:download',
  INSTALL: 'update:install'
}

// 更新狀態類型
const UPDATE_STATUS = {
  CHECKING: 'checking',
  AVAILABLE: 'available',
  NOT_AVAILABLE: 'not-available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error'
}

let mainWindow = null
let updateSkipped = false

/**
 * 初始化自動更新器
 * @param {BrowserWindow} win - 主視窗實例
 */
function initAutoUpdater(win) {
  mainWindow = win
  
  // 配置更新器
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  
  // 設定事件監聽器
  setupEventListeners()
  
  // 設定 IPC 處理器
  setupIpcHandlers()
  
  // 啟動時檢查更新（延遲 3 秒，避免阻塞啟動）
  setTimeout(() => {
    if (!updateSkipped) {
      checkForUpdates()
    }
  }, 3000)
}

/**
 * 設定 autoUpdater 事件監聽器
 */
function setupEventListeners() {
  // 正在檢查更新
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] 正在檢查更新...')
    sendStatusToRenderer(UPDATE_STATUS.CHECKING)
  })
  
  // 有可用更新
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 發現新版本:', info.version)
    sendStatusToRenderer(UPDATE_STATUS.AVAILABLE, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })
  
  // 沒有可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 已是最新版本:', info.version)
    sendStatusToRenderer(UPDATE_STATUS.NOT_AVAILABLE, {
      version: info.version
    })
  })
  
  // 下載進度
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] 下載進度: ${progress.percent.toFixed(1)}%`)
    mainWindow?.webContents.send(UPDATE_CHANNELS.PROGRESS, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })
  
  // 下載完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 更新下載完成:', info.version)
    sendStatusToRenderer(UPDATE_STATUS.DOWNLOADED, {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })
  
  // 錯誤處理
  autoUpdater.on('error', (error) => {
    console.error('[Updater] 錯誤:', error.message)
    
    // 網路錯誤靜默失敗
    if (error.message.includes('net::') || error.message.includes('ENOTFOUND')) {
      console.log('[Updater] 網路錯誤，靜默處理')
      return
    }
    
    sendStatusToRenderer(UPDATE_STATUS.ERROR, {
      message: error.message
    })
  })
}

/**
 * 設定 IPC 處理器
 */
function setupIpcHandlers() {
  // 手動檢查更新
  ipcMain.handle(UPDATE_CHANNELS.CHECK, async () => {
    try {
      const result = await checkForUpdates()
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  })
  
  // 下載更新
  ipcMain.handle(UPDATE_CHANNELS.DOWNLOAD, async () => {
    try {
      sendStatusToRenderer(UPDATE_STATUS.DOWNLOADING)
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  })
  
  // 安裝更新並重啟
  ipcMain.handle(UPDATE_CHANNELS.INSTALL, () => {
    autoUpdater.quitAndInstall(true, true)
  })
}

/**
 * 檢查更新
 * @returns {Promise<UpdateCheckResult>}
 */
async function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}

/**
 * 發送狀態到渲染進程
 * @param {string} status - 狀態類型
 * @param {object} data - 附加資料
 */
function sendStatusToRenderer(status, data = {}) {
  mainWindow?.webContents.send(UPDATE_CHANNELS.STATUS, {
    status,
    ...data
  })
}

/**
 * 設定跳過更新標記
 * @param {boolean} skipped
 */
function setUpdateSkipped(skipped) {
  updateSkipped = skipped
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  setUpdateSkipped,
  UPDATE_CHANNELS,
  UPDATE_STATUS
}
