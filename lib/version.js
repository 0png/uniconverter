/**
 * 版本比較工具
 * 用於比較 semver 版本號
 */

/**
 * 解析版本號字串為數字陣列
 * @param {string} version - 版本號字串 (如 "1.2.3")
 * @returns {number[]} - 版本號數字陣列 [major, minor, patch]
 */
export function parseVersion(version) {
  if (!version || typeof version !== 'string') {
    return [0, 0, 0]
  }
  
  // 移除 'v' 前綴
  const cleaned = version.replace(/^v/i, '')
  
  // 分割並轉換為數字
  const parts = cleaned.split('.').map(p => {
    const num = parseInt(p, 10)
    return isNaN(num) ? 0 : num
  })
  
  // 確保至少有三個部分
  while (parts.length < 3) {
    parts.push(0)
  }
  
  return parts.slice(0, 3)
}

/**
 * 比較兩個版本號
 * @param {string} v1 - 第一個版本號
 * @param {string} v2 - 第二個版本號
 * @returns {number} - -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
 */
export function compareVersions(v1, v2) {
  const parts1 = parseVersion(v1)
  const parts2 = parseVersion(v2)
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1
    if (parts1[i] < parts2[i]) return -1
  }
  
  return 0
}

/**
 * 檢查是否有更新可用
 * @param {string} currentVersion - 目前版本
 * @param {string} latestVersion - 最新版本
 * @returns {boolean} - 是否有更新
 */
export function isUpdateAvailable(currentVersion, latestVersion) {
  return compareVersions(latestVersion, currentVersion) > 0
}

/**
 * 格式化版本號（確保格式一致）
 * @param {string} version - 版本號
 * @returns {string} - 格式化後的版本號
 */
export function formatVersion(version) {
  const parts = parseVersion(version)
  return parts.join('.')
}
