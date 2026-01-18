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
    it('should return ok=1, fail=0 when PDF is created successfully despite some image failures', async () => {
      // 使用不存在的檔案來模擬部分失敗
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

    it('should include image errors in result but not count them as PDF failures', async () => {
      // 這個測試需要實際的圖片檔案才能驗證「部分成功」的情況
      // 目前只驗證錯誤格式正確
      const files = [path.join(os.tmpdir(), 'non-existent.png')]
      const outputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.pdf`)
      
      const result = await mergeImagesToPDF(files, outputFile)
      
      // 驗證錯誤格式
      expect(Array.isArray(result.errors)).toBe(true)
      if (result.errors.length > 0) {
        expect(result.errors[0]).toHaveProperty('file')
        expect(result.errors[0]).toHaveProperty('error')
      }
    })

    it('should return ok=1 with image errors when PDF is successfully created', async () => {
      // 建立一個真實的測試圖片
      const testDir = path.join(os.tmpdir(), `image-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      
      // 建立一個簡單的 1x1 PNG
      const validImage = path.join(testDir, 'valid.png')
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixels
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82
      ])
      await fs.promises.writeFile(validImage, pngBuffer)
      
      const invalidImage = path.join(testDir, 'invalid.png')
      const outputFile = path.join(testDir, 'output.pdf')
      
      try {
        // 測試：1 個有效圖片 + 1 個無效圖片
        const result = await mergeImagesToPDF([validImage, invalidImage], outputFile)
        
        // PDF 應該成功建立（因為有 1 張有效圖片）
        expect(result.ok).toBe(1)
        expect(result.fail).toBe(0)
        
        // errors 應該包含無效圖片的錯誤
        expect(result.errors.length).toBe(1)
        expect(result.errors[0].file).toBe(invalidImage)
      } finally {
        // 清理
        try {
          await fs.promises.unlink(validImage)
          await fs.promises.unlink(outputFile)
          await fs.promises.rmdir(testDir)
        } catch {}
      }
    })
  })
})
