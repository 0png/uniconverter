import path from 'path'
import { fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } from './utils.js'

// 延遲載入的依賴
let ffmpeg = null
let ffmpegPath = null
let ffmpegInitialized = false

/**
 * 初始化 FFmpeg
 */
async function initFfmpeg() {
  if (ffmpegInitialized) return ffmpeg !== null
  ffmpegInitialized = true
  
  try {
    const ffmpegModule = await import('fluent-ffmpeg')
    ffmpeg = ffmpegModule.default
    
    const ffmpegPathModule = await import('ffmpeg-static')
    ffmpegPath = ffmpegPathModule.default
    
    if (ffmpeg && ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath)
    }
    return true
  } catch (e) {
    console.error('[audio] Failed to initialize FFmpeg:', e.message)
    return false
  }
}

/**
 * 取得音訊編碼器
 * @param {string} codec - 目標格式
 * @returns {string | null}
 */
function getAudioCodec(codec) {
  const codecMap = {
    'mp3': 'libmp3lame',
    'm4a': 'aac',
    'wav': null // WAV 不需要特定編碼器
  }
  return codecMap[codec] !== undefined ? codecMap[codec] : null
}

/**
 * 執行音訊轉換
 * @param {string} input - 輸入檔案路徑
 * @param {string} output - 輸出檔案路徑
 * @param {string} codec - 目標格式
 * @returns {Promise<boolean>}
 */
async function runConvert(input, output, codec) {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) {
      return reject(new Error('FFmpeg is not available'))
    }
    
    const cmd = ffmpeg(input)
    const audioCodec = getAudioCodec(codec)
    
    if (audioCodec) {
      cmd.audioCodec(audioCodec)
    }
    
    cmd.output(output)
      .on('end', () => resolve(true))
      .on('error', (err) => reject(new Error(err.message || 'FFmpeg conversion failed')))
      .run()
  })
}

/**
 * 批量轉換音訊格式
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {'mp3' | 'wav' | 'm4a'} targetExt - 目標格式
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
export async function batchConvertAudio(files, targetExt, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  // 初始化 FFmpeg
  const initialized = await initFfmpeg()
  if (!initialized) {
    return createResult(0, files.length, files.map(f => ({ 
      file: f, 
      error: 'FFmpeg is not available. Please ensure fluent-ffmpeg and ffmpeg-static are installed.' 
    })))
  }

  for (const f of files) {
    try {
      // 驗證檔案存在
      if (!await fileExists(f)) {
        errors.push({ file: f, error: 'File does not exist' })
        fail++
        continue
      }

      const outDir = getOutputDir(f, outputDir)
      await ensureDir(outDir)
      
      const base = path.basename(f, path.extname(f))
      const out = getUniqueFilename(outDir, base, targetExt)
      
      await runConvert(f, out, targetExt)
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}
