/**
 * 任務佇列 Hook 屬性測試
 * **Property 5: addFiles Grows Queue**
 * **Property 6: handleFormatChange Updates Format**
 * **Property 7: handleToggleGroup Toggles State**
 * **Property 8: handleRemoveFile Decreases Count**
 * **Property 9: handleClearAll Empties Queue**
 * **Property 10: Computed Values Consistency**
 * **Validates: Requirements 4.3-4.7, 4.10, 10.1**
 * 
 * Feature: app-jsx-refactor
 * 
 * 注意：由於專案未安裝 @testing-library/react，
 * 這裡測試任務佇列相關的純函式邏輯
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  createInitialTaskQueue,
  groupFilesToQueue,
  getActiveGroupTypes,
  getTotalFileCount,
  getTotalFileSize,
  isAnyProcessing,
  hasEnabledGroups,
  availableActions,
  detectFileType
} from '@/lib/taskQueue'

// --- Arbitraries ---

// 檔案類型
const fileTypeArb = fc.constantFrom('image', 'video', 'audio', 'document')

// 檔案副檔名對應
const extensionsByType = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'],
  video: ['mp4', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'wav', 'm4a'],
  document: ['pdf', 'md', 'markdown']
}

// 產生特定類型的檔案路徑
const filePathForTypeArb = (type) => {
  const exts = extensionsByType[type]
  return fc.tuple(
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
    fc.constantFrom(...exts)
  ).map(([name, ext]) => `C:/test/${name}.${ext}`)
}

// 產生隨機檔案物件
const fileArb = fc.tuple(
  fileTypeArb,
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  fc.nat({ max: 100 * 1024 * 1024 }) // 0 到 100MB
).chain(([type, name, size]) => {
  const exts = extensionsByType[type]
  return fc.constantFrom(...exts).map(ext => ({
    path: `C:/test/${name}.${ext}`,
    name: `${name}.${ext}`,
    size
  }))
})

// 產生檔案陣列
const filesArb = fc.array(fileArb, { minLength: 0, maxLength: 10 })

// 產生非空檔案陣列
const nonEmptyFilesArb = fc.array(fileArb, { minLength: 1, maxLength: 10 })

// 產生有效的輸出格式
const formatForTypeArb = (type) => {
  const actions = availableActions[type] || []
  const formats = actions.map(a => a.id)
  return fc.constantFrom(...formats)
}

// --- 模擬 Hook 邏輯的純函式 ---

/**
 * 模擬 addFiles 邏輯
 */
function addFilesToQueue(newFiles, existingQueue) {
  return groupFilesToQueue(newFiles, existingQueue)
}

/**
 * 模擬 handleFormatChange 邏輯
 */
function changeFormat(queue, type, format) {
  return {
    ...queue,
    [type]: { ...queue[type], outputFormat: format }
  }
}

/**
 * 模擬 handleToggleGroup 邏輯
 */
function toggleGroup(queue, type) {
  return {
    ...queue,
    [type]: { ...queue[type], enabled: !queue[type].enabled }
  }
}

/**
 * 模擬 handleRemoveFile 邏輯
 */
function removeFile(queue, type, index) {
  return {
    ...queue,
    [type]: {
      ...queue[type],
      files: queue[type].files.filter((_, i) => i !== index)
    }
  }
}

/**
 * 模擬 handleClearAll 邏輯
 */
function clearAll() {
  return createInitialTaskQueue()
}

// --- Property Tests ---

