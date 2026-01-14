import path from 'path'
import fs from 'fs'

/**
 * 檢查依賴是否可用
 * @param {string} name - 依賴名稱
 * @returns {{ available: boolean, module: any, error: string | null }}
 */
export async function checkDependency(name) {
  try {
    const mod = await import(name)
    return { available: true, module: mod.default || mod, error: null }
  } catch (e) {
    return { available: false, module: null, error: `${name} is not available: ${e.message}` }
  }
}

/**
 * 驗證檔案是否存在
 * @param {string} filePath - 檔案路徑
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 確保目錄存在，不存在則建立
 * @param {string} dirPath - 目錄路徑
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }
}

/**
 * 生成不重複的輸出檔名
 * @param {string} dir - 輸出目錄
 * @param {string} baseName - 基礎檔名
 * @param {string} ext - 副檔名
 * @returns {string}
 */
export function getUniqueFilename(dir, baseName, ext) {
  let outPath = path.join(dir, `${baseName}.${ext}`)
  if (!fs.existsSync(outPath)) return outPath
  
  let counter = 1
  while (fs.existsSync(path.join(dir, `${baseName}_${counter}.${ext}`))) {
    counter++
  }
  return path.join(dir, `${baseName}_${counter}.${ext}`)
}

/**
 * 建立標準化的結果物件
 * @param {number} ok - 成功數量
 * @param {number} fail - 失敗數量
 * @param {Array<{file: string, error: string}>} errors - 錯誤詳情
 * @returns {{ ok: number, fail: number, errors: Array }}
 */
export function createResult(ok = 0, fail = 0, errors = []) {
  return { ok, fail, errors }
}

/**
 * 取得輸出目錄（如果未指定則使用原始檔案目錄）
 * @param {string} inputFile - 輸入檔案路徑
 * @param {string | null} outputDir - 指定的輸出目錄
 * @returns {string}
 */
export function getOutputDir(inputFile, outputDir) {
  return outputDir || path.dirname(inputFile)
}
