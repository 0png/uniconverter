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
    console.error('[video] Failed to initialize FFmpeg:', e.message)
    return false
  }
}

/**
 * 執行 FFmpeg 轉換
 * @param {string} input - 輸入檔案路徑
 * @param {string} output - 輸出檔案路徑
 * @param {Object} config - 轉換設定
 * @returns {Promise<boolean>}
 */
async function runConvert(input, output, config = {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) {
      return reject(new Error('FFmpeg is not available'))
    }
    
    const cmd = ffmpeg(input)
    
    if (config.noVideo) {
      cmd.noVideo()
    }
    if (config.audioCodec) {
      cmd.audioCodec(config.audioCodec)
    }
    if (config.videoCodec) {
      cmd.videoCodec(config.videoCodec)
    }
    
    cmd.output(output)
      .on('end', () => resolve(true))
      .on('error', (err) => reject(new Error(err.message || 'FFmpeg conversion failed')))
      .run()
  })
}

/**
 * 批量轉換影片格式
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {'mp4' | 'mov'} targetExt - 目標格式
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
export async function batchConvertVideo(files, targetExt, outputDir) {
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
      
      await runConvert(f, out)
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}

/**
 * 從影片提取音訊為 MP3
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
export async function extractAudioMp3(files, outputDir) {
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
      const out = getUniqueFilename(outDir, base, 'mp3')
      
      await runConvert(f, out, { noVideo: true, audioCodec: 'libmp3lame' })
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}
