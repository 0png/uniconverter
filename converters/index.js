const path = require('path')
const { ensureDir, createResult } = require('./utils')
const image = require('./image')
const video = require('./video')
const audio = require('./audio')

/**
 * 處理轉換動作
 * @param {string} action - 動作名稱
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
async function processAction(action, files, outputDir) {
  // 輸入驗證
  if (!files || !Array.isArray(files) || files.length === 0) {
    return createResult(0, 0, [{ file: '', error: 'No files provided' }])
  }

  // 確保輸出目錄存在（如果有指定）
  if (outputDir) {
    try {
      await ensureDir(outputDir)
    } catch (e) {
      return createResult(0, files.length, files.map(f => ({ 
        file: f, 
        error: `Failed to create output directory: ${e.message}` 
      })))
    }
  }

  // 動作分發
  switch (action) {
    case '合併圖片為PDF': {
      const out = outputDir || (files[0] ? path.dirname(files[0]) : process.cwd())
      const outFile = path.join(out, `merged_${Date.now()}.pdf`)
      return await image.mergeImagesToPDF(files, outFile)
    }

    case '批量轉PNG':
      return await image.batchConvert(files, 'png', outputDir)

    case '批量轉JPG':
      return await image.batchConvert(files, 'jpg', outputDir)

    case 'PDF每頁轉PNG':
      return await image.pdfEachPageToImage(files, 'png', outputDir)

    case 'PDF每頁轉JPG':
      return await image.pdfEachPageToImage(files, 'jpg', outputDir)

    case '批量轉MP4':
      return await video.batchConvertVideo(files, 'mp4', outputDir)

    case '批量轉MOV':
      return await video.batchConvertVideo(files, 'mov', outputDir)

    case '批量轉/提取MP3':
      return await video.extractAudioMp3(files, outputDir)

    case '批量轉MP3':
      return await audio.batchConvertAudio(files, 'mp3', outputDir)

    case '批量轉WAV':
      return await audio.batchConvertAudio(files, 'wav', outputDir)

    case '批量轉M4A':
      return await audio.batchConvertAudio(files, 'm4a', outputDir)

    default:
      return createResult(0, files.length, files.map(f => ({ 
        file: f, 
        error: `Unknown action: ${action}` 
      })))
  }
}

module.exports = { processAction }
