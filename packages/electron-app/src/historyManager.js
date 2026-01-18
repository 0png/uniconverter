/**
 * History Manager - 轉換歷史記錄管理模組
 * 負責讀寫和管理轉換歷史記錄
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id - 唯一識別碼 (UUID)
 * @property {string} sourceFile - 來源檔案路徑
 * @property {string} outputFile - 輸出檔案路徑
 * @property {string} conversionType - 轉換類型 (e.g., '批量轉PNG')
 * @property {string} fileType - 檔案類型 (image|video|audio|document|markdown)
 * @property {number} timestamp - 時間戳記 (Unix timestamp)
 * @property {'success'|'failed'} status - 轉換狀態
 */

const MAX_HISTORY_ENTRIES = 100
const HISTORY_FILE = 'conversion-history.json'

/**
 * 取得歷史記錄檔案路徑
 * @returns {string}
 */
function getHistoryFilePath() {
  // 延遲載入 electron app，避免在測試環境中出錯
  const { app } = require('electron')
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, HISTORY_FILE)
}

/**
 * 讀取歷史記錄
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry[]>}
 */
async function readHistory(filePath) {
  try {
    const targetPath = filePath || getHistoryFilePath()
    if (!fs.existsSync(targetPath)) {
      return []
    }
    const content = await fs.promises.readFile(targetPath, 'utf-8')
    const data = JSON.parse(content)
    
    // 驗證資料格式
    if (!data || !Array.isArray(data.entries)) {
      console.warn('[HistoryManager] Invalid history format, resetting')
      return []
    }
    
    return data.entries
  } catch (err) {
    console.error('[HistoryManager] Failed to read history:', err)
    return []
  }
}

/**
 * 寫入歷史記錄
 * @param {HistoryEntry[]} entries
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<void>}
 */
async function writeHistory(entries, filePath) {
  const targetPath = filePath || getHistoryFilePath()
  const data = {
    version: 1,
    entries: entries
  }
  try {
    await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[HistoryManager] Failed to write history:', err.message)
    throw new Error(`Failed to write history file: ${err.message}`)
  }
}

/**
 * 新增歷史記錄
 * @param {Omit<HistoryEntry, 'id' | 'timestamp'>} entry
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry>}
 */
async function addEntry(entry, filePath) {
  const entries = await readHistory(filePath)
  
  const newEntry = {
    id: crypto.randomUUID(),
    sourceFile: entry.sourceFile,
    outputFile: entry.outputFile,
    conversionType: entry.conversionType,
    fileType: entry.fileType,
    timestamp: Date.now(),
    status: entry.status
  }
  
  // 新記錄加到最前面
  entries.unshift(newEntry)
  
  // 限制最多 100 筆
  if (entries.length > MAX_HISTORY_ENTRIES) {
    entries.splice(MAX_HISTORY_ENTRIES)
  }
  
  await writeHistory(entries, filePath)
  return newEntry
}

/**
 * 刪除單筆歷史記錄
 * @param {string} id
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<boolean>}
 */
async function removeEntry(id, filePath) {
  const entries = await readHistory(filePath)
  const index = entries.findIndex(e => e.id === id)
  
  if (index === -1) {
    return false
  }
  
  entries.splice(index, 1)
  await writeHistory(entries, filePath)
  return true
}

/**
 * 清除所有歷史記錄
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<void>}
 */
async function clearAll(filePath) {
  await writeHistory([], filePath)
}

/**
 * 取得所有歷史記錄
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry[]>}
 */
async function getAll(filePath) {
  return await readHistory(filePath)
}

/**
 * 按類型篩選歷史記錄
 * @param {string} fileType - 檔案類型 (image|video|audio|document|markdown)
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry[]>}
 */
async function filterByType(fileType, filePath) {
  const entries = await readHistory(filePath)
  return entries.filter(e => e.fileType === fileType)
}

/**
 * 取得各類型的記錄數量
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<{all: number, image: number, video: number, audio: number, document: number, markdown: number}>}
 */
async function getEntryCounts(filePath) {
  const entries = await readHistory(filePath)
  
  const counts = {
    all: entries.length,
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    markdown: 0
  }
  
  for (const entry of entries) {
    if (Object.prototype.hasOwnProperty.call(counts, entry.fileType)) {
      counts[entry.fileType]++
    }
  }
  
  return counts
}

module.exports = {
  MAX_HISTORY_ENTRIES,
  getHistoryFilePath,
  readHistory,
  writeHistory,
  addEntry,
  removeEntry,
  clearAll,
  getAll,
  filterByType,
  getEntryCounts
}
