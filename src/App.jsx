import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { TaskGroup } from "@/components/TaskGroup"
import { FolderOpen, Play, Upload, Settings, Home, Sun, Moon, Monitor, Info, Trash2 } from "lucide-react"
import { 
  createInitialTaskQueue, 
  groupFilesToQueue, 
  getActiveGroupTypes,
  getTotalFileCount,
  getTotalFileSize,
  isAnyProcessing,
  hasEnabledGroups,
  availableActions
} from "@/lib/taskQueue"

const bytesToSize = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const translations = {
  en: {
    title: "File Converter",
    appName: "UniConvert",
    selectFiles: "Select Files",
    start: "Start Convert",
    startAll: "Start All",
    startGroup: "Start",
    workspace: "Workspace",
    selectAction: "Please select files to view available actions",
    currentAction: "Current Action",
    dragDrop: "Drag files here",
    dragDropDesc: "Supports images, PDF, audio and video files",
    settings: "Settings",
    about: "About",
    supportedFormats: "Supported Formats",
    formats_images: "Images: PNG, JPG, JPEG, HEIC, WEBP, BMP, GIF, TIFF, ICO -> PNG, JPG, WEBP, ICO, BMP, GIF, TIFF, PDF (Merge)",
    formats_documents: "Documents: PDF -> PNG, JPG (Split Pages)",
    formats_video: "Video: MP4, MOV, AVI, MKV -> MP4, MOV, MP3 (Extract)",
    formats_audio: "Audio: MP3, WAV, M4A -> MP3, WAV, M4A",
    theme: "Theme",
    language: "Language",
    outputLocation: "Output Location",
    sourceLocation: "Original File Location",
    customFolder: "Custom Folder",
    selectFolder: "Select Folder",
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
    error: "Error",
    fileName: "File Name",
    size: "Size",
    action: "Action",
    apiError: "API not loaded",
    selectFail: "Failed to select files",
    selectActionFirst: "Please select files and action first",
    executing: "Executing...",
    execFail: "Execution failed",
    conversionComplete: "Conversion Complete",
    filesConverted: "files converted successfully",
    conversionFailed: "Conversion Failed",
    partialSuccess: "Partial Success",
    someFilesFailed: "Some files failed to convert",
    conversion_success: "Conversion successful",
    // 新增翻譯
    typeImage: "Images",
    typeVideo: "Videos",
    typeAudio: "Audio",
    typeDocument: "Documents",
    recommended: "Rec",
    more: "More",
    clearAll: "Clear All",
    noFiles: "No files added",
    actions: {
      '合併圖片為PDF': 'Merge Images to PDF',
      '批量轉PNG': 'Batch to PNG',
      '批量轉JPG': 'Batch to JPG',
      '批量轉WEBP': 'Batch to WEBP',
      '批量轉ICO': 'Batch to ICO',
      '批量轉BMP': 'Batch to BMP',
      '批量轉GIF': 'Batch to GIF',
      '批量轉TIFF': 'Batch to TIFF',
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
    appName: "UniConvert",
    selectFiles: "選擇檔案",
    start: "開始轉換",
    startAll: "全部開始",
    startGroup: "開始",
    workspace: "工作區",
    selectAction: "請選擇檔案以檢視可用操作",
    currentAction: "目前操作",
    dragDrop: "拖曳檔案到此處",
    dragDropDesc: "支援圖片、PDF、音訊與影片檔案",
    settings: "設定",
    about: "關於",
    supportedFormats: "支援格式",
    formats_images: "圖片: PNG, JPG, JPEG, HEIC, WEBP, BMP, GIF, TIFF, ICO -> PNG, JPG, WEBP, ICO, BMP, GIF, TIFF, PDF (合併)",
    formats_documents: "文件: PDF -> PNG, JPG (每頁拆分)",
    formats_video: "影片: MP4, MOV, AVI, MKV -> MP4, MOV, MP3 (提取音訊)",
    formats_audio: "音訊: MP3, WAV, M4A -> MP3, WAV, M4A",
    theme: "主題",
    language: "語言",
    outputLocation: "儲存位置",
    sourceLocation: "原始檔案位置",
    customFolder: "自訂資料夾",
    selectFolder: "選擇資料夾",
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
    error: "錯誤",
    fileName: "檔案名稱",
    size: "大小",
    action: "操作",
    apiError: "API 未載入",
    selectFail: "選擇檔案失敗",
    selectActionFirst: "請先選擇檔案與操作",
    executing: "執行中...",
    execFail: "執行失敗",
    conversionComplete: "轉換完成",
    filesConverted: "個檔案轉換成功",
    conversionFailed: "轉換失敗",
    partialSuccess: "部分成功",
    someFilesFailed: "部分檔案轉換失敗",
    conversion_success: "轉換成功",
    // 新增翻譯
    typeImage: "圖片",
    typeVideo: "影片",
    typeAudio: "音訊",
    typeDocument: "文件",
    recommended: "推薦",
    more: "更多",
    clearAll: "清除全部",
    noFiles: "尚未加入檔案",
    actions: {
      '合併圖片為PDF': '合併圖片為PDF',
      '批量轉PNG': '批量轉PNG',
      '批量轉JPG': '批量轉JPG',
      '批量轉WEBP': '批量轉WEBP',
      '批量轉ICO': '批量轉ICO',
      '批量轉BMP': '批量轉BMP',
      '批量轉GIF': '批量轉GIF',
      '批量轉TIFF': '批量轉TIFF',
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
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

function AppContent() {
  const toast = useToast()
  
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

  // --- Task Queue State ---
  const [taskQueue, setTaskQueue] = useState(createInitialTaskQueue)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)

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
    setTaskQueue(prev => groupFilesToQueue(newFiles, prev))
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

  // 更新群組輸出格式
  const handleFormatChange = (type, format) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: { ...prev[type], outputFormat: format }
    }))
  }

  // 切換群組啟用狀態
  const handleToggleGroup = (type) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled }
    }))
  }

  // 移除單一檔案
  const handleRemoveFile = (type, index) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        files: prev[type].files.filter((_, i) => i !== index)
      }
    }))
  }

  // 清除所有檔案
  const handleClearAll = () => {
    setTaskQueue(createInitialTaskQueue())
    setProgress(0)
    setStatus('')
  }

  // 取得群組對應的 action 字串
  const getActionForGroup = (type, format) => {
    const actions = availableActions[type] || []
    const action = actions.find(a => a.id === format)
    return action?.action || null
  }

  // 執行單一群組轉換
  const handleStartGroup = async (type) => {
    const group = taskQueue[type]
    if (!group || group.files.length === 0) return

    const action = getActionForGroup(type, group.outputFormat)
    if (!action) {
      toast.error(t('conversionFailed'), 'Invalid action')
      return
    }

    // 更新狀態為處理中
    setTaskQueue(prev => ({
      ...prev,
      [type]: { ...prev[type], status: 'processing', progress: 0, errors: [] }
    }))
    setStatus(t('executing'))

    try {
      const payload = {
        action,
        files: group.files.map(f => f.path),
        output_dir: outputConfig.mode === 'custom' ? outputConfig.path : null
      }
      
      const r = await window.api.doAction(payload)
      
      if (r && r.ok && r.data) {
        const { ok: successCount, fail: failCount, errors } = r.data
        
        if (failCount === 0 && successCount > 0) {
          // 全部成功 - 清除該群組
          setTaskQueue(prev => ({
            ...prev,
            [type]: { ...createInitialTaskQueue()[type], status: 'completed' }
          }))
          toast.success(t('conversionComplete'), `${successCount} ${t('filesConverted')}`)
        } else if (successCount > 0 && failCount > 0) {
          // 部分成功
          setTaskQueue(prev => ({
            ...prev,
            [type]: { ...prev[type], status: 'completed', errors: errors || [] }
          }))
          toast.warning(t('partialSuccess'), `${successCount} ${t('success')}, ${failCount} ${t('fail')}`)
        } else {
          // 全部失敗
          setTaskQueue(prev => ({
            ...prev,
            [type]: { ...prev[type], status: 'error', errors: errors || [] }
          }))
          toast.error(t('conversionFailed'), errors?.[0]?.error || t('execFail'))
        }
      } else {
        setTaskQueue(prev => ({
          ...prev,
          [type]: { ...prev[type], status: 'error', errors: [{ error: r?.error || t('execFail') }] }
        }))
        toast.error(t('conversionFailed'), r?.error || t('execFail'))
      }
    } catch (e) {
      console.error(e)
      setTaskQueue(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'error', errors: [{ error: e.message }] }
      }))
      toast.error(t('conversionFailed'), e.message)
    } finally {
      setStatus(t('ready'))
    }
  }

  // 執行所有啟用的群組
  const handleStartAll = async () => {
    const activeTypes = getActiveGroupTypes(taskQueue).filter(type => taskQueue[type].enabled)
    
    if (activeTypes.length === 0) {
      toast.warning(t('selectActionFirst'))
      return
    }

    setStatus(t('executing'))
    setProgress(0)
    
    let completedCount = 0
    const totalGroups = activeTypes.length

    for (const type of activeTypes) {
      await handleStartGroup(type)
      completedCount++
      setProgress(Math.round((completedCount / totalGroups) * 100))
    }

    setProgress(100)
    setStatus(t('ready'))
  }

  // 計算統計資料
  const totalFileCount = getTotalFileCount(taskQueue)
  const totalSize = getTotalFileSize(taskQueue)
  const activeTypes = getActiveGroupTypes(taskQueue)
  const processing = isAnyProcessing(taskQueue)
  const canStartAll = hasEnabledGroups(taskQueue)

  // --- Components ---

  const Sidebar = () => (
    <div className="w-64 border-r bg-muted/20 p-4 flex flex-col gap-2 shrink-0">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          {/* <LayoutGrid className="w-6 h-6" /> */}
          {t('appName')}
        </h1>
      </div>
      <Button 
        variant={currentView === 'home' ? 'secondary' : 'ghost'} 
        className="justify-start" 
        onClick={() => setCurrentView('home')}
      >
        <Home className="mr-2 h-4 w-4" />
        {t('workspace')}
      </Button>
      <Button 
        variant={currentView === 'settings' ? 'secondary' : 'ghost'} 
        className="justify-start" 
        onClick={() => setCurrentView('settings')}
      >
        <Settings className="mr-2 h-4 w-4" />
        {t('settings')}
      </Button>
      <Button 
        variant={currentView === 'about' ? 'secondary' : 'ghost'} 
        className="justify-start" 
        onClick={() => setCurrentView('about')}
      >
        <Info className="mr-2 h-4 w-4" />
        {t('about')}
      </Button>
    </div>
  )

  const AboutView = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('about')}</h1>
      </div>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('appName')}</h2>
            <p className="text-sm text-muted-foreground">
              beta
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-base font-medium">{t('supportedFormats')}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{t('formats_images')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{t('formats_documents')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{t('formats_video')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{t('formats_audio')}</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )

  const HomeView = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('workspace')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleChooseFiles}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t('selectFiles')}
          </Button>
          {totalFileCount > 0 && (
            <Button variant="outline" onClick={handleClearAll} disabled={processing}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('clearAll')}
            </Button>
          )}
          <Button 
            onClick={handleStartAll}
            disabled={!canStartAll || processing}
          >
            <Play className="mr-2 h-4 w-4" />
            {t('startAll')}
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4">
          <CardDescription>
            {totalFileCount > 0 
              ? `${totalFileCount} ${t('files')} (${bytesToSize(totalSize)})`
              : t('selectAction')
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 pb-4">
          <div 
            className={`flex-1 border-2 border-dashed rounded-lg flex flex-col overflow-hidden transition-colors ${activeTypes.length === 0 ? 'items-center justify-center border-muted-foreground/25 bg-muted/50' : 'border-border bg-card p-4'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {activeTypes.length === 0 ? (
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
              <div className="flex flex-col gap-4 overflow-auto">
                {activeTypes.map(type => (
                  <TaskGroup
                    key={type}
                    type={type}
                    group={taskQueue[type]}
                    onFormatChange={handleFormatChange}
                    onStart={handleStartGroup}
                    onToggle={handleToggleGroup}
                    onRemoveFile={handleRemoveFile}
                    t={t}
                    tAction={tAction}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{status || (totalFileCount > 0 ? t('ready') : t('waiting'))}</span>
              <span>{totalFileCount} {t('files')} ({bytesToSize(totalSize)})</span>
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
                  placeholder={t('selectFolder')} 
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
    <div className="h-screen flex bg-background text-foreground transition-colors duration-300 overflow-hidden relative">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {currentView === 'home' && <HomeView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'about' && <AboutView />}
      </div>
    </div>
  )
}

export default App
