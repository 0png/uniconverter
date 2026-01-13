/**
 * File Argument Parser - 檔案參數解析模組
 * 負責解析命令列參數中的檔案路徑
 */

const fs = require('fs')
const path = require('path')

// 支援的副檔名（與 contextMenuManager 一致）
const SUPPORTED_EXTENSIONS = [
  // 圖片
  '.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp', '.bmp', '.gif', '.tiff', '.tif', '.ico',
  // 影片
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  // 音訊
  '.mp3', '.wav', '.m4a', '.flac', '.ogg',
  // 文件
  '.pdf',
  // Markdown
  '.md', '.markdown'
]

/**
 * 檢查檔案是否為支援的格式
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupportedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_EXTENSIONS.includes(ext)
}

/**
 * 檢查檔案是否存在
 * @param {string} filePath
 * @returns {boolean}
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * 根據副檔名判斷檔案類型
 * @param {string} filePath
 * @returns {'image' | 'video' | 'audio' | 'document' | 'markdown' | null}
 */
function getFileType(filePath) {
  if (!filePath) return null
  const ext = path.extname(filePath).toLowerCase()
  
  const imageExts = ['.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp', '.bmp', '.gif', '.tiff', '.tif', '.ico']
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
  const audioExts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
  const documentExts = ['.pdf']
  const markdownExts = ['.md', '.markdown']
  
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (documentExts.includes(ext)) return 'document'
  if (markdownExts.includes(ext)) return 'markdown'
  
  return null
}

/**
 * 解析命令列參數中的檔案路徑
 * @param {string[]} argv - process.argv 或類似的參數陣列
 * @returns {{ files: Array<{path: string, name: string, type: string}>, skipped: string[] }}
 */
function parseFileArguments(argv) {
  const files = []
  const skipped = []
  
  if (!argv || !Array.isArray(argv)) {
    return { files, skipped }
  }
  
  // 檢查是否有 --file 參數（開發模式使用）
  const fileArgIndex = argv.indexOf('--file')
  if (fileArgIndex !== -1 && fileArgIndex + 1 < argv.length) {
    const filePath = argv[fileArgIndex + 1]
    if (isSupportedFile(filePath) && fileExists(filePath)) {
      const fileType = getFileType(filePath)
      if (fileType) {
        files.push({
          path: filePath,
          name: path.basename(filePath),
          type: fileType
        })
      }
    } else {
      skipped.push(filePath)
    }
    return { files, skipped }
  }
  
  // 打包模式：直接解析最後一個參數（通常是檔案路徑）
  // 跳過 electron 相關參數
  for (let i = argv.length - 1; i >= 0; i--) {
    const arg = argv[i]
    
    // 跳過選項參數
    if (arg.startsWith('-')) continue
    
    // 跳過 Electron 相關參數
    if (arg.includes('electron') || arg.includes('.asar') || arg === '.') continue
    
    // 檢查是否為有效的檔案路徑
    if (isSupportedFile(arg) && fileExists(arg)) {
      const fileType = getFileType(arg)
      if (fileType) {
        files.push({
          path: arg,
          name: path.basename(arg),
          type: fileType
        })
        break // 只取最後一個有效檔案
      }
    }
  }
  
  return { files, skipped }
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  isSupportedFile,
  fileExists,
  getFileType,
  parseFileArguments
}
