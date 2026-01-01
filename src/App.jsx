import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, FileOutput, Play, Trash2, File as FileIcon, Upload } from "lucide-react"

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
        size: 0 
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
        setProgress(100)
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
    <div className="flex h-screen bg-background text-foreground font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-[200px] border-r border-border p-4 flex flex-col gap-4">
        <div className="font-bold text-lg px-2">UniConvert</div>
        <nav className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start w-full">主頁</Button>
          <Button variant="ghost" className="justify-start w-full">設定</Button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">檔案轉換</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleChooseFiles}>
              <FolderOpen className="mr-2 h-4 w-4" />
              選擇檔案
            </Button>
            <Button variant="outline" onClick={handleChooseOutput}>
              <FileOutput className="mr-2 h-4 w-4" />
              輸出資料夾
            </Button>
            <Button 
              onClick={handleStart}
              disabled={!action || files.length === 0 || isProcessing}
            >
              <Play className="mr-2 h-4 w-4" />
              開始轉換
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>工作區</CardTitle>
            <CardDescription>
              {action ? `目前操作: ${action}` : "請選擇檔案以檢視可用操作"}
            </CardDescription>
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestedActions.map(a => (
                <Button
                  key={a}
                  variant={action === a ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setAction(a)}
                  className="text-xs"
                >
                  {a}
                </Button>
              ))}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 pb-4">
             {/* Drop Area / File List */}
            <div 
              className={`flex-1 border-2 border-dashed rounded-lg flex flex-col overflow-hidden transition-colors ${files.length === 0 ? 'items-center justify-center border-muted-foreground/25 bg-muted/50' : 'border-border bg-card'}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {files.length === 0 ? (
                <div className="text-center p-8">
                  <div className="rounded-full bg-background p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-sm">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">拖曳檔案到此處</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    支援圖片、PDF、音訊與影片檔案
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full w-full">
                  {/* File List Header */}
                  <div className="grid grid-cols-[1fr_100px_80px] gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
                    <div>檔案名稱</div>
                    <div className="text-right">大小</div>
                    <div className="text-right">操作</div>
                  </div>
                  
                  {/* File List Rows */}
                  <div className="flex-1 overflow-auto">
                    {files.map((f, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_80px] gap-4 p-3 border-b last:border-0 items-center hover:bg-muted/50 transition-colors text-sm group">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate" title={f.path}>{f.name}</span>
                        </div>
                        <div className="text-right font-mono text-xs text-muted-foreground">{bytesToSize(f.size || 0)}</div>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{status || (files.length > 0 ? "準備就緒" : "等待操作")}</span>
                <span>{files.length} 個檔案 ({bytesToSize(totalSize)})</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
