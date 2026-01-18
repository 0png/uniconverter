import path from 'path'
import fs from 'fs'
import { fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } from './utils.js'

// 延遲載入的依賴
let sharp = null
let PDFDocument = null
let heicConvert = null
let pdfToPng = null

let sharpInitialized = false
let pdfLibInitialized = false
let heicInitialized = false
let pdfToPngError = null

async function initSharp() {
  if (sharpInitialized) return sharp !== null
  sharpInitialized = true
  try {
    const mod = await import('sharp')
    sharp = mod.default
    return true
  } catch (e) {
    console.error('[image] Failed to load sharp:', e.message)
    return false
  }
}

async function initPdfLib() {
  if (pdfLibInitialized) return PDFDocument !== null
  pdfLibInitialized = true
  try {
    const mod = await import('pdf-lib')
    PDFDocument = mod.PDFDocument
    return true
  } catch (e) {
    console.error('[image] Failed to load pdf-lib:', e.message)
    return false
  }
}

async function initHeicConvert() {
  if (heicInitialized) return heicConvert !== null
  heicInitialized = true
  try {
    const mod = await import('heic-convert')
    heicConvert = mod.default
    return true
  } catch (e) {
    console.error('[image] Failed to load heic-convert:', e.message)
    return false
  }
}

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
  
  if (!outputBuffer || outputBuffer.byteLength === 0) {
    throw new Error('HEIC conversion failed: output buffer is empty')
  }
  
  return Buffer.from(outputBuffer)
}


/**
 * 使用 sharp 轉換圖片到指定格式
 * @param {import('sharp').Sharp} img - sharp 實例
 * @param {string} format - 目標格式
 * @param {string} outputPath - 輸出路徑
 */
async function convertWithSharp(img, format, outputPath) {
  switch (format) {
    case 'jpg':
    case 'jpeg':
      await img.jpeg({ quality: 90 }).toFile(outputPath)
      break
    case 'png':
      await img.png().toFile(outputPath)
      break
    case 'webp':
      await img.webp({ quality: 90 }).toFile(outputPath)
      break
    case 'ico':
      // ICO 格式：調整大小為標準 ICO 尺寸並轉換
      await img.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath)
      break
    case 'bmp':
      // BMP 格式：sharp 不直接支援，先轉 PNG 再改副檔名（或使用 raw）
      await img.png().toFile(outputPath)
      break
    case 'gif':
      await img.gif().toFile(outputPath)
      break
    case 'tiff':
    case 'tif':
      await img.tiff({ compression: 'lzw' }).toFile(outputPath)
      break
    default:
      await img.toFile(outputPath)
  }
}

/**
 * 批量轉換圖片格式
 * @param {string[]} files - 輸入檔案路徑陣列
 * @param {'png' | 'jpg' | 'webp' | 'ico' | 'bmp' | 'gif' | 'tiff'} format - 目標格式
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
export async function batchConvert(files, format, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  // 初始化 sharp
  const sharpReady = await initSharp()
  if (!sharpReady) {
    return createResult(0, files.length, files.map(f => ({ file: f, error: 'sharp is not available' })))
  }

  // 初始化 heic-convert（如果需要）
  await initHeicConvert()

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
        
        // HEIC 先轉為 PNG buffer，再用 sharp 轉換到目標格式
        const heicFormat = (format === 'jpg' || format === 'jpeg') ? 'JPEG' : 'PNG'
        const buffer = await convertHeicToBuffer(f, heicFormat)
        
        if (format === 'png' || format === 'jpg' || format === 'jpeg') {
          fs.writeFileSync(out, buffer)
        } else {
          // 其他格式需要用 sharp 再轉換
          await convertWithSharp(sharp(buffer), format, out)
        }
        ok++
        continue
      }
      
      // 處理其他格式
      await convertWithSharp(sharp(f), format, out)
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
export async function mergeImagesToPDF(files, outputFile) {
  const errors = []
  
  // 初始化 pdf-lib
  const pdfLibReady = await initPdfLib()
  if (!pdfLibReady) {
    return createResult(0, 1, [{ file: outputFile, error: 'pdf-lib is not available' }])
  }

  // 初始化其他依賴
  await initSharp()
  await initHeicConvert()

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
      return createResult(0, files.length, errors.concat([{ file: outputFile, error: 'No images could be processed' }]))
    }
    
    const bytes = await pdfDoc.save()
    fs.writeFileSync(outputFile, bytes)
    
    // PDF 成功建立，回傳 ok=1, fail=0，但保留圖片錯誤資訊
    return createResult(1, 0, errors)
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
export async function pdfEachPageToImage(files, format, outputDir) {
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

  // 初始化 sharp（用於 JPG 轉換）
  await initSharp()

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
