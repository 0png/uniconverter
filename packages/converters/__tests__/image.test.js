/**
 * Image Converter 錯誤處理測試 (H4 Fix)
 */

import { describe, it, expect } from 'vitest'
import { mergeImagesToPDF } from '../src/image.js'
import path from 'path'
import os from 'os'
import fs from 'fs'

describe('Image Converter - Error Handling', () => {
  describe('mergeImagesToPDF (H4 Fix)', () => {
    it('should return ok=0, fail>0 when all images fail', async () => {
      // 測試：所有圖片都失敗
      const files = [
        path.join(os.tmpdir(), 'non-existent-1.png'),
        path.join(os.tmpdir(), 'non-existent-2.jpg')
      ]
      const outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.pdf`)
      
      const result = await mergeImagesToPDF(files, outputFile)
      
      // 因為所有圖片都失敗，PDF 不會建立
      expect(result.ok).toBe(0)
      expect(result.fail).toBeGreaterThan(0)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return errors with correct format', async () => {
      // 測試：錯誤格式正確
      const files = [path.join(os.tmpdir(), 'non-existent.png')]
      const outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.pdf`)
      
      const result = await mergeImagesToPDF(files, outputFile)
      
      // 驗證錯誤格式
      expect(Array.isArray(result.errors)).toBe(true)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toHaveProperty('file')
      expect(result.errors[0]).toHaveProperty('error')
    })

    it('should return ok=1 with image errors when PDF is successfully created despite some image failures', async () => {
      // 建立測試環境
      const testDir = path.join(os.tmpdir(), `image-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      
      // 建立一個簡單的 1x1 PNG（最小有效 PNG）
      const validImage = path.join(testDir, 'valid.png')
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      await fs.promises.writeFile(validImage, pngBuffer)
      
      const invalidImage = path.join(testDir, 'invalid.png')
      const outputFile = path.join(testDir, 'output.pdf')
      
      try {
        // 核心測試：1 個有效圖片 + 1 個無效圖片
        const result = await mergeImagesToPDF([validImage, invalidImage], outputFile)
        
        // 驗證：PDF 成功建立（因為有 1 張有效圖片）
        expect(result.ok).toBe(1)
        expect(result.fail).toBe(0)
        
        // 驗證：errors 包含無效圖片的錯誤（但不影響 PDF 建立）
        expect(result.errors.length).toBe(1)
        expect(result.errors[0].file).toBe(invalidImage)
        expect(result.errors[0].error).toContain('does not exist')
        
        // 驗證：PDF 檔案確實被建立
        expect(fs.existsSync(outputFile)).toBe(true)
      } finally {
        // 清理
        try {
          await fs.promises.unlink(validImage)
          if (fs.existsSync(outputFile)) await fs.promises.unlink(outputFile)
          await fs.promises.rmdir(testDir)
        } catch {}
      }
    })
  })
})
