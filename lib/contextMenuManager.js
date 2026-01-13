/**
 * Context Menu Manager - Windows 右鍵選單整合模組
 * 負責註冊和移除 Windows 檔案總管右鍵選單
 */

const { app } = require('electron')
const path = require('path')

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
 * @param {string[]} args - reg 命令的參數陣列
 * @returns {Promise<{stdout: string, stderr: string}>}
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
      if (code === 0 || stderr.includes('unable to find')) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`Command failed: reg ${args.join(' ')}\n${stderr}`))
      }
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
    // 檢查其中一個副檔名是否已註冊
    const testExt = '.png'
    const keyPath = `${REGISTRY_KEY}\\${testExt}\\shell\\${MENU_ID}`
    const { stdout } = await runRegCommand(['query', keyPath, '/ve'])
    return stdout.includes(MENU_NAME)
  } catch (err) {
    // 找不到 key 是正常的，表示未註冊
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
    
    // 為每個支援的副檔名註冊右鍵選單
    for (const ext of ALL_EXTENSIONS) {
      const shellKey = `${REGISTRY_KEY}\\${ext}\\shell\\${MENU_ID}`
      const commandKey = `${shellKey}\\command`
      
      // 註冊選單項目名稱
      await runRegCommand(['add', shellKey, '/ve', '/t', 'REG_SZ', '/d', MENU_NAME, '/f'])
      
      // 註冊圖示
      await runRegCommand(['add', shellKey, '/v', 'Icon', '/t', 'REG_SZ', '/d', `${exePath},0`, '/f'])
      
      // 註冊命令（%1 是檔案路徑）
      const command = `"${exePath}" "%1"`
      await runRegCommand(['add', commandKey, '/ve', '/t', 'REG_SZ', '/d', command, '/f'])
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
      try {
        await runRegCommand(['delete', shellKey, '/f'])
      } catch {
        // 忽略刪除失敗（可能本來就不存在）
      }
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
