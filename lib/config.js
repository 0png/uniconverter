/**
 * GitHub 配置解析工具
 * 從 package.json 解析 GitHub repository 資訊
 */

/**
 * 從 repository URL 解析 owner 和 repo
 * @param {string} url - repository URL
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseRepositoryUrl(url) {
  if (!url || typeof url !== 'string') {
    return null
  }
  
  // 支援的格式:
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo
  // git@github.com:owner/repo.git
  // github:owner/repo
  // owner/repo
  
  let match
  
  // HTTPS 格式
  match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(?:\.git)?/)
  if (match) {
    return { owner: match[1], repo: match[2] }
  }
  
  // github:owner/repo 格式
  match = url.match(/^github:([^\/]+)\/([^\/]+)$/)
  if (match) {
    return { owner: match[1], repo: match[2] }
  }
  
  // owner/repo 格式
  match = url.match(/^([^\/]+)\/([^\/]+)$/)
  if (match) {
    return { owner: match[1], repo: match[2] }
  }
  
  return null
}

/**
 * 從 package.json 物件解析 GitHub 配置
 * @param {object} packageJson - package.json 內容
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGitHubConfig(packageJson) {
  if (!packageJson || typeof packageJson !== 'object') {
    return null
  }
  
  // 優先使用 build.publish 配置
  if (packageJson.build?.publish) {
    const publish = packageJson.build.publish
    if (publish.provider === 'github' && publish.owner && publish.repo) {
      return { owner: publish.owner, repo: publish.repo }
    }
  }
  
  // 其次使用 repository 欄位
  if (packageJson.repository) {
    const repo = packageJson.repository
    
    // 字串格式
    if (typeof repo === 'string') {
      return parseRepositoryUrl(repo)
    }
    
    // 物件格式
    if (typeof repo === 'object' && repo.url) {
      return parseRepositoryUrl(repo.url)
    }
  }
  
  return null
}

/**
 * 驗證 GitHub 配置是否有效
 * @param {{ owner: string, repo: string } | null} config
 * @returns {boolean}
 */
export function isValidGitHubConfig(config) {
  if (!config || typeof config !== 'object') {
    return false
  }
  
  return (
    typeof config.owner === 'string' &&
    config.owner.length > 0 &&
    typeof config.repo === 'string' &&
    config.repo.length > 0
  )
}