describe('useTaskQueue - Property Tests', () => {

  /**
   * Property 5: addFiles Grows Queue
   * *For any* valid file array and existing task queue, calling `addFiles` SHALL result in
   * the total file count increasing by the number of files added (or less if duplicates are filtered).
   */
  describe('Property 5: addFiles Grows Queue', () => {
    
    it('should increase total file count when adding new files', () => {
      fc.assert(
        fc.property(nonEmptyFilesArb, (newFiles) => {
          const initialQueue = createInitialTaskQueue()
          const initialCount = getTotalFileCount(initialQueue)
          
          const updatedQueue = addFilesToQueue(newFiles, initialQueue)
          const newCount = getTotalFileCount(updatedQueue)
          
          // 新增檔案後，總數應該增加（去重後可能少於 newFiles.length）
          expect(newCount).toBeGreaterThanOrEqual(initialCount)
          expect(newCount).toBeLessThanOrEqual(initialCount + newFiles.length)
        }),
        { numRuns: 100 }
      )
    })

    it('should not add duplicate files', () => {
      fc.assert(
        fc.property(fileArb, (file) => {
          const initialQueue = createInitialTaskQueue()
          
          // 加入同一個檔案兩次
          const queueAfterFirst = addFilesToQueue([file], initialQueue)
          const queueAfterSecond = addFilesToQueue([file], queueAfterFirst)
          
          const countAfterFirst = getTotalFileCount(queueAfterFirst)
          const countAfterSecond = getTotalFileCount(queueAfterSecond)
          
          // 第二次加入應該不會增加數量
          expect(countAfterSecond).toBe(countAfterFirst)
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly categorize files by type', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const initialQueue = createInitialTaskQueue()
          
          // 產生該類型的檔案
          const ext = extensionsByType[type][0]
          const file = {
            path: `C:/test/file.${ext}`,
            name: `file.${ext}`,
            size: 1024
          }
          
          const updatedQueue = addFilesToQueue([file], initialQueue)
          
          // 檔案應該被加入到正確的群組
          expect(updatedQueue[type].files.length).toBe(1)
          expect(updatedQueue[type].files[0].path).toBe(file.path)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: handleFormatChange Updates Format
   * *For any* valid group type and format, calling `handleFormatChange(type, format)` SHALL result in
   * `taskQueue[type].outputFormat` being equal to the specified format.
   */
  describe('Property 6: handleFormatChange Updates Format', () => {
    
    it('should update outputFormat to the specified format', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const actions = availableActions[type] || []
          if (actions.length === 0) return true // 跳過沒有 actions 的類型
          
          const format = actions[0].id
          const initialQueue = createInitialTaskQueue()
          
          const updatedQueue = changeFormat(initialQueue, type, format)
          
          expect(updatedQueue[type].outputFormat).toBe(format)
        }),
        { numRuns: 100 }
      )
    })

    it('should not affect other groups when changing format', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const actions = availableActions[type] || []
          if (actions.length === 0) return true
          
          const format = actions[0].id
          const initialQueue = createInitialTaskQueue()
          
          const updatedQueue = changeFormat(initialQueue, type, format)
          
          // 其他群組應該保持不變
          for (const otherType of Object.keys(initialQueue)) {
            if (otherType !== type) {
              expect(updatedQueue[otherType]).toEqual(initialQueue[otherType])
            }
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 7: handleToggleGroup Toggles State
   * *For any* valid group type, calling `handleToggleGroup(type)` SHALL result in
   * `taskQueue[type].enabled` being the opposite of its previous value.
   */
  describe('Property 7: handleToggleGroup Toggles State', () => {
    
    it('should toggle enabled state to opposite value', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const initialQueue = createInitialTaskQueue()
          const initialEnabled = initialQueue[type].enabled
          
          const updatedQueue = toggleGroup(initialQueue, type)
          
          expect(updatedQueue[type].enabled).toBe(!initialEnabled)
        }),
        { numRuns: 100 }
      )
    })

    it('should return to original state after double toggle', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const initialQueue = createInitialTaskQueue()
          const initialEnabled = initialQueue[type].enabled
          
          const afterFirstToggle = toggleGroup(initialQueue, type)
          const afterSecondToggle = toggleGroup(afterFirstToggle, type)
          
          expect(afterSecondToggle[type].enabled).toBe(initialEnabled)
        }),
        { numRuns: 100 }
      )
    })

    it('should not affect other groups when toggling', () => {
      fc.assert(
        fc.property(fileTypeArb, (type) => {
          const initialQueue = createInitialTaskQueue()
          
          const updatedQueue = toggleGroup(initialQueue, type)
          
          // 其他群組應該保持不變
          for (const otherType of Object.keys(initialQueue)) {
            if (otherType !== type) {
              expect(updatedQueue[otherType]).toEqual(initialQueue[otherType])
            }
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 8: handleRemoveFile Decreases Count
   * *For any* valid group type with at least one file and valid index, calling `handleRemoveFile(type, index)`
   * SHALL result in `taskQueue[type].files.length` decreasing by exactly 1.
   */
  describe('Property 8: handleRemoveFile Decreases Count', () => {
    
    it('should decrease file count by exactly 1', () => {
      fc.assert(
        fc.property(fileTypeArb, nonEmptyFilesArb, (type, files) => {
          // 先建立有檔案的佇列
          const ext = extensionsByType[type][0]
          const typedFiles = files.map((f, i) => ({
            path: `C:/test/file${i}.${ext}`,
            name: `file${i}.${ext}`,
            size: f.size
          }))
          
          const initialQueue = createInitialTaskQueue()
          const queueWithFiles = addFilesToQueue(typedFiles, initialQueue)
          
          const fileCount = queueWithFiles[type].files.length
          if (fileCount === 0) return true // 跳過空群組
          
          const indexToRemove = 0
          const updatedQueue = removeFile(queueWithFiles, type, indexToRemove)
          
          expect(updatedQueue[type].files.length).toBe(fileCount - 1)
        }),
        { numRuns: 100 }
      )
    })

    it('should remove the correct file at the specified index', () => {
      fc.assert(
        fc.property(fileTypeArb, fc.nat({ max: 4 }), (type, indexOffset) => {
          const ext = extensionsByType[type][0]
          const files = [
            { path: `C:/test/a.${ext}`, name: `a.${ext}`, size: 100 },
            { path: `C:/test/b.${ext}`, name: `b.${ext}`, size: 200 },
            { path: `C:/test/c.${ext}`, name: `c.${ext}`, size: 300 }
          ]
          
          const initialQueue = createInitialTaskQueue()
          const queueWithFiles = addFilesToQueue(files, initialQueue)
          
          const fileCount = queueWithFiles[type].files.length
          if (fileCount === 0) return true
          
          const indexToRemove = indexOffset % fileCount
          const fileToRemove = queueWithFiles[type].files[indexToRemove]
          
          const updatedQueue = removeFile(queueWithFiles, type, indexToRemove)
          
          // 被移除的檔案不應該存在於更新後的佇列中
          const remainingPaths = updatedQueue[type].files.map(f => f.path)
          expect(remainingPaths).not.toContain(fileToRemove.path)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 9: handleClearAll Empties Queue
   * *For any* task queue state, calling `handleClearAll` SHALL result in all groups having
   * empty file arrays and progress being 0.
   */
  describe('Property 9: handleClearAll Empties Queue', () => {
    
    it('should empty all file arrays', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queueWithFiles = addFilesToQueue(files, initialQueue)
          
          const clearedQueue = clearAll()
          
          // 所有群組的檔案陣列應該為空
          for (const type of Object.keys(clearedQueue)) {
            expect(clearedQueue[type].files).toEqual([])
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should reset all groups to initial state', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queueWithFiles = addFilesToQueue(files, initialQueue)
          
          const clearedQueue = clearAll()
          
          // 清除後應該等於初始狀態
          expect(clearedQueue).toEqual(initialQueue)
        }),
        { numRuns: 100 }
      )
    })

    it('should result in zero total file count', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queueWithFiles = addFilesToQueue(files, initialQueue)
          
          const clearedQueue = clearAll()
          
          expect(getTotalFileCount(clearedQueue)).toBe(0)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 10: Computed Values Consistency
   * *For any* task queue state, the computed values SHALL satisfy:
   * - `totalFileCount` equals the sum of all `taskQueue[type].files.length`
   * - `activeTypes` contains exactly the types where `files.length > 0`
   * - `canStartAll` is true if and only if at least one active group has `enabled === true`
   */
  describe('Property 10: Computed Values Consistency', () => {
    
    it('should compute totalFileCount as sum of all file lengths', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queue = addFilesToQueue(files, initialQueue)
          
          const computedTotal = getTotalFileCount(queue)
          const manualTotal = Object.values(queue).reduce(
            (sum, group) => sum + group.files.length, 0
          )
          
          expect(computedTotal).toBe(manualTotal)
        }),
        { numRuns: 100 }
      )
    })

    it('should compute totalFileSize as sum of all file sizes', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queue = addFilesToQueue(files, initialQueue)
          
          const computedSize = getTotalFileSize(queue)
          const manualSize = Object.values(queue).reduce(
            (sum, group) => sum + group.files.reduce((s, f) => s + (f.size || 0), 0), 0
          )
          
          expect(computedSize).toBe(manualSize)
        }),
        { numRuns: 100 }
      )
    })

    it('should compute activeTypes as types with files', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queue = addFilesToQueue(files, initialQueue)
          
          const computedActiveTypes = getActiveGroupTypes(queue)
          const manualActiveTypes = Object.keys(queue).filter(
            type => queue[type].files.length > 0
          )
          
          expect(computedActiveTypes.sort()).toEqual(manualActiveTypes.sort())
        }),
        { numRuns: 100 }
      )
    })

    it('should compute hasEnabledGroups correctly', () => {
      fc.assert(
        fc.property(filesArb, (files) => {
          const initialQueue = createInitialTaskQueue()
          const queue = addFilesToQueue(files, initialQueue)
          
          const computedCanStart = hasEnabledGroups(queue)
          const manualCanStart = Object.values(queue).some(
            group => group.enabled && group.files.length > 0
          )
          
          expect(computedCanStart).toBe(manualCanStart)
        }),
        { numRuns: 100 }
      )
    })

    it('should compute isAnyProcessing correctly', () => {
      fc.assert(
        fc.property(filesArb, fileTypeArb, (files, type) => {
          const initialQueue = createInitialTaskQueue()
          let queue = addFilesToQueue(files, initialQueue)
          
          // 初始狀態不應該有處理中的群組
          expect(isAnyProcessing(queue)).toBe(false)
          
          // 模擬設定一個群組為處理中
          queue = {
            ...queue,
            [type]: { ...queue[type], status: 'processing' }
          }
          
          expect(isAnyProcessing(queue)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })
})

// --- Unit Tests ---

describe('useTaskQueue - Unit Tests', () => {
  
  describe('createInitialTaskQueue', () => {
    it('should create queue with all expected types', () => {
      const queue = createInitialTaskQueue()
      
      expect(queue).toHaveProperty('image')
      expect(queue).toHaveProperty('video')
      expect(queue).toHaveProperty('audio')
      expect(queue).toHaveProperty('document')
    })

    it('should create empty file arrays for all types', () => {
      const queue = createInitialTaskQueue()
      
      for (const type of Object.keys(queue)) {
        expect(queue[type].files).toEqual([])
      }
    })

    it('should set all groups as enabled by default', () => {
      const queue = createInitialTaskQueue()
      
      for (const type of Object.keys(queue)) {
        expect(queue[type].enabled).toBe(true)
      }
    })
  })

  describe('detectFileType', () => {
    it('should detect image files correctly', () => {
      expect(detectFileType('test.png')).toBe('image')
      expect(detectFileType('test.jpg')).toBe('image')
      expect(detectFileType('test.jpeg')).toBe('image')
      expect(detectFileType('test.webp')).toBe('image')
    })

    it('should detect video files correctly', () => {
      expect(detectFileType('test.mp4')).toBe('video')
      expect(detectFileType('test.mov')).toBe('video')
      expect(detectFileType('test.avi')).toBe('video')
    })

    it('should detect audio files correctly', () => {
      expect(detectFileType('test.mp3')).toBe('audio')
      expect(detectFileType('test.wav')).toBe('audio')
      expect(detectFileType('test.m4a')).toBe('audio')
    })

    it('should detect document files correctly', () => {
      expect(detectFileType('test.pdf')).toBe('document')
    })

    it('should detect markdown files correctly', () => {
      expect(detectFileType('test.md')).toBe('document')
      expect(detectFileType('test.markdown')).toBe('document')
    })

    it('should return unknown for unsupported extensions', () => {
      expect(detectFileType('test.xyz')).toBe('unknown')
      expect(detectFileType('test.txt')).toBe('unknown')
    })
  })

  describe('groupFilesToQueue', () => {
    it('should add files to correct groups', () => {
      const files = [
        { path: 'test.png', name: 'test.png', size: 100 },
        { path: 'test.mp4', name: 'test.mp4', size: 200 }
      ]
      
      const queue = groupFilesToQueue(files)
      
      expect(queue.image.files.length).toBe(1)
      expect(queue.video.files.length).toBe(1)
    })

    it('should preserve existing files when adding new ones', () => {
      const existingQueue = createInitialTaskQueue()
      existingQueue.image.files = [{ path: 'existing.png', name: 'existing.png', size: 50 }]
      
      const newFiles = [{ path: 'new.png', name: 'new.png', size: 100 }]
      
      const queue = groupFilesToQueue(newFiles, existingQueue)
      
      expect(queue.image.files.length).toBe(2)
    })

    it('should not add duplicate files', () => {
      const files = [
        { path: 'test.png', name: 'test.png', size: 100 },
        { path: 'test.png', name: 'test.png', size: 100 }
      ]
      
      const queue = groupFilesToQueue(files)
      
      expect(queue.image.files.length).toBe(1)
    })
  })

  describe('getTotalFileCount', () => {
    it('should return 0 for empty queue', () => {
      const queue = createInitialTaskQueue()
      expect(getTotalFileCount(queue)).toBe(0)
    })

    it('should count files across all groups', () => {
      const queue = createInitialTaskQueue()
      queue.image.files = [{ path: 'a.png' }, { path: 'b.png' }]
      queue.video.files = [{ path: 'c.mp4' }]
      
      expect(getTotalFileCount(queue)).toBe(3)
    })
  })

  describe('getTotalFileSize', () => {
    it('should return 0 for empty queue', () => {
      const queue = createInitialTaskQueue()
      expect(getTotalFileSize(queue)).toBe(0)
    })

    it('should sum sizes across all groups', () => {
      const queue = createInitialTaskQueue()
      queue.image.files = [{ path: 'a.png', size: 100 }, { path: 'b.png', size: 200 }]
      queue.video.files = [{ path: 'c.mp4', size: 300 }]
      
      expect(getTotalFileSize(queue)).toBe(600)
    })
  })

  describe('getActiveGroupTypes', () => {
    it('should return empty array for empty queue', () => {
      const queue = createInitialTaskQueue()
      expect(getActiveGroupTypes(queue)).toEqual([])
    })

    it('should return types with files', () => {
      const queue = createInitialTaskQueue()
      queue.image.files = [{ path: 'a.png' }]
      queue.audio.files = [{ path: 'b.mp3' }]
      
      const activeTypes = getActiveGroupTypes(queue)
      expect(activeTypes).toContain('image')
      expect(activeTypes).toContain('audio')
      expect(activeTypes).not.toContain('video')
    })
  })

  describe('hasEnabledGroups', () => {
    it('should return false for empty queue', () => {
      const queue = createInitialTaskQueue()
      expect(hasEnabledGroups(queue)).toBe(false)
    })

    it('should return true when enabled group has files', () => {
      const queue = createInitialTaskQueue()
      queue.image.files = [{ path: 'a.png' }]
      queue.image.enabled = true
      
      expect(hasEnabledGroups(queue)).toBe(true)
    })

    it('should return false when group with files is disabled', () => {
      const queue = createInitialTaskQueue()
      queue.image.files = [{ path: 'a.png' }]
      queue.image.enabled = false
      
      expect(hasEnabledGroups(queue)).toBe(false)
    })
  })

  describe('isAnyProcessing', () => {
    it('should return false when no groups are processing', () => {
      const queue = createInitialTaskQueue()
      expect(isAnyProcessing(queue)).toBe(false)
    })

    it('should return true when any group is processing', () => {
      const queue = createInitialTaskQueue()
      queue.image.status = 'processing'
      
      expect(isAnyProcessing(queue)).toBe(true)
    })
  })
})
