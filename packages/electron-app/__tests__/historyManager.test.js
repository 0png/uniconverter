/**
 * History Manager 測試
 * 使用 fast-check 進行屬性測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import fs from 'fs'
import path from 'path'
import os from 'os'

// 直接 require CommonJS 模組
const historyManager = require('../src/historyManager.js')
const {
  MAX_HISTORY_ENTRIES,
  readHistory,
  writeHistory,
  addEntry,
  removeEntry,
  clearAll,
  getAll,
  filterByType,
  getEntryCounts
} = historyManager

// 測試用的 HistoryEntry 生成器
const historyEntryArb = fc.record({
  sourceFile: fc.string({ minLength: 1, maxLength: 50 }).map(s => `C:\\test\\${s.replace(/[<>:"/\\|?*]/g, '_')}.png`),
  outputFile: fc.string({ minLength: 1, maxLength: 50 }).map(s => `C:\\output\\${s.replace(/[<>:"/\\|?*]/g, '_')}.jpg`),
  conversionType: fc.constantFrom('批量轉PNG', '批量轉JPG', '批量轉WEBP', '批量轉MP4'),
  fileType: fc.constantFrom('image', 'video', 'audio', 'document', 'markdown'),
  status: fc.constantFrom('success', 'failed')
})

describe('HistoryManager', () => {
  let testFilePath

  beforeEach(() => {
    // 建立臨時測試檔案路徑
    testFilePath = path.join(os.tmpdir(), `history-test-${Date.now()}.json`)
  })

  afterEach(async () => {
    // 清理測試檔案
    try {
      if (fs.existsSync(testFilePath)) {
        await fs.promises.unlink(testFilePath)
      }
    } catch (err) {
      // 忽略清理錯誤
    }
  })

  describe('readHistory', () => {
    it('should return empty array when file does not exist', async () => {
      const result = await readHistory(testFilePath)
      expect(result).toEqual([])
    })

    it('should return entries from valid file', async () => {
      const entries = [{ id: '1', sourceFile: 'test.png', outputFile: 'test.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 123, status: 'success' }]
      await fs.promises.writeFile(testFilePath, JSON.stringify({ version: 1, entries }), 'utf-8')
      
      const result = await readHistory(testFilePath)
      expect(result).toEqual(entries)
    })

    it('should return empty array for invalid JSON', async () => {
      await fs.promises.writeFile(testFilePath, 'invalid json', 'utf-8')
      const result = await readHistory(testFilePath)
      expect(result).toEqual([])
    })
  })


  describe('Property 2: History Persistence Round-Trip', () => {
    it('should preserve all fields after save and read', async () => {
      await fc.assert(
        fc.asyncProperty(historyEntryArb, async (entry) => {
          // 清空歷史
          await writeHistory([], testFilePath)
          
          // 新增記錄
          const added = await addEntry(entry, testFilePath)
          
          // 讀取回來
          const entries = await readHistory(testFilePath)
          const found = entries.find(e => e.id === added.id)
          
          // 驗證所有欄位
          expect(found).toBeDefined()
          expect(found.sourceFile).toBe(entry.sourceFile)
          expect(found.outputFile).toBe(entry.outputFile)
          expect(found.conversionType).toBe(entry.conversionType)
          expect(found.fileType).toBe(entry.fileType)
          expect(found.status).toBe(entry.status)
          expect(typeof found.timestamp).toBe('number')
          expect(typeof found.id).toBe('string')
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Property 3: History Limit Enforcement', () => {
    it('should never exceed MAX_HISTORY_ENTRIES', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(historyEntryArb, { minLength: 1, maxLength: 150 }),
          async (entries) => {
            // 清空歷史
            await writeHistory([], testFilePath)
            
            // 新增所有記錄
            for (const entry of entries) {
              await addEntry(entry, testFilePath)
            }
            
            // 驗證數量不超過限制
            const result = await readHistory(testFilePath)
            expect(result.length).toBeLessThanOrEqual(MAX_HISTORY_ENTRIES)
          }
        ),
        { numRuns: 5 }
      )
    })

    it('should remove oldest entries when limit exceeded', async () => {
      // 建立 100 筆記錄
      const initialEntries = Array.from({ length: 100 }, (_, i) => ({
        id: `entry-${i}`,
        sourceFile: `file-${i}.png`,
        outputFile: `file-${i}.jpg`,
        conversionType: '批量轉JPG',
        fileType: 'image',
        timestamp: 1000 + i,
        status: 'success'
      }))
      await writeHistory(initialEntries, testFilePath)
      
      // 新增一筆
      await addEntry({
        sourceFile: 'new.png',
        outputFile: 'new.jpg',
        conversionType: '批量轉JPG',
        fileType: 'image',
        status: 'success'
      }, testFilePath)
      
      const result = await readHistory(testFilePath)
      expect(result.length).toBe(100)
      // 最新的應該在最前面
      expect(result[0].sourceFile).toBe('new.png')
    })
  })

  describe('Property 5: History Filter Correctness', () => {
    it('should only return entries matching the filter type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(historyEntryArb, { minLength: 1, maxLength: 50 }),
          fc.constantFrom('image', 'video', 'audio', 'document', 'markdown'),
          async (entries, filterType) => {
            // 建立測試資料
            const testEntries = entries.map((e, i) => ({
              id: `entry-${i}`,
              ...e,
              timestamp: Date.now() + i
            }))
            await writeHistory(testEntries, testFilePath)
            
            // 篩選
            const filtered = await filterByType(filterType, testFilePath)
            
            // 驗證所有結果都符合篩選條件
            for (const entry of filtered) {
              expect(entry.fileType).toBe(filterType)
            }
            
            // 驗證數量正確
            const expectedCount = testEntries.filter(e => e.fileType === filterType).length
            expect(filtered.length).toBe(expectedCount)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('removeEntry', () => {
    it('should remove the specified entry', async () => {
      const entries = [
        { id: 'entry-1', sourceFile: 'a.png', outputFile: 'a.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 1, status: 'success' },
        { id: 'entry-2', sourceFile: 'b.png', outputFile: 'b.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 2, status: 'success' }
      ]
      await writeHistory(entries, testFilePath)
      
      const result = await removeEntry('entry-1', testFilePath)
      expect(result).toBe(true)
      
      const remaining = await readHistory(testFilePath)
      expect(remaining.length).toBe(1)
      expect(remaining[0].id).toBe('entry-2')
    })

    it('should return false for non-existent entry', async () => {
      await writeHistory([], testFilePath)
      const result = await removeEntry('non-existent', testFilePath)
      expect(result).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('should remove all entries', async () => {
      const entries = [
        { id: 'entry-1', sourceFile: 'a.png', outputFile: 'a.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 1, status: 'success' }
      ]
      await writeHistory(entries, testFilePath)
      
      await clearAll(testFilePath)
      
      const result = await readHistory(testFilePath)
      expect(result).toEqual([])
    })
  })

  describe('Error Handling (H1 Fix)', () => {
    it('should not modify memory state if writeHistory fails in addEntry', async () => {
      // 建立初始狀態
      const initialEntries = [
        { id: 'entry-1', sourceFile: 'a.png', outputFile: 'a.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 1, status: 'success' }
      ]
      await writeHistory(initialEntries, testFilePath)
      
      // 使用無效路徑強制寫入失敗
      const invalidPath = path.join('Z:\\invalid\\path\\that\\does\\not\\exist', 'test.json')
      
      try {
        await addEntry({
          sourceFile: 'new.png',
          outputFile: 'new.jpg',
          conversionType: '批量轉JPG',
          fileType: 'image',
          status: 'success'
        }, invalidPath)
        // 應該拋出錯誤
        expect.fail('Should have thrown an error')
      } catch (err) {
        // 預期會拋出錯誤
        expect(err.message).toContain('Failed to write history file')
      }
      
      // 驗證原始檔案未被修改
      const entries = await readHistory(testFilePath)
      expect(entries.length).toBe(1)
      expect(entries[0].id).toBe('entry-1')
    })

    it('should not modify memory state if writeHistory fails in removeEntry', async () => {
      // 建立初始狀態
      const initialEntries = [
        { id: 'entry-1', sourceFile: 'a.png', outputFile: 'a.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 1, status: 'success' },
        { id: 'entry-2', sourceFile: 'b.png', outputFile: 'b.jpg', conversionType: '批量轉JPG', fileType: 'image', timestamp: 2, status: 'success' }
      ]
      await writeHistory(initialEntries, testFilePath)
      
      // 建立一個唯讀檔案來強制寫入失敗
      const readonlyPath = path.join(os.tmpdir(), `readonly-test-${Date.now()}.json`)
      await writeHistory(initialEntries, readonlyPath)
      
      // 在 Windows 上設定唯讀屬性
      try {
        await fs.promises.chmod(readonlyPath, 0o444)
        
        try {
          await removeEntry('entry-1', readonlyPath)
          // 應該拋出錯誤
          expect.fail('Should have thrown an error')
        } catch (err) {
          // 預期會拋出錯誤
          expect(err.message).toContain('Failed to write history file')
        }
      } finally {
        // 恢復權限並清理
        try {
          await fs.promises.chmod(readonlyPath, 0o666)
          await fs.promises.unlink(readonlyPath)
        } catch {}
      }
      
      // 驗證原始檔案未被修改
      const entries = await readHistory(testFilePath)
      expect(entries.length).toBe(2)
    })

    it('should throw error with clear message when writeHistory fails', async () => {
      const invalidPath = path.join('Z:\\invalid\\path\\that\\does\\not\\exist', 'test.json')
      
      try {
        await writeHistory([], invalidPath)
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err.message).toContain('Failed to write history file')
      }
    })

    it('should serialize concurrent addEntry calls to prevent race conditions', async () => {
      // 清空歷史
      await writeHistory([], testFilePath)
      
      // 同時執行多個 addEntry
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          addEntry({
            sourceFile: `file-${i}.png`,
            outputFile: `file-${i}.jpg`,
            conversionType: '批量轉JPG',
            fileType: 'image',
            status: 'success'
          }, testFilePath)
        )
      }
      
      // 等待所有操作完成
      const results = await Promise.all(promises)
      
      // 驗證所有記錄都被正確保存
      const entries = await readHistory(testFilePath)
      expect(entries.length).toBe(5)
      
      // 驗證沒有重複的 ID
      const ids = entries.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)
      
      // 驗證所有檔案名稱都存在（不會因為並發而遺失）
      const sourceFiles = entries.map(e => e.sourceFile).sort()
      expect(sourceFiles).toEqual(['file-0.png', 'file-1.png', 'file-2.png', 'file-3.png', 'file-4.png'])
      
      // 驗證回傳的 newEntry 都在最終結果中
      for (const result of results) {
        const found = entries.find(e => e.id === result.id)
        expect(found).toBeDefined()
        expect(found.sourceFile).toBe(result.sourceFile)
      }
    })

    it('should handle concurrent addEntry and removeEntry without data loss', async () => {
      // 清空歷史
      await writeHistory([], testFilePath)
      
      // 先新增 3 筆
      const entry1 = await addEntry({
        sourceFile: 'file-1.png',
        outputFile: 'file-1.jpg',
        conversionType: '批量轉JPG',
        fileType: 'image',
        status: 'success'
      }, testFilePath)
      
      const entry2 = await addEntry({
        sourceFile: 'file-2.png',
        outputFile: 'file-2.jpg',
        conversionType: '批量轉JPG',
        fileType: 'image',
        status: 'success'
      }, testFilePath)
      
      const entry3 = await addEntry({
        sourceFile: 'file-3.png',
        outputFile: 'file-3.jpg',
        conversionType: '批量轉JPG',
        fileType: 'image',
        status: 'success'
      }, testFilePath)
      
      // 同時執行：新增 2 筆 + 刪除 1 筆
      await Promise.all([
        addEntry({
          sourceFile: 'file-4.png',
          outputFile: 'file-4.jpg',
          conversionType: '批量轉JPG',
          fileType: 'image',
          status: 'success'
        }, testFilePath),
        addEntry({
          sourceFile: 'file-5.png',
          outputFile: 'file-5.jpg',
          conversionType: '批量轉JPG',
          fileType: 'image',
          status: 'success'
        }, testFilePath),
        removeEntry(entry2.id, testFilePath)
      ])
      
      // 驗證最終結果：3 + 2 - 1 = 4 筆
      const entries = await readHistory(testFilePath)
      expect(entries.length).toBe(4)
      
      // 驗證 entry2 被刪除
      const found = entries.find(e => e.id === entry2.id)
      expect(found).toBeUndefined()
      
      // 驗證其他記錄都存在
      expect(entries.find(e => e.id === entry1.id)).toBeDefined()
      expect(entries.find(e => e.id === entry3.id)).toBeDefined()
      expect(entries.find(e => e.sourceFile === 'file-4.png')).toBeDefined()
      expect(entries.find(e => e.sourceFile === 'file-5.png')).toBeDefined()
    })
  })

  describe('getEntryCounts', () => {
    it('should return correct counts for each type', async () => {
      const entries = [
        { id: '1', fileType: 'image', sourceFile: '', outputFile: '', conversionType: '', timestamp: 1, status: 'success' },
        { id: '2', fileType: 'image', sourceFile: '', outputFile: '', conversionType: '', timestamp: 2, status: 'success' },
        { id: '3', fileType: 'video', sourceFile: '', outputFile: '', conversionType: '', timestamp: 3, status: 'success' },
        { id: '4', fileType: 'audio', sourceFile: '', outputFile: '', conversionType: '', timestamp: 4, status: 'success' }
      ]
      await writeHistory(entries, testFilePath)
      
      const counts = await getEntryCounts(testFilePath)
      
      expect(counts.all).toBe(4)
      expect(counts.image).toBe(2)
      expect(counts.video).toBe(1)
      expect(counts.audio).toBe(1)
      expect(counts.document).toBe(0)
      expect(counts.markdown).toBe(0)
    })
  })
})
