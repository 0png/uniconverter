const path = require('path')
const { checkDependency, fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } = require('./utils')

// 依賴檢查
const ffmpegDep = checkDependency('fluent-ffmpeg')
const ffmpegPathDep = checkDependency('ffmpeg-static')

let ffmpeg = ffmpegDep.available ? ffmpegDep.module : null
const ffmpegPath = ffmpegPathDep.available ? ffmpegPathDep.module : null

if (ffmpeg && ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
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
async function batchConvertVideo(files, targetExt, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  if (!ffmpeg) {
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
async function extractAudioMp3(files, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  if (!ffmpeg) {
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

module.exports = { batchConvertVideo, extractAudioMp3 }
