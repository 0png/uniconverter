const path = require('path')
let ffmpeg
let ffmpegPath
try { ffmpeg = require('fluent-ffmpeg') } catch (e) { ffmpeg = null }
try { ffmpegPath = require('ffmpeg-static') } catch (e) { ffmpegPath = null }
if (ffmpeg && ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
async function runConvert(input, output, codec) {
  return new Promise((resolve, reject) => {
    if (!ffmpeg) return reject(new Error('ffmpeg_not_available'))
    const cmd = ffmpeg(input)
    if (codec === 'mp3') cmd.audioCodec('libmp3lame')
    if (codec === 'm4a') cmd.audioCodec('aac')
    cmd.output(output).on('end', () => resolve(true)).on('error', () => reject(new Error('ffmpeg_error'))).run()
  })
}
async function batchConvertAudio(files, targetExt, outputDir) {
  let ok = 0
  let fail = 0
  for (const f of files) {
    try {
      const outDir = outputDir || path.dirname(f)
      const base = path.basename(f, path.extname(f))
      const out = path.join(outDir, `${base}.${targetExt}`)
      await runConvert(f, out, targetExt)
      ok++
    } catch (e) {
      fail++
    }
  }
  return { ok, fail }
}
module.exports = { batchConvertAudio }
