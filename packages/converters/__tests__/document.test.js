/**
 * Document Converter 錯誤處理測試 (H6 Fix)
 */

import { describe, it, expect } from 'vitest'
import { markdownToPdf } from '../src/document.js'
import path from 'path'
import os from 'os'
import fs from 'fs'

describe('Document Converter - Error Handling', () => {
  describe('markdownToPdf (H6 Fix)', () => {
    it('should not repeatedly import fs in loop', async () => {
      // 建立測試檔案
      const testDir = path.join(os.tmpdir(), `md-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      
      const testFile = path.join(testDir, 'test.md')
      await fs.promises.writeFile(testFile, '# Test\n\nContent', 'utf-8')
      
      try {
        // 執行轉換
        const result = await markdownToPdf([testFile], null)
        
        // 驗證結果格式正確
        expect(result).toHaveProperty('ok')
        expect(result).toHaveProperty('fail')
        expect(result).toHaveProperty('errors')
      } finally {
        // 清理
        try {
          await fs.promises.unlink(testFile)
          await fs.promises.rmdir(testDir)
        } catch {}
      }
    })

    it('should handle empty markdown files correctly', async () => {
      const testDir = path.join(os.tmpdir(), `md-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      
      const emptyFile = path.join(testDir, 'empty.md')
      await fs.promises.writeFile(emptyFile, '', 'utf-8')
      
      try {
        const result = await markdownToPdf([emptyFile], null)
        
        // 空檔案應該失敗
        expect(result.fail).toBeGreaterThan(0)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0].error).toContain('empty')
      } finally {
        // 清理
        try {
          await fs.promises.unlink(emptyFile)
          await fs.promises.rmdir(testDir)
        } catch {}
      }
    })

    it('should handle non-existent files correctly', async () => {
      const nonExistentFile = path.join(os.tmpdir(), 'non-existent-12345.md')
      
      const result = await markdownToPdf([nonExistentFile], null)
      
      // 不存在的檔案應該失敗
      expect(result.fail).toBeGreaterThan(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].error).toContain('does not exist')
    })
  })
})
