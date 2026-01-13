const path = require('path')
const fs = require('fs')
const { checkDependency, fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } = require('./utils')

// 依賴檢查
const sharpDep = checkDependency('sharp')
const pdfLibDep = checkDependency('pdf-lib')
const heicConvertDep = checkDependency('heic-convert')

const sharp = sharpDep.available ? sharpDep.module : null
const PDFDocument = pdfLibDep.available ? pdfLibDep.module.PDFDocument : null
const heicConvert = heicConvertDep.available ? heicConvertDep.module : null

// pdf-to-png-converter 使用動態載入
let pdfToPng = null
let pdfToPngError = null

async function loadPdfToPng() {
  if (pdfToPng) return true
  if (pdfToPngError) return false
  
  try {
    console.log('[loadPdfToPng] Loading pdf-to-png-converter...')
    const module = await import('pdf-to-png-converter')
    pdfToPng = module.pdfToPng
    console.log('[loadPdfToPng] Loaded successfully')
    return true
  } catch (e) {
    pdfToPngError = e.message
    console.error('[loadPdfToPng] Failed:', e.message)
    return false
  }
}

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

  console.log('[pdfEachPageToImage] Starting, files:', files.length, 'format:', format)
  
  // 動態載入 pdf-to-png-converter
  const loaded = await loadPdfToPng()
  
  if (!loaded || !pdfToPng) {
    const errorMsg = pdfToPngError || 'pdf-to-png-converter is not available'
    console.error('[pdfEachPageToImage] PDF converter not available:', errorMsg)
    return createResult(0, files.length, files.map(f => ({ 
      file: f, 
      error: errorMsg
    })))
  }

  for (const f of files) {
    try {
      console.log('[pdfEachPageToImage] Processing:', f)
      
      // 驗證檔案存在
      if (!await fileExists(f)) {
        errors.push({ file: f, error: 'File does not exist' })
        fail++
        continue
      }

      const outDir = getOutputDir(f, outputDir)
      await ensureDir(outDir)
      
      const base = path.basename(f, path.extname(f))
      
      console.log('[pdfEachPageToImage] Converting PDF to PNG...')
      // 使用 pdf-to-png-converter 轉換
      const pngPages = await pdfToPng(f, {
        disableFontFace: false,
        useSystemFonts: true,
        viewportScale: 2.0 // ~144 DPI
      })
      
      console.log('[pdfEachPageToImage] Got', pngPages.length, 'pages')
      
      for (let i = 0; i < pngPages.length; i++) {
        const page = pngPages[i]
        const pageNum = i + 1
        const out = path.join(outDir, `${base}_${pageNum}.${format}`)
        
        console.log('[pdfEachPageToImage] Saving page', pageNum, 'to:', out)
        
        if (format === 'jpg' || format === 'jpeg') {
          // 使用 sharp 轉換為 JPG
          if (sharp) {
            await sharp(page.content).jpeg({ quality: 90 }).toFile(out)
          } else {
            // 如果沒有 sharp，先存為 PNG 再提示
            const pngOut = path.join(outDir, `${base}_${pageNum}.png`)
            fs.writeFileSync(pngOut, page.content)
            errors.push({ file: f, error: `Page ${pageNum} saved as PNG (sharp not available for JPG conversion)` })
          }
        } else {
          // PNG 格式直接儲存
          fs.writeFileSync(out, page.content)
        }
      }
      
      ok++
      console.log('[pdfEachPageToImage] File completed:', f)
    } catch (e) {
      console.error('[pdfEachPageToImage] Error processing', f, ':', e.message)
      console.error('[pdfEachPageToImage] Stack:', e.stack)
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  console.log('[pdfEachPageToImage] Done. ok:', ok, 'fail:', fail)
  return createResult(ok, fail, errors)
}

module.exports = { batchConvert, mergeImagesToPDF, pdfEachPageToImage }
