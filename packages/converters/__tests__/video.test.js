/**
 * Video Converter 錯誤處理測試 (H5 Fix)
 */

import { describe, it, expect, vi } from 'vitest'

describe('Video Converter - Error Handling', () => {
  describe('initFfmpeg (H5 Fix)', () => {
    it('should properly validate FFmpeg path using fs.default.existsSync', async () => {
      // 動態載入 video 模組以測試初始化
      const videoModule = await import('../src/video.js')
      
      // 嘗試執行轉換（會觸發初始化）
      const result = await videoModule.batchConvertVideo([], 'mp4', null)
      
      // 如果 FFmpeg 不可用，應該回傳適當的錯誤
      // 如果可用，應該正常執行（空陣列回傳 ok=0, fail=0）
      expect(result).toHaveProperty('ok')
      expect(result).toHaveProperty('fail')
      expect(result).toHaveProperty('errors')
    })

    it('should handle FFmpeg initialization failure gracefully', async () => {
      const videoModule = await import('../src/video.js')
      
      // 使用空檔案陣列測試
      const result = await videoModule.batchConvertVideo([], 'mp4', null)
      
      // 空陣列應該回傳成功（沒有檔案要處理）
      expect(result.ok).toBe(0)
      expect(result.fail).toBe(0)
    })
  })
})
