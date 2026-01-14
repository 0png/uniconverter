import path from 'path'
import { fileExists, ensureDir, getUniqueFilename, createResult, getOutputDir } from './utils.js'

// 動態載入 md-to-pdf
let mdToPdf = null
let mdToPdfError = null

async function loadMdToPdf() {
  if (mdToPdf) return true
  if (mdToPdfError) return false
  
  try {
    console.log('[loadMdToPdf] Loading md-to-pdf...')
    const module = await import('md-to-pdf')
    mdToPdf = module.mdToPdf
    console.log('[loadMdToPdf] Loaded successfully')
    return true
  } catch (e) {
    mdToPdfError = e.message
    console.error('[loadMdToPdf] Failed:', e.message)
    return false
  }
}

/**
 * 批量將 Markdown 檔案轉換為 PDF
 * @param {string[]} files - 輸入 Markdown 檔案路徑陣列
 * @param {string | null} outputDir - 輸出目錄
 * @returns {Promise<{ ok: number, fail: number, errors: Array }>}
 */
export async function markdownToPdf(files, outputDir) {
  const errors = []
  let ok = 0
  let fail = 0

  console.log('[markdownToPdf] Starting, files:', files.length)
  
  // 動態載入 md-to-pdf
  const loaded = await loadMdToPdf()
  
  if (!loaded || !mdToPdf) {
    const errorMsg = mdToPdfError || 'md-to-pdf is not available'
    console.error('[markdownToPdf] md-to-pdf not available:', errorMsg)
    return createResult(0, files.length, files.map(f => ({ 
      file: f, 
      error: errorMsg
    })))
  }

  for (const f of files) {
    try {
      console.log('[markdownToPdf] Processing:', f)
      
      // 驗證檔案存在
      if (!await fileExists(f)) {
        errors.push({ file: f, error: 'File does not exist' })
        fail++
        continue
      }

      const outDir = getOutputDir(f, outputDir)
      await ensureDir(outDir)
      
      const base = path.basename(f, path.extname(f))
      const out = getUniqueFilename(outDir, base, 'pdf')
      
      console.log('[markdownToPdf] Converting to:', out)
      
      // 使用 md-to-pdf 轉換
      const pdf = await mdToPdf(
        { path: f },
        {
          dest: out,
          pdf_options: {
            format: 'A4',
            margin: {
              top: '20mm',
              right: '20mm',
              bottom: '20mm',
              left: '20mm'
            },
            printBackground: true
          },
          stylesheet: null,
          css: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              max-width: 100%;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }
            h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
            h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
            h3 { font-size: 1.25em; }
            code {
              background-color: #f6f8fa;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
              font-size: 85%;
            }
            pre {
              background-color: #f6f8fa;
              padding: 16px;
              border-radius: 6px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            blockquote {
              border-left: 4px solid #dfe2e5;
              padding-left: 16px;
              margin-left: 0;
              color: #6a737d;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #dfe2e5;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f6f8fa;
              font-weight: 600;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #0366d6;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            hr {
              border: none;
              border-top: 1px solid #eee;
              margin: 2em 0;
            }
            ul, ol {
              padding-left: 2em;
            }
            li {
              margin: 0.25em 0;
            }
          `
        }
      )
      
      if (pdf && pdf.filename) {
        console.log('[markdownToPdf] Successfully converted:', pdf.filename)
        ok++
      } else {
        throw new Error('PDF generation failed - no output file')
      }
    } catch (e) {
      console.error('[markdownToPdf] Error processing', f, ':', e.message)
      errors.push({ file: f, error: e.message || String(e) })
      fail++
    }
  }
  
  console.log('[markdownToPdf] Done. ok:', ok, 'fail:', fail)
  return createResult(ok, fail, errors)
}
