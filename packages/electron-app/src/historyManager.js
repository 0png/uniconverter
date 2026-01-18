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

// 寫入佇列：為每個檔案路徑維護獨立的 queue，確保測試隔離
const writeQueues = new Map()

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
 * 寫入歷史記錄（內部函式，不使用佇列）
 * @param {HistoryEntry[]} entries
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<void>}
 */
async function writeHistoryInternal(entries, filePath) {
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
 * 取得指定檔案路徑的 writeQueue
 * @param {string} [filePath] - 檔案路徑
 * @returns {Promise<void>}
 */
function getWriteQueue(filePath) {
  const targetPath = filePath || getHistoryFilePath()
  if (!writeQueues.has(targetPath)) {
    writeQueues.set(targetPath, Promise.resolve())
  }
  return writeQueues.get(targetPath)
}

/**
 * 更新指定檔案路徑的 writeQueue
 * @param {string} [filePath] - 檔案路徑
 * @param {Promise<any>} queue - 新的 queue
 */
function setWriteQueue(filePath, queue) {
  const targetPath = filePath || getHistoryFilePath()
  writeQueues.set(targetPath, queue)
}

/**
 * 寫入歷史記錄（使用佇列序列化）
 * @param {HistoryEntry[]} entries
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<void>}
 */
function writeHistory(entries, filePath) {
  // 將寫入操作加入佇列，確保序列化執行
  const currentQueue = getWriteQueue(filePath)
  const operation = currentQueue
    .then(() => writeHistoryInternal(entries, filePath))
    .catch((err) => {
      // 錯誤會傳播給呼叫端，但不影響 queue 繼續執行
      throw err
    })
  
  // 更新 queue：無論成功或失敗，都繼續下一個操作
  setWriteQueue(filePath, operation.catch(() => {}))
  
  return operation
}

/**
 * 新增歷史記錄
 * 
 * 並發安全設計：
 * - 整個操作（讀取 + 修改 + 寫入）在同一個 queue operation 內執行
 * - 確保多個並發呼叫會序列化執行，避免讀取到過期資料
 * - 例如：兩個 addEntry 同時執行時，第二個會等第一個完全寫入後才讀取
 * 
 * @param {Omit<HistoryEntry, 'id' | 'timestamp'>} entry
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry>}
 */
async function addEntry(entry, filePath) {
  // 將整個操作（讀+寫）加入佇列，確保序列化執行
  const currentQueue = getWriteQueue(filePath)
  const operation = currentQueue.then(async () => {
    // 重要：在同一個 operation 內完成讀取和寫入
    // 這樣可以確保讀取到的是最新的資料
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
    
    // 建立新的陣列（不修改原始 entries）
    const updatedEntries = [newEntry, ...entries]
    
    // 限制最多 100 筆
    if (updatedEntries.length > MAX_HISTORY_ENTRIES) {
      updatedEntries.splice(MAX_HISTORY_ENTRIES)
    }
    
    // 寫入磁碟
    await writeHistoryInternal(updatedEntries, filePath)
    return newEntry
  })
  
  // 更新 queue：無論成功或失敗，都繼續下一個操作
  setWriteQueue(filePath, operation.catch(() => {}))
  
  return operation
}

/**
 * 刪除單筆歷史記錄
 * 
 * 並發安全設計：
 * - 整個操作（讀取 + 修改 + 寫入）在同一個 queue operation 內執行
 * - 確保多個並發呼叫會序列化執行
 * 
 * @param {string} id
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<boolean>}
 */
async function removeEntry(id, filePath) {
  // 將整個操作（讀+寫）加入佇列，確保序列化執行
  const currentQueue = getWriteQueue(filePath)
  const operation = currentQueue.then(async () => {
    const entries = await readHistory(filePath)
    const index = entries.findIndex(e => e.id === id)
    
    if (index === -1) {
      return false
    }
    
    // 建立新的陣列（不修改原始 entries）
    const updatedEntries = entries.filter(e => e.id !== id)
    
    // 寫入磁碟
    await writeHistoryInternal(updatedEntries, filePath)
    return true
  })
  
  // 更新 queue：無論成功或失敗，都繼續下一個操作
  setWriteQueue(filePath, operation.catch(() => {}))
  
  return operation
}

/**
 * 清除所有歷史記錄
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<void>}
 * @throws {Error} 如果寫入失敗
 */
async function clearAll(filePath) {
  // 將操作加入佇列，確保序列化執行
  const currentQueue = getWriteQueue(filePath)
  const operation = currentQueue.then(() => writeHistoryInternal([], filePath))
  
  // 更新 queue：無論成功或失敗，都繼續下一個操作
  setWriteQueue(filePath, operation.catch(() => {}))
  
  return operation
}

/**
 * 取得所有歷史記錄
 * 等待所有寫入操作完成後再讀取，確保讀取到最新資料
 * @param {string} [filePath] - 可選的檔案路徑（用於測試）
 * @returns {Promise<HistoryEntry[]>}
 */
async function getAll(filePath) {
  const currentQueue = getWriteQueue(filePath)
  return currentQueue.then(() => readHistory(filePath))
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
