const path = require('path')
const fs = require('fs')
const { checkDependency, fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } = require('./utils')

// 依賴檢查
const sharpDep = checkDependency('sharp')
const pdfLibDep = checkDependency('pdf-lib')
const heicConvertDep = checkDependency('heic-convert')

let pdfjsLib = null
let Canvas = null
let pdfLoadError = null

// 動態載入 pdfjs-dist (ESM 模組)
async function loadPdfJs() {
  if (pdfjsLib) return true
  if (pdfLoadError) return false
  
  try {
    // 使用動態 import 載入 ESM 模組
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjsLib = pdfjs
    
    // 載入 skia-canvas
    const skia = require('skia-canvas')
    Canvas = skia.Canvas
    
    return true
  } catch (e) {
    pdfLoadError = e.message
    console.error('PDF rendering libs missing:', e.message)
    return false
  }
}

const sharp = sharpDep.available ? sharpDep.module : null
const PDFDocument = pdfLibDep.available ? pdfLibDep.module.PDFDocument : null
const heicConvert = heicConvertDep.available ? heicConvertDep.module : null

/**
 * 檢查是否為 HEIC/HEIF 格式
 * @param {string} filePath - 檔案路徑
 * @returns {boolean}
 */
function isHeicFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.heic' || ext === '.heif'
}

/**
 * 將 HEIC 檔案轉換為 Buffer
 * @param {string} filePath - HEIC 檔案路徑
 * @param {'JPEG' | 'PNG'} format - 目標格式
 * @returns {Promise<Buffer>}
 */
async function convertHeicToBuffer(filePath, format) {
  if (!heicConvert) {
    throw new Error('heic-convert is not available. Please install it with: npm install heic-convert')
  }
  
  const inputBuffer = fs.readFileSync(filePath)
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: format,
    quality: 0.9
  })
  
  return Buffer.from(outputBuffer)
}

/**
 * 批量轉換圖片格式
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {'png' | 'jpg'} format - 目標格式
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
async function batchConvert(files, format, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  if (!sharp) {
    return createResult(0, files.length, files.map(f => ({ file: f, error: 'sharp is not available' })))
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
      const out = getUniqueFilename(outDir, base, format)
      
      // 處理 HEIC/HEIF 格式
      if (isHeicFile(f)) {
        if (!heicConvert) {
          errors.push({ file: f, error: 'heic-convert is not available for HEIC files' })
          fail++
          continue
        }
        
        const heicFormat = format === 'png' ? 'PNG' : 'JPEG'
        const buffer = await convertHeicToBuffer(f, heicFormat)
        fs.writeFileSync(out, buffer)
        ok++
        continue
      }
      
      // 處理其他格式
      const img = sharp(f)
      if (format === 'jpg' || format === 'jpeg') {
        await img.jpeg({ quality: 90 }).toFile(out)
      } else if (format === 'png') {
        await img.png().toFile(out)
      } else {
        await img.toFile(out)
      }
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}

/**
 * 合併多張圖片為 PDF
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {string} outputFile - 輸出 PDF 路徑
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
async function mergeImagesToPDF(files, outputFile) {
  const errors = []
  
  if (!PDFDocument) {
    return createResult(0, 1, [{ file: outputFile, error: 'pdf-lib is not available' }])
  }

  try {
    // 確保輸出目錄存在
    await ensureDir(path.dirname(outputFile))
    
    const pdfDoc = await PDFDocument.create()
    let successCount = 0
    
    for (const f of files) {
      try {
        // 驗證檔案存在
        if (!await fileExists(f)) {
          errors.push({ file: f, error: 'File does not exist' })
          continue
        }

        const ext = path.extname(f).toLowerCase()
        let buffer = null
        let isPng = ext === '.png'
        
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
          buffer = fs.readFileSync(f)
        } else if (isHeicFile(f)) {
          // 處理 HEIC/HEIF 格式
          if (!heicConvert) {
            errors.push({ file: f, error: 'heic-convert is not available for HEIC files' })
            continue
          }
          buffer = await convertHeicToBuffer(f, 'JPEG')
          isPng = false
        } else if (sharp) {
          // 轉換其他格式為 JPEG
          buffer = await sharp(f).jpeg({ quality: 90 }).toBuffer()
          isPng = false
        } else {
          errors.push({ file: f, error: 'Unsupported format and sharp is not available' })
          continue
        }
        
        let img
        if (isPng) {
          img = await pdfDoc.embedPng(buffer)
        } else {
          img = await pdfDoc.embedJpg(buffer)
        }
        
        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        successCount++
      } catch (e) {
        errors.push({ file: f, error: e.message || String(e) })
      }
    }
    
    if (successCount === 0) {
      return createResult(0, 1, [{ file: outputFile, error: 'No images could be processed' }])
    }
    
    const bytes = await pdfDoc.save()
    fs.writeFileSync(outputFile, bytes)
    
    return createResult(1, errors.length > 0 ? 1 : 0, errors)
  } catch (e) {
    return createResult(0, 1, [{ file: outputFile, error: e.message || String(e) }])
  }
}

/**
 * 將 PDF 每頁轉換為圖片
 * @param {string[]} files - 輸入 PDF 檔案路徑陣列
 * @param {'png' | 'jpg'} format - 目標格式
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
async function pdfEachPageToImage(files, format, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  // 動態載入 pdfjs
  const pdfLoaded = await loadPdfJs()
  
  if (!pdfLoaded || !pdfjsLib || !Canvas) {
    const errorMsg = pdfLoadError || 'pdfjs-dist or skia-canvas is not available'
    return createResult(0, files.length, files.map(f => ({ 
      file: f, 
      error: errorMsg
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
      const data = new Uint8Array(fs.readFileSync(f))
      
      const loadingTask = pdfjsLib.getDocument({
        data,
        cMapUrl: path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/'),
        cMapPacked: true,
        standardFontDataUrl: path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/'),
        useSystemFonts: true
      })
      
      const doc = await loadingTask.promise
      
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 }) // ~144 DPI
        
        const canvas = new Canvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
        
        const out = path.join(outDir, `${base}_${i}.${format}`)
        
        if (format === 'jpg' || format === 'jpeg') {
          await canvas.saveAs(out, { format: 'jpeg', quality: 90 })
        } else {
          await canvas.saveAs(out, { format: 'png' })
        }
      }
      
      ok++
    } catch (e) {
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  return createResult(ok, fail, errors)
}

module.exports = { batchConvert, mergeImagesToPDF, pdfEachPageToImage }
