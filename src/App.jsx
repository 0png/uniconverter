import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { FolderOpen, Play, Trash2, File as FileIcon, Upload, Settings, Home, Sun, Moon, Monitor, Languages } from "lucide-react"

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

const translations = {
  en: {
    title: "File Converter",
    selectFiles: "Select Files",
    start: "Start Convert",
    workspace: "Workspace",
    selectAction: "Please select files to view available actions",
    currentAction: "Current Action",
    dragDrop: "Drag files here",
    dragDropDesc: "Supports images, PDF, audio and video files",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    outputLocation: "Output Location",
    sourceLocation: "Original File Location",
    customFolder: "Custom Folder",
    light: "Light",
    dark: "Dark",
    system: "System",
    files: "files",
    ready: "Ready",
    waiting: "Waiting",
    processing: "Processing...",
    completed: "Completed",
    success: "Success",
    fail: "Fail",
    fileName: "File Name",
    size: "Size",
    action: "Action",
    apiError: "API not loaded",
    selectFail: "Failed to select files",
    selectActionFirst: "Please select files and action first",
    executing: "Executing...",
    execFail: "Execution failed",
    actions: {
      '合併圖片為PDF': 'Merge Images to PDF',
      '批量轉PNG': 'Batch to PNG',
      '批量轉JPG': 'Batch to JPG',
      'PDF每頁轉PNG': 'PDF Pages to PNG',
      'PDF每頁轉JPG': 'PDF Pages to JPG',
      '批量轉MP4': 'Batch to MP4',
      '批量轉MOV': 'Batch to MOV',
      '批量轉/提取MP3': 'Batch to/Extract MP3',
      '批量轉MP3': 'Batch to MP3',
      '批量轉WAV': 'Batch to WAV',
      '批量轉M4A': 'Batch to M4A'
    }
  },
  "zh-TW": {
    title: "檔案轉換",
    selectFiles: "選擇檔案",
    start: "開始轉換",
    workspace: "工作區",
    selectAction: "請選擇檔案以檢視可用操作",
    currentAction: "目前操作",
    dragDrop: "拖曳檔案到此處",
    dragDropDesc: "支援圖片、PDF、音訊與影片檔案",
    settings: "設定",
    theme: "外觀主題",
    language: "語言",
    outputLocation: "儲存位置",
    sourceLocation: "原始檔案位置",
    customFolder: "自訂資料夾",
    light: "淺色",
    dark: "深色",
    system: "系統預設",
    files: "個檔案",
    ready: "準備就緒",
    waiting: "等待操作",
    processing: "執行中...",
    completed: "完成",
    success: "成功",
    fail: "失敗",
    fileName: "檔案名稱",
    size: "大小",
    action: "操作",
    apiError: "API 未載入",
    selectFail: "選擇檔案失敗",
    selectActionFirst: "請先選擇檔案與操作",
    executing: "執行中...",
    execFail: "執行失敗",
    actions: {
      '合併圖片為PDF': '合併圖片為PDF',
      '批量轉PNG': '批量轉PNG',
      '批量轉JPG': '批量轉JPG',
      'PDF每頁轉PNG': 'PDF每頁轉PNG',
      'PDF每頁轉JPG': 'PDF每頁轉JPG',
      '批量轉MP4': '批量轉MP4',
      '批量轉MOV': '批量轉MOV',
      '批量轉/提取MP3': '批量轉/提取MP3',
      '批量轉MP3': '批量轉MP3',
      '批量轉WAV': '批量轉WAV',
      '批量轉M4A': '批量轉M4A'
    }
  }
}

