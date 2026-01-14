/**
 * Task Queue 配置和工具函數
 */

// 預設輸出格式
export const defaultFormats = {
  image: 'png',
  video: 'mp4',
  audio: 'mp3',
  document: 'png'
}

// 可用操作配置
export const availableActions = {
  image: [
    { id: 'png', action: '批量轉PNG', recommended: true },
    { id: 'jpg', action: '批量轉JPG' },
    { id: 'webp', action: '批量轉WEBP' },
    { id: 'ico', action: '批量轉ICO' },
    { id: 'bmp', action: '批量轉BMP' },
    { id: 'gif', action: '批量轉GIF' },
    { id: 'tiff', action: '批量轉TIFF' },
    { id: 'pdf', action: '合併圖片為PDF', requireMultiple: true }
  ],
  video: [
    { id: 'mp4', action: '批量轉MP4', recommended: true },
    { id: 'mov', action: '批量轉MOV' },
    { id: 'mp3', action: '批量轉/提取MP3' }
  ],
  audio: [
    { id: 'mp3', action: '批量轉MP3', recommended: true },
    { id: 'wav', action: '批量轉WAV' },
    { id: 'm4a', action: '批量轉M4A' }
  ],
  document: [
    { id: 'png', action: 'PDF每頁轉PNG', recommended: true, forExt: ['pdf'] },
    { id: 'jpg', action: 'PDF每頁轉JPG', forExt: ['pdf'] },
    { id: 'md-pdf', action: 'Markdown轉PDF', forExt: ['md', 'markdown'] }
  ]
}

// 類型圖示 (使用 lucide-react 圖示名稱)
export const typeIconNames = {
  image: 'Image',
  video: 'Video',
  audio: 'Music',
  document: 'FileText'
}

// 建立空的任務群組
export function createEmptyGroup(type) {
  return {
    files: [],
    outputFormat: defaultFormats[type],
    status: 'pending', // 'pending' | 'processing' | 'completed' | 'error'
    enabled: true,
    progress: 0,
    errors: []
  }
}

// 建立初始任務佇列
export function createInitialTaskQueue() {
  return {
    image: createEmptyGroup('image'),
    video: createEmptyGroup('video'),
    audio: createEmptyGroup('audio'),
    document: createEmptyGroup('document')
  }
}

// 偵測檔案類型
export function detectFileType(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'heic', 'heif', 'webp', 'bmp', 'gif', 'tiff', 'tif', 'ico', 'avif', 'svg'].includes(ext)) return 'image'
  if (['pdf', 'md', 'markdown'].includes(ext)) return 'document'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac', 'wma'].includes(ext)) return 'audio'
  return 'unknown'
}

// 將檔案分組到任務佇列
export function groupFilesToQueue(files, existingQueue = null) {
  const queue = existingQueue ? { ...existingQueue } : createInitialTaskQueue()
  
  // 深拷貝現有群組
  for (const type of Object.keys(queue)) {
    queue[type] = { ...queue[type], files: [...queue[type].files] }
  }
  
  // 收集所有現有路徑用於去重
  const existingPaths = new Set()
  for (const type of Object.keys(queue)) {
    for (const f of queue[type].files) {
      existingPaths.add(f.path)
    }
  }
  
  // 記錄哪些群組有新增檔案
  const groupsWithNewFiles = new Set()
  
  // 分類新檔案
  for (const file of files) {
    if (existingPaths.has(file.path)) continue
    
    const type = detectFileType(file.path)
    if (type !== 'unknown' && queue[type]) {
      queue[type].files.push({
        path: file.path,
        name: file.name,
        size: file.size || 0
      })
      existingPaths.add(file.path)
      groupsWithNewFiles.add(type)
    }
  }
  
  // 重置有新增檔案的群組狀態為 pending
  for (const type of groupsWithNewFiles) {
    if (queue[type].status === 'completed' || queue[type].status === 'error') {
      queue[type].status = 'pending'
      queue[type].progress = 0
      queue[type].errors = []
    }
  }
  
  return queue
}

// 取得有檔案的群組類型列表
export function getActiveGroupTypes(queue) {
  return Object.keys(queue).filter(type => queue[type].files.length > 0)
}

// 取得群組的可用操作
export function getGroupActions(type, fileCount, files = []) {
  const actions = availableActions[type] || []
  
  // 取得群組中所有檔案的副檔名
  const extensions = files.map(f => (f.path?.split('.').pop() || f.name?.split('.').pop() || '').toLowerCase())
  const hasMarkdown = extensions.some(ext => ['md', 'markdown'].includes(ext))
  const hasPdf = extensions.some(ext => ext === 'pdf')
  
  return actions.filter(a => {
    if (a.requireMultiple && fileCount < 2) return false
    
    // 如果操作有指定適用的副檔名，檢查是否符合
    if (a.forExt) {
      // 對於 document 類型，根據檔案類型過濾操作
      if (type === 'document') {
        const actionForMarkdown = a.forExt.some(ext => ['md', 'markdown'].includes(ext))
        const actionForPdf = a.forExt.includes('pdf')
        
        // 如果操作是給 markdown 的，只有當有 markdown 檔案時才顯示
        if (actionForMarkdown && !hasMarkdown) return false
        // 如果操作是給 pdf 的，只有當有 pdf 檔案時才顯示
        if (actionForPdf && !hasPdf) return false
      }
    }
    
    return true
  })
}

// 計算總檔案數
export function getTotalFileCount(queue) {
  return Object.values(queue).reduce((sum, group) => sum + group.files.length, 0)
}

// 計算總檔案大小
export function getTotalFileSize(queue) {
  return Object.values(queue).reduce((sum, group) => {
    return sum + group.files.reduce((s, f) => s + (f.size || 0), 0)
  }, 0)
}

// 檢查是否有任何群組正在處理
export function isAnyProcessing(queue) {
  return Object.values(queue).some(group => group.status === 'processing')
}

// 檢查是否有啟用的群組可以開始
export function hasEnabledGroups(queue) {
  return Object.values(queue).some(group => group.enabled && group.files.length > 0)
}
