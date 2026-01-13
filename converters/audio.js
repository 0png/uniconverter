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
async function batchConvertAudio(files, targetExt, outputDir) {
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
      
      await runConvert(f, out, targetExt)
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}

module.exports = { batchConvertAudio }