function App() {
  // --- View State ---
  const [currentView, setCurrentView] = useState('home') // 'home' | 'settings'

  // --- Settings State ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'system')
  
  // Output: { mode: 'source' | 'custom', path: string }
  const [outputConfig, setOutputConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('outputConfig')) || { mode: 'source', path: '' }
    } catch {
      return { mode: 'source', path: '' }
    }
  })

  // --- App State ---
  const [files, setFiles] = useState([])
  const [action, setAction] = useState(null)
  const [suggestedActions, setSuggestedActions] = useState([])
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // --- Effects ---

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  useEffect(() => {
    localStorage.setItem('outputConfig', JSON.stringify(outputConfig))
  }, [outputConfig])

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const applySystem = () => {
        root.classList.remove('light', 'dark')
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
      }
      
      applySystem()
      mediaQuery.addEventListener('change', applySystem)
      return () => mediaQuery.removeEventListener('change', applySystem)
    }

    root.classList.add(theme)
  }, [theme])

  // File Analysis
  useEffect(() => {
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
      actions.push('合併圖片為PDF')
    }
    
    const uniqueActions = Array.from(new Set(actions))
    setSuggestedActions(uniqueActions)
    
    if (!uniqueActions.includes(action)) {
      setAction(null)
    }
  }, [files])

  // --- Translation Helper ---
  const getLanguage = () => {
    if (language === 'system') {
      return navigator.language.startsWith('zh') ? 'zh-TW' : 'en'
    }
    return language
  }
  
  const t = (key) => {
    const lang = getLanguage()
    return translations[lang]?.[key] || translations['en'][key] || key
  }

  const tAction = (act) => {
    const lang = getLanguage()
    return translations[lang]?.actions?.[act] || act
  }

  // --- Handlers ---

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
    if (!window.api) return setStatus(t('apiError'))
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
      setStatus(t('selectFail'))
    }
  }

  const handleChooseOutputPath = async () => {
    if (!window.api) return
    const dir = await window.api.selectDir()
    if (dir) {
      setOutputConfig(prev => ({ ...prev, path: dir, mode: 'custom' }))
    }
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
      setStatus(t('selectActionFirst'))
      return
    }
    setIsProcessing(true)
    setProgress(0)
    setStatus(t('executing'))
    
    try {
      const payload = {
        action,
        files: files.map(f => f.path),
        output_dir: outputConfig.mode === 'custom' ? outputConfig.path : null
      }
      const r = await window.api.doAction(payload)
      if (r && r.ok && r.data) {
        setProgress(100)
        setStatus(`${t('completed')} ${t('success')}:${r.data.ok} ${t('fail')}:${r.data.fail}`)
        // alert(`${t('success')} ${r.data.ok}，${t('fail')} ${r.data.fail}`)
      } else {
        setStatus(t('execFail'))
        // alert(t('execFail'))
      }
    } catch (e) {
      console.error(e)
      setStatus(t('execFail'))
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

  // --- Views ---

  const HomeView = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleChooseFiles}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t('selectFiles')}
          </Button>
          <Button 
            onClick={handleStart}
            disabled={!action || files.length === 0 || isProcessing}
          >
            <Play className="mr-2 h-4 w-4" />
            {t('start')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>{t('workspace')}</CardTitle>
          <CardDescription>
            {action ? `${t('currentAction')}: ${tAction(action)}` : t('selectAction')}
          </CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestedActions.map(a => (
              <Button
                key={a}
                variant={action === a ? "default" : "secondary"}
                size="sm"
                onClick={() => setAction(a)}
                className="text-xs"
              >
                {tAction(a)}
              </Button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 pb-4">
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
                <h3 className="text-lg font-semibold">{t('dragDrop')}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('dragDropDesc')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                <div className="grid grid-cols-[1fr_100px_80px] gap-4 p-3 border-b bg-muted/50 text-sm font-medium">
                  <div>{t('fileName')}</div>
                  <div className="text-right">{t('size')}</div>
                  <div className="text-right">{t('action')}</div>
                </div>
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
              <span>{status || (files.length > 0 ? t('ready') : t('waiting'))}</span>
              <span>{files.length} {t('files')} ({bytesToSize(totalSize)})</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const SettingsView = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('settings')}</h1>
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('home')}>
          <Home className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          
          {/* Language */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Label className="text-base">{t('language')}</Label>
            <div className="w-full sm:w-64">
              <Select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="system">{t('system')}</option>
                <option value="en">English</option>
                <option value="zh-TW">繁體中文</option>
              </Select>
            </div>
          </div>

          {/* Theme */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Label className="text-base">{t('theme')}</Label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant={theme === 'light' ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1 sm:flex-none sm:w-24"
              >
                <Sun className="mr-2 h-4 w-4" />
                {t('light')}
              </Button>
              <Button 
                variant={theme === 'dark' ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1 sm:flex-none sm:w-24"
              >
                <Moon className="mr-2 h-4 w-4" />
                {t('dark')}
              </Button>
              <Button 
                variant={theme === 'system' ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex-1 sm:flex-none sm:w-24"
              >
                <Monitor className="mr-2 h-4 w-4" />
                {t('system')}
              </Button>
            </div>
          </div>

          {/* Output Location */}
          <div className="flex flex-col gap-3">
            <Label className="text-base">{t('outputLocation')}</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant={outputConfig.mode === 'source' ? "default" : "outline"}
                  onClick={() => setOutputConfig(prev => ({ ...prev, mode: 'source' }))}
                  className="flex-1 sm:flex-none sm:w-40"
                >
                  {t('sourceLocation')}
                </Button>
                <Button 
                  variant={outputConfig.mode === 'custom' ? "default" : "outline"}
                  onClick={() => setOutputConfig(prev => ({ ...prev, mode: 'custom' }))}
                  className="flex-1 sm:flex-none sm:w-40"
                >
                  {t('customFolder')}
                </Button>
              </div>
            </div>
            {outputConfig.mode === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Input 
                  value={outputConfig.path} 
                  readOnly 
                  placeholder={t('selectFiles')} // Reusing "Select Files" or should be "Select Folder" but "Select Files" text is "選擇檔案". Let's use custom text
                  className="flex-1"
                />
                <Button variant="secondary" onClick={handleChooseOutputPath}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

        </div>
      </Card>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {currentView === 'home' ? <HomeView /> : <SettingsView />}
    </div>
  )
}

export default App
