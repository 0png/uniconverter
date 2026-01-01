const path = require('path')
const fs = require('fs')
const image = require('./image')
const video = require('./video')
const audio = require('./audio')
async function processAction(action, files, outputDir) {
  const tasks = []
  if (action === '合併圖片為PDF') {
    const out = outputDir || (files[0] ? path.dirname(files[0]) : process.cwd())
    const outFile = path.join(out, `merged_${Date.now()}.pdf`)
    const ok = await image.mergeImagesToPDF(files, outFile)
    return { ok: ok ? 1 : 0, fail: ok ? 0 : files.length }
  }
  if (action === '批量轉PNG') {
    const r = await image.batchConvert(files, 'png', outputDir)
    return r
  }
  if (action === '批量轉JPG') {
    const r = await image.batchConvert(files, 'jpg', outputDir)
    return r
  }
  if (action === 'PDF每頁轉PNG') {
    const r = await image.pdfEachPageToImage(files, 'png', outputDir)
    return r
  }
  if (action === 'PDF每頁轉JPG') {
    const r = await image.pdfEachPageToImage(files, 'jpg', outputDir)
    return r
  }
  if (action === '批量轉MP4') {
    const r = await video.batchConvertVideo(files, 'mp4', outputDir)
    return r
  }
  if (action === '批量轉MOV') {
    const r = await video.batchConvertVideo(files, 'mov', outputDir)
    return r
  }
  if (action === '批量轉/提取MP3') {
    const r = await video.extractAudioMp3(files, outputDir)
    return r
  }
  if (action === '批量轉MP3') {
    const r = await audio.batchConvertAudio(files, 'mp3', outputDir)
    return r
  }
  if (action === '批量轉WAV') {
    const r = await audio.batchConvertAudio(files, 'wav', outputDir)
    return r
  }
  if (action === '批量轉M4A') {
    const r = await audio.batchConvertAudio(files, 'm4a', outputDir)
    return r
  }
  return { ok: 0, fail: files.length }
}
module.exports = { processAction }
