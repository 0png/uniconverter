import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { TaskGroup } from "@/components/TaskGroup"
import { UpdateNotification, CheckUpdateButton } from "@/components/UpdateNotification"
import { HistoryView } from "@/components/HistoryView"
import { FolderOpen, Play, Upload, Settings, Home, Sun, Moon, Monitor, Info, Trash2, History } from "lucide-react"
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
import { bytesToSize } from "@/lib/utils"

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
    formats_markdown: "Markdown: MD -> PDF",
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
    typeMarkdown: "Markdown",
    recommended: "Rec",
    more: "More",
    clearAll: "Clear All",
    noFiles: "No files added",
    openFolderAfterConversion: "Open folder after conversion",
    discordRPC: "Discord Rich Presence",
    discordRPCDesc: "Show current activity status on Discord",
    contextMenu: "Windows Context Menu",
    contextMenuDesc: "Add 'Open with Uniconvert' to right-click menu",
    contextMenuRegistering: "Registering...",
    contextMenuUnregistering: "Removing...",
    filesAdded: "files added",
    version: "Version",
    author: "Author",
    copyright: "Copyright",
    license: "License",
    sourceCode: "Source Code",
    reportIssue: "Report Issue",
    website: "Website",
    techStack: "Technology Stack",
    description: "A universal file converter for images, videos, audio and documents.",
    openSource: "Open Source",
    viewOnGitHub: "View on GitHub",
    submitFeedback: "Submit Feedback",
    builtWith: "Built with",
    // History 相關翻譯
    history: "History",
    filterAll: "All",
    records: "records",
    noHistory: "No History",
    noHistoryDesc: "Your conversion history will appear here",
    openLocation: "Open Location",
    reconvert: "Re-convert",
    delete: "Delete",
    refresh: "Refresh",
    confirm: "Confirm",
    cancel: "Cancel",
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
      '批量轉M4A': 'Batch to M4A',
      'Markdown轉PDF': 'Markdown to PDF'
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
    formats_markdown: "Markdown: MD -> PDF",
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
    typeMarkdown: "Markdown",
    recommended: "推薦",
    more: "更多",
    clearAll: "清除全部",
    noFiles: "尚未加入檔案",
    openFolderAfterConversion: "轉換後自動開啟資料夾",
    discordRPC: "Discord Rich Presence",
    discordRPCDesc: "在 Discord 顯示目前活動狀態",
    contextMenu: "Windows 右鍵選單",
    contextMenuDesc: "在右鍵選單加入「以 Uniconvert 開啟」",
    contextMenuRegistering: "註冊中...",
    contextMenuUnregistering: "移除中...",
    filesAdded: "個檔案已加入",
    version: "版本",
    author: "作者",
    copyright: "版權",
    license: "授權",
    sourceCode: "原始碼",
    reportIssue: "回報問題",
    website: "網站",
    techStack: "技術棧",
    description: "一款通用檔案轉換器，支援圖片、影片、音訊與文件轉換。",
    openSource: "開放原始碼",
    viewOnGitHub: "在 GitHub 上查看",
    submitFeedback: "提交意見回饋",
    builtWith: "使用技術",
    // History 相關翻譯
    history: "歷史記錄",
    filterAll: "全部",
    records: "筆記錄",
    noHistory: "沒有歷史記錄",
    noHistoryDesc: "您的轉換歷史記錄將顯示在這裡",
    openLocation: "開啟位置",
    reconvert: "重新轉換",
    delete: "刪除",
    refresh: "重新整理",
    confirm: "確認",
    cancel: "取消",
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
      '批量轉M4A': '批量轉M4A',
      'Markdown轉PDF': 'Markdown轉PDF'
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
  const [openFolderAfterConversion, setOpenFolderAfterConversion] = useState(() => {
    return localStorage.getItem('openFolderAfterConversion') !== 'false'
  })
  const [discordRPCEnabled, setDiscordRPCEnabled] = useState(() => {
    return localStorage.getItem('discordRPCEnabled') === 'true'
  })
  const [contextMenuEnabled, setContextMenuEnabled] = useState(false)
  const [contextMenuLoading, setContextMenuLoading] = useState(false)
  
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
    localStorage.setItem('openFolderAfterConversion', openFolderAfterConversion)
  }, [openFolderAfterConversion])

  useEffect(() => {
    localStorage.setItem('discordRPCEnabled', discordRPCEnabled)
    // 同步到後端
    if (window.api?.discord?.setEnabled) {
      window.api.discord.setEnabled(discordRPCEnabled)
    }
  }, [discordRPCEnabled])

  // 初始化時同步 Discord RPC 狀態
  useEffect(() => {
    if (window.api?.discord?.setEnabled && discordRPCEnabled) {
      window.api.discord.setEnabled(true)
    }
  }, [])

  // 初始化時檢查右鍵選單狀態
  useEffect(() => {
    const checkContextMenu = async () => {
      if (window.api?.contextMenu?.isRegistered) {
        const result = await window.api.contextMenu.isRegistered()
        if (result.ok) {
          setContextMenuEnabled(result.registered)
        }
      }
    }
    checkContextMenu()
  }, [])

  // 監聽從命令列傳入的檔案
  useEffect(() => {
    if (!window.api?.onFilesFromArgs) return
    
    const unsubscribe = window.api.onFilesFromArgs((files) => {
      console.log('[App] Received files from args:', files)
      if (files && files.length > 0) {
        // 將檔案加入任務佇列（使用後端傳來的 size）
        const newFiles = files.map(f => ({
          path: f.path,
          name: f.name,
          size: f.size || 0
        }))
        addFiles(newFiles)
        
        // 顯示通知
        const lang = language === 'system' 
          ? (navigator.language.startsWith('zh') ? 'zh-TW' : 'en')
          : language
        const filesAddedText = translations[lang]?.filesAdded || translations['en'].filesAdded
        const filesText = translations[lang]?.files || translations['en'].files
        toast.success(filesAddedText, `${files.length} ${filesText}`)
        
        // 切換到首頁
        setCurrentView('home')
      }
    })
    
    return unsubscribe
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

  // 切換右鍵選單
  const handleToggleContextMenu = async () => {
    if (!window.api?.contextMenu || contextMenuLoading) return
    
    setContextMenuLoading(true)
    try {
      if (contextMenuEnabled) {
        const result = await window.api.contextMenu.unregister()
        if (result.success) {
          setContextMenuEnabled(false)
        } else {
          toast.error(t('error'), result.error || 'Failed to unregister')
        }
      } else {
        const result = await window.api.contextMenu.register()
        if (result.success) {
          setContextMenuEnabled(true)
        } else {
          toast.error(t('error'), result.error || 'Failed to register')
        }
      }
    } catch (err) {
      toast.error(t('error'), err.message)
    } finally {
      setContextMenuLoading(false)
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

    // 計算輸出目錄
    const outputDir = outputConfig.mode === 'custom' 
      ? outputConfig.path 
      : (group.files[0]?.path ? group.files[0].path.replace(/[\\/][^\\/]+$/, '') : null)

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
          
          // 自動打開資料夾
          if (openFolderAfterConversion && outputDir && window.api?.openFolder) {
            await window.api.openFolder(outputDir)
          }
        } else if (successCount > 0 && failCount > 0) {
          // 部分成功
          setTaskQueue(prev => ({
            ...prev,
            [type]: { ...prev[type], status: 'completed', errors: errors || [] }
          }))
          toast.warning(t('partialSuccess'), `${successCount} ${t('success')}, ${failCount} ${t('fail')}`)
          
          // 部分成功也打開資料夾
          if (openFolderAfterConversion && outputDir && window.api?.openFolder) {
            await window.api.openFolder(outputDir)
          }
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
        variant={currentView === 'history' ? 'secondary' : 'ghost'} 
        className="justify-start" 
        onClick={() => setCurrentView('history')}
      >
        <History className="mr-2 h-4 w-4" />
        {t('history')}
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

  const AboutView = () => {
    const openExternal = (url) => {
      if (window.api?.openExternal) {
        window.api.openExternal(url)
      } else {
        window.open(url, '_blank')
      }
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">{t('about')}</h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="grid gap-6 max-w-3xl">
            {/* 應用程式資訊 */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img 
                    src="./icon.png" 
                    alt="Uniconvert" 
                    className="w-16 h-16 rounded-xl"
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{t('appName')}</h2>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('version')}</p>
                    <p className="text-sm font-medium">1.2.0</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('author')}</p>
                    <p className="text-sm font-medium">0png</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('license')}</p>
                    <p className="text-sm font-medium">MIT</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('copyright')}</p>
                    <p className="text-sm font-medium">© 2026 0png</p>
                  </div>
                </div>
                
                {/* 檢查更新按鈕 */}
                <div className="pt-2">
                  <CheckUpdateButton language={language} />
                </div>
              </div>
            </Card>

            {/* 支援格式 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">{t('supportedFormats')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* 圖片 */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <span className="font-medium text-sm">{t('typeImage')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {['PNG', 'JPG', 'HEIC', 'WEBP', 'BMP', 'GIF', 'TIFF', 'ICO'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-background border text-muted-foreground">{fmt}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['PNG', 'JPG', 'WEBP', 'ICO', 'BMP', 'GIF', 'TIFF', 'PDF'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 border border-primary/20 text-primary">{fmt}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 文件 (PDF + Markdown) */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <span className="font-medium text-sm">{t('typeDocument')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {['PDF', 'MD'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-background border text-muted-foreground">{fmt}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['PNG', 'JPG', 'PDF'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 border border-primary/20 text-primary">{fmt}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 影片 */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </div>
                      <span className="font-medium text-sm">{t('typeVideo')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {['MP4', 'MOV', 'AVI', 'MKV'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-background border text-muted-foreground">{fmt}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['MP4', 'MOV', 'MP3'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 border border-primary/20 text-primary">{fmt}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 音訊 */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      </div>
                      <span className="font-medium text-sm">{t('typeAudio')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {['MP3', 'WAV', 'M4A'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-background border text-muted-foreground">{fmt}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['MP3', 'WAV', 'M4A'].map(fmt => (
                          <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 border border-primary/20 text-primary">{fmt}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 技術棧 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">{t('techStack')}</h3>
                <div className="flex flex-wrap gap-2">
                  {['Electron', 'React', 'Vite', 'Tailwind CSS', 'Sharp', 'FFmpeg'].map(tech => (
                    <span 
                      key={tech}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* 連結 */}
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">{t('openSource')}</h3>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openExternal('https://github.com/0png/uniconverter')}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    {t('viewOnGitHub')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openExternal('https://github.com/0png/uniconverter/issues')}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {t('submitFeedback')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

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

          {/* Open Folder After Conversion */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Label className="text-base">{t('openFolderAfterConversion')}</Label>
            <button
              onClick={() => setOpenFolderAfterConversion(!openFolderAfterConversion)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${openFolderAfterConversion 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground/50 hover:border-muted-foreground bg-transparent'
                }
              `}
            >
              {openFolderAfterConversion && (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Discord Rich Presence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-base">{t('discordRPC')}</Label>
              <span className="text-xs text-muted-foreground">{t('discordRPCDesc')}</span>
            </div>
            <button
              onClick={() => setDiscordRPCEnabled(!discordRPCEnabled)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${discordRPCEnabled 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground/50 hover:border-muted-foreground bg-transparent'
                }
              `}
            >
              {discordRPCEnabled && (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Windows Context Menu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-base">{t('contextMenu')}</Label>
              <span className="text-xs text-muted-foreground">{t('contextMenuDesc')}</span>
            </div>
            <button
              onClick={handleToggleContextMenu}
              disabled={contextMenuLoading}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${contextMenuLoading 
                  ? 'border-muted-foreground/30 bg-muted cursor-not-allowed'
                  : contextMenuEnabled 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground/50 hover:border-muted-foreground bg-transparent'
                }
              `}
            >
              {contextMenuLoading ? (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              ) : contextMenuEnabled && (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
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
        {currentView === 'history' && (
          <HistoryView 
            t={t} 
            tAction={tAction} 
            language={language}
            onReconvert={(entry) => {
              // 重新轉換：加入檔案到任務佇列並切換到首頁
              addFiles([{ path: entry.sourceFile, name: entry.sourceFile.split(/[\\/]/).pop(), size: 0 }])
              setCurrentView('home')
            }}
          />
        )}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'about' && <AboutView />}
      </div>
      {/* 自動更新通知 */}
      <UpdateNotification language={language} />
    </div>
  )
}

export default App
