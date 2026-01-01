const path = require('path')
const fs = require('fs')
let sharp
try { sharp = require('sharp') } catch (e) { sharp = null }
const { PDFDocument } = (() => { try { return require('pdf-lib') } catch (e) { return {} } })()
let pdfjsLib
let Canvas
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
  const skia = require('skia-canvas')
  Canvas = skia.Canvas
} catch (e) {
  console.error('PDF rendering libs missing', e)
}

async function batchConvert(files, format, outputDir) {
  let ok = 0
  let fail = 0
  for (const f of files) {
    try {
      if (!sharp) throw new Error('sharp_not_available')
      const outDir = outputDir || path.dirname(f)
      const base = path.basename(f, path.extname(f))
      const out = path.join(outDir, `${base}.${format}`)
      const img = sharp(f)
      if (format === 'jpg' || format === 'jpeg') await img.jpeg().toFile(out)
      else if (format === 'png') await img.png().toFile(out)
      else await img.toFile(out)
      ok++
    } catch (e) {
      fail++
    }
  }
  return { ok, fail }
}
async function mergeImagesToPDF(files, outputFile) {
  if (!PDFDocument) return false
  try {
    const pdfDoc = await PDFDocument.create()
    for (const f of files) {
      const ext = path.extname(f).toLowerCase()
      let buffer = null
      try {
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
          buffer = fs.readFileSync(f)
        } else if (sharp) {
          buffer = await sharp(f).jpeg().toBuffer()
        } else {
          continue
        }
      } catch (_) { continue }
      let img
      if (ext === '.png') img = await pdfDoc.embedPng(buffer)
      else img = await pdfDoc.embedJpg(buffer)
      const page = pdfDoc.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    }
    const bytes = await pdfDoc.save()
    fs.writeFileSync(outputFile, bytes)
    return true
  } catch (e) {
    return false
  }
}
async function pdfEachPageToImage(files, format, outputDir) {
  if (!pdfjsLib || !Canvas) return { ok: 0, fail: files.length }
  
  let ok = 0
  let fail = 0
  
  for (const f of files) {
    try {
      const outDir = outputDir || path.dirname(f)
      const base = path.basename(f, path.extname(f))
      
      const data = new Uint8Array(fs.readFileSync(f))
      const loadingTask = pdfjsLib.getDocument({ 
        data, 
        cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/'),
        cMapPacked: true,
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/')
      })
      const doc = await loadingTask.promise
      
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 }) // ~144 DPI
        
        const canvas = new Canvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        
        const out = path.join(outDir, `${base}_${i}.${format}`)
        if (format === 'jpg' || format === 'jpeg') {
           await canvas.saveAs(out, { format: 'jpeg', quality: 90 })
        } else {
           await canvas.saveAs(out, { format: 'png' })
        }
      }
      ok++
    } catch (e) {
      console.error(e)
      fail++
    }
  }
  return { ok, fail }
}
module.exports = { batchConvert, mergeImagesToPDF, pdfEachPageToImage }
