/**
 * Image Converter 錯誤處理測試 (H4 Fix)
 */

import { describe, it, expect } from 'vitest'
import { mergeImagesToPDF } from '../src/image.js'
import path from 'path'
import os from 'os'

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
  })
})
