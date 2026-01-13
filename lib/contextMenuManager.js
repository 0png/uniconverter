/**
 * Context Menu Manager - Windows 右鍵選單整合模組
 * 負責註冊和移除 Windows 檔案總管右鍵選單
 */

const { app } = require('electron')

// 支援的副檔名
const SUPPORTED_EXTENSIONS = {
  image: ['.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp', '.bmp', '.gif', '.tiff', '.tif', '.ico'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  audio: ['.mp3', '.wav', '.m4a', '.flac', '.ogg'],
  document: ['.pdf'],
  markdown: ['.md', '.markdown']
}

// 取得所有支援的副檔名
const ALL_EXTENSIONS = Object.values(SUPPORTED_EXTENSIONS).flat()

const MENU_NAME = 'Open with Uniconvert'
const MENU_ID = 'Uniconvert.OpenWith'

/**
 * 取得應用程式執行檔路徑
 * @returns {string}
 */
function getExePath() {
  if (app.isPackaged) {
    return app.getPath('exe')
  }
  return process.execPath
}

/**
 * 取得圖示路徑
 * @returns {string}
 */
function getIconPath() {
  if (app.isPackaged) {
    // 打包後使用 exe 本身的圖示
    return app.getPath('exe')
  }
  // 開發環境使用 build/icon.ico
  const path = require('path')
  return path.join(__dirname, '..', 'build', 'icon.ico')
}

/**
 * 執行 reg 命令
 * @param {string[]} args - reg 命令的參數陣列
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
async function runRegCommand(args) {
  const { spawn } = require('child_process')
  
  return new Promise((resolve, reject) => {
    const proc = spawn('reg', args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    
    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })
    
    proc.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
    
    proc.on('error', reject)
  })
}

/**
 * 檢查是否已註冊右鍵選單
 * @returns {Promise<boolean>}
 */
async function isRegistered() {
  try {
    // 檢查 * (所有檔案) 的 shell 是否已註冊
    const keyPath = `HKCU\\Software\\Classes\\*\\shell\\${MENU_ID}`
    const result = await runRegCommand(['query', keyPath, '/ve'])
    return result.code === 0 && result.stdout.includes(MENU_NAME)
  } catch (err) {
    return false
  }
}

/**
 * 註冊右鍵選單 - 對所有檔案類型
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function register() {
  try {
    const exePath = getExePath()
    const iconPath = getIconPath()
    
    // 使用 * 對所有檔案類型註冊
    const shellKey = `HKCU\\Software\\Classes\\*\\shell\\${MENU_ID}`
    const commandKey = `${shellKey}\\command`
    
    // 註冊選單項目名稱
    let result = await runRegCommand(['add', shellKey, '/ve', '/t', 'REG_SZ', '/d', MENU_NAME, '/f'])
    if (result.code !== 0) {
      return { success: false, error: `Failed to add menu: ${result.stderr}` }
    }
    
    // 註冊圖示
    await runRegCommand(['add', shellKey, '/v', 'Icon', '/t', 'REG_SZ', '/d', `"${iconPath}"`, '/f'])
    
    // 註冊命令 - 使用 -- 分隔 Electron 參數和檔案路徑
    // 這可以防止 Electron 將檔案路徑當作模組載入
    const command = `"${exePath}" -- "%1"`
    result = await runRegCommand(['add', commandKey, '/ve', '/t', 'REG_SZ', '/d', command, '/f'])
    if (result.code !== 0) {
      return { success: false, error: `Failed to add command: ${result.stderr}` }
    }
    
    console.log('[ContextMenuManager] Successfully registered context menu')
    return { success: true }
  } catch (err) {
    console.error('[ContextMenuManager] register error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 移除右鍵選單
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function unregister() {
  try {
    const shellKey = `HKCU\\Software\\Classes\\*\\shell\\${MENU_ID}`
    await runRegCommand(['delete', shellKey, '/f'])
    
    // 也清理舊的註冊（如果有的話）
    for (const ext of ALL_EXTENSIONS) {
      const oldKey = `HKCU\\Software\\Classes\\${ext}\\shell\\${MENU_ID}`
      await runRegCommand(['delete', oldKey, '/f'])
      
      const sysKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${MENU_ID}`
      await runRegCommand(['delete', sysKey, '/f'])
    }
    
    console.log('[ContextMenuManager] Successfully unregistered context menu')
    return { success: true }
  } catch (err) {
    console.error('[ContextMenuManager] unregister error:', err)
    return { success: false, error: err.message }
  }
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  ALL_EXTENSIONS,
  isRegistered,
  register,
  unregister
}
