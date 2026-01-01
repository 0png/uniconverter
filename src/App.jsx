import React, { useState, useEffect, useRef } from 'react'

const bytesToSize = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const detectType = (p) => {
  const ext = (p.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'heic', 'webp', 'bmp'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'document'
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio'
  return 'unknown'
}

function App() {
  const [files, setFiles] = useState([])
  const [outputDir, setOutputDir] = useState(null)
  const [action, setAction] = useState(null)
  const [suggestedActions, setSuggestedActions] = useState([])
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Update suggested actions when files change
    const types = new Set(files.map(f => detectType(f.path)))
    const actions = []
    if (types.has('image')) {
      if (files.length > 1) actions.push('合併圖片為PDF')
      actions.push('批量轉PNG', '批量轉JPG')
    }
    if (types.has('document')) {
      actions.push('PDF每頁轉PNG', 'PDF每頁轉JPG')
    }
    if (types.has('video')) {
      actions.push('批量轉MP4', '批量轉MOV', '批量轉/提取MP3')
    }
    if (types.has('audio')) {
      actions.push('批量轉MP3', '批量轉WAV', '批量轉M4A')
    }
    if (actions.length === 0 && files.length > 0) {
      actions.push('合併圖片為PDF') // Default fallback if needed
    }
    
    // Dedupe actions
    const uniqueActions = Array.from(new Set(actions))
    setSuggestedActions(uniqueActions)
    
    // Reset action if current action is no longer valid, or auto-select if none selected
    if (!uniqueActions.includes(action)) {
      setAction(null)
    }
  }, [files])

  const addFiles = (newFiles) => {
    setFiles(prev => {
      const next = [...prev]
      const seen = new Set(prev.map(f => f.path))
      for (const f of newFiles) {
        if (!seen.has(f.path)) {
          next.push(f)
          seen.add(f.path)
        }
      }
      return next
    })
  }

  const handleChooseFiles = async () => {
    if (!window.api) return setStatus('API 未載入')
    try {
      const paths = await window.api.selectFiles()
      const newFiles = paths.map(p => ({
        path: p,
        name: p.split(/[\\/]/).pop(),
        size: 0 // Electron dialog doesn't return size, would need fs.stat in main process or here if we had access. 
                // Since original code pushed size:0 for chosen files (only drop had size), we stick to that or improve later.
      }))
      addFiles(newFiles)
    } catch (e) {
      console.error(e)
      setStatus('選擇檔案失敗')
    }
  }

  const handleChooseOutput = async () => {
    if (!window.api) return
    const dir = await window.api.selectDir()
    if (dir) setOutputDir(dir)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dt = e.dataTransfer
    const fileList = dt.files
    const newFiles = []
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      // In Electron renderer with contextIsolation: false or preload exposing path
      // File object usually has 'path' property.
      const path = f.path || f.name 
      newFiles.push({ path, name: f.name, size: f.size })
    }
    addFiles(newFiles)
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleStart = async () => {
    if (!files.length || !action) {
      setStatus('請先選擇檔案與操作')
      return
    }
    setIsProcessing(true)
    setProgress(0)
    setStatus('執行中...')
    
    try {
      const payload = {
        action,
        files: files.map(f => f.path),
        output_dir: outputDir || null
      }
      const r = await window.api.doAction(payload)
      if (r && r.ok && r.data) {
        setProgress(1)
        setStatus(`完成 成功:${r.data.ok} 失敗:${r.data.fail}`)
        alert(`成功 ${r.data.ok}，失敗 ${r.data.fail}`)
      } else {
        setStatus('執行失敗')
        alert('執行失敗')
      }
    } catch (e) {
      console.error(e)
      setStatus('執行失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

  return (
    <div className="flex h-screen bg-bg text-text font-sans select-none">
      {/* Sidebar */}
      <div className="w-[200px] bg-surface border-r border-border p-3 flex flex-col">
        <div className="font-bold text-base mb-2 text-text">UniConvert</div>
        <button className="btn nav">主頁</button>
        <button className="btn nav">設定</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 text-xl font-bold text-right">UniConvert 檔案轉換</div>
        
        {/* Toolbar */}
        <div className="flex gap-2 px-3 pb-2">
          <button className="btn" onClick={handleChooseFiles}>Choose Files</button>
          <button className="btn" onClick={handleChooseOutput}>Output Folder</button>
          <button 
            className="btn primary" 
            onClick={handleStart}
            disabled={!action || files.length === 0 || isProcessing}
          >
            開始轉換
          </button>
        </div>

        {/* Main Area */}
        <div className="flex flex-1 px-3 pb-3 gap-3 overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 bg-surface border border-border rounded-xl p-3 flex flex-col overflow-hidden">
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-2 min-h-[36px]">
              {suggestedActions.map(a => (
                <button
                  key={a}
                  className={`btn option ${action === a ? 'active' : ''}`}
                  onClick={() => setAction(a)}
                >
                  {a}
                </button>
              ))}
            </div>

            {/* Drop Area / File List */}
            <div 
              className={`flex-1 bg-surface2 border border-dashed border-border rounded-xl flex flex-col overflow-hidden ${files.length === 0 ? 'items-center justify-center gap-2' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {files.length === 0 ? (
                <div className="text-center">
                  <div className="text-muted text-sm">拖曳檔案到此處</div>
                  <div className="text-muted text-xs mt-1">提示：可直接拖曳或使用上方按鈕加入檔案</div>
                </div>
              ) : (
                <div className="flex flex-col h-full w-full">
                  {/* File List Header */}
                  <div className="grid grid-cols-[1fr_120px_80px] gap-3 p-2 bg-surface2 border-b border-border font-bold shrink-0">
                    <div>Filename</div>
                    <div className="text-right">Size</div>
                    <div className="text-right">Remove</div>
                  </div>
                  
                  {/* File List Rows */}
                  <div className="flex-1 overflow-auto">
                    {files.map((f, i) => (
                      <div key={i} className="grid grid-cols-[1fr_120px_80px] gap-3 p-2 border-b border-border items-center hover:bg-surface transition-colors">
                        <div className="truncate" title={f.path}>{f.name}</div>
                        <div className="text-right font-mono text-sm">{bytesToSize(f.size || 0)}</div>
                        <div className="text-right">
                          <button 
                            className="btn text-xs py-1 px-2 h-auto"
                            onClick={() => removeFile(i)}
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="p-2 text-muted text-sm border-t border-border shrink-0 bg-surface2">
                    {files.length} file(s) selected. Total size: {bytesToSize(totalSize)}
                  </div>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="h-2.5 bg-surface2 border border-border rounded-md my-2 overflow-hidden shrink-0">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
              ></div>
            </div>

            {/* Status */}
            <div className="text-muted text-xs min-h-[20px] shrink-0">{status}</div>

            {/* Footer */}
            <div className="flex justify-start mt-2 shrink-0">
              <button 
                className="btn primary" 
                onClick={handleStart}
                disabled={!action || files.length === 0 || isProcessing}
              >
                開始轉換
              </button>
            </div>

          </div>

          {/* Right Panel (Placeholder) */}
          <div className="w-0"></div>
        </div>
      </div>
    </div>
  )
}

export default App
