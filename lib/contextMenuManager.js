/**
 * Context Menu Manager - Windows 右鍵選單整合模組
 * 負責註冊和移除 Windows 檔案總管右鍵選單
 */

const { app } = require('electron')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

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

// 註冊表路徑
const REGISTRY_KEY = 'HKCU\\Software\\Classes'
const MENU_NAME = 'Open with Uniconvert'
const MENU_ID = 'Uniconvert.OpenWith'

/**
 * 取得應用程式執行檔路徑
 * @returns {string}
 */
function getExePath() {
  // 在打包環境中使用 app.getPath('exe')
  // 在開發環境中使用 process.execPath
  if (app.isPackaged) {
    return app.getPath('exe')
  }
  return process.execPath
}

/**
 * 執行 reg 命令
 * @param {string} command
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function runRegCommand(command) {
  try {
    return await execAsync(command, { windowsHide: true })
  } catch (err) {
    // reg query 找不到 key 時會拋出錯誤，這是正常的
    if (err.message?.includes('unable to find')) {
      return { stdout: '', stderr: '' }
    }
    throw err
  }
}

/**
 * 檢查是否已註冊右鍵選單
 * @returns {Promise<boolean>}
 */
async function isRegistered() {
  try {
    // 檢查其中一個副檔名是否已註冊
    const testExt = '.png'
    const { stdout } = await runRegCommand(
      `reg query "${REGISTRY_KEY}\\${testExt}\\shell\\${MENU_ID}" /ve 2>nul`
    )
    return stdout.includes(MENU_NAME)
  } catch (err) {
    console.error('[ContextMenuManager] isRegistered error:', err)
    return false
  }
}


/**
 * 註冊右鍵選單
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function register() {
  try {
    const exePath = getExePath()
    const iconPath = exePath // 使用 exe 本身的圖示
    
    // 為每個支援的副檔名註冊右鍵選單
    for (const ext of ALL_EXTENSIONS) {
      // 建立 shell 命令
      const shellKey = `${REGISTRY_KEY}\\${ext}\\shell\\${MENU_ID}`
      const commandKey = `${shellKey}\\command`
      
      // 註冊選單項目
      await runRegCommand(`reg add "${shellKey}" /ve /d "${MENU_NAME}" /f`)
      await runRegCommand(`reg add "${shellKey}" /v "Icon" /d "${exePath},0" /f`)
      
      // 註冊命令（%1 是檔案路徑）
      const command = `"${exePath}" "%1"`
      await runRegCommand(`reg add "${commandKey}" /ve /d "${command}" /f`)
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
    // 為每個支援的副檔名移除右鍵選單
    for (const ext of ALL_EXTENSIONS) {
      const shellKey = `${REGISTRY_KEY}\\${ext}\\shell\\${MENU_ID}`
      
      // 刪除整個 key（包含子 key）
      await runRegCommand(`reg delete "${shellKey}" /f 2>nul`)
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
