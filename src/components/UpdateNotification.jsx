import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Download, RefreshCw, X, CheckCircle, AlertCircle } from "lucide-react"

const translations = {
  en: {
    updateAvailable: "Update Available",
    newVersion: "New version",
    isAvailable: "is available",
    downloadNow: "Download Now",
    remindLater: "Later",
    downloading: "Downloading...",
    downloadComplete: "Download Complete",
    restartNow: "Restart Now",
    restartLater: "Later",
    restartToUpdate: "Restart to apply the update",
    checking: "Checking for updates...",
    upToDate: "You're up to date!",
    currentVersion: "Current version",
    checkForUpdates: "Check for Updates",
    updateError: "Update Error",
    retry: "Retry"
  },
  "zh-TW": {
    updateAvailable: "有可用更新",
    newVersion: "新版本",
    isAvailable: "已可下載",
    downloadNow: "立即下載",
    remindLater: "稍後提醒",
    downloading: "下載中...",
    downloadComplete: "下載完成",
    restartNow: "立即重啟",
    restartLater: "稍後",
    restartToUpdate: "重啟以套用更新",
    checking: "正在檢查更新...",
    upToDate: "已是最新版本！",
    currentVersion: "目前版本",
    checkForUpdates: "檢查更新",
    updateError: "更新錯誤",
    retry: "重試"
  }
}

export function UpdateNotification({ language = 'en' }) {
  const [updateState, setUpdateState] = useState({
    status: null, // null | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    version: null,
    releaseNotes: null,
    progress: null,
    error: null
  })
  const [dismissed, setDismissed] = useState(false)
  const [showUpToDate, setShowUpToDate] = useState(false)

  const t = (key) => {
    const lang = language === 'system' 
      ? (navigator.language.startsWith('zh') ? 'zh-TW' : 'en')
      : language
    return translations[lang]?.[key] || translations['en'][key] || key
  }

  useEffect(() => {
    if (!window.api?.update) return

    // 監聽更新狀態
    const unsubStatus = window.api.update.onStatus((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: data.status,
        version: data.version || prev.version,
        releaseNotes: data.releaseNotes || prev.releaseNotes,
        error: data.message || null
      }))
      
      // 有新版本時自動顯示
      if (data.status === 'available' || data.status === 'downloaded') {
        setDismissed(false)
      }
      
      // 已是最新版本時顯示提示，3 秒後自動消失
      if (data.status === 'not-available') {
        setShowUpToDate(true)
        setTimeout(() => setShowUpToDate(false), 3000)
      }
    })

    // 監聽下載進度
    const unsubProgress = window.api.update.onProgress((data) => {
      setUpdateState(prev => ({
        ...prev,
        progress: data
      }))
    })

    return () => {
      unsubStatus?.()
      unsubProgress?.()
    }
  }, [])

  const handleDownload = async () => {
    if (!window.api?.update) return
    await window.api.update.download()
  }

  const handleInstall = () => {
    if (!window.api?.update) return
    window.api.update.install()
  }

  const handleCheck = async () => {
    if (!window.api?.update) return
    setUpdateState(prev => ({ ...prev, status: 'checking' }))
    await window.api.update.check()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // 不顯示的情況
  if (dismissed) return null
  if (!updateState.status && !showUpToDate) return null

  // 已是最新版本
  if (showUpToDate || updateState.status === 'not-available') {
    if (!showUpToDate) return null
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm">{t('upToDate')}</span>
          </div>
        </div>
      </div>
    )
  }

  // 檢查中
  if (updateState.status === 'checking') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">{t('checking')}</span>
          </div>
        </div>
      </div>
    )
  }

  // 有可用更新
  if (updateState.status === 'available') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <span className="font-medium">{t('updateAvailable')}</span>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('newVersion')} <span className="font-semibold text-foreground">{updateState.version}</span> {t('isAvailable')}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDownload} className="flex-1">
              {t('downloadNow')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              {t('remindLater')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 下載中
  if (updateState.status === 'downloading') {
    const percent = updateState.progress?.percent || 0
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center gap-2 mb-3">
            <Download className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-medium">{t('downloading')}</span>
          </div>
          <Progress value={percent} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground text-right">
            {percent.toFixed(1)}%
          </p>
        </div>
      </div>
    )
  }

  // 下載完成
  if (updateState.status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">{t('downloadComplete')}</span>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('restartToUpdate')}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInstall} className="flex-1">
              {t('restartNow')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              {t('restartLater')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤
  if (updateState.status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-card border border-destructive/50 rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium">{t('updateError')}</span>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {updateState.error || 'Unknown error'}
          </p>
          <Button size="sm" variant="outline" onClick={handleCheck} className="w-full">
            {t('retry')}
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// 手動檢查更新按鈕元件
export function CheckUpdateButton({ language = 'en', variant = 'outline', size = 'sm' }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null) // null | 'up-to-date' | 'error'

  const t = (key) => {
    const lang = language === 'system' 
      ? (navigator.language.startsWith('zh') ? 'zh-TW' : 'en')
      : language
    return translations[lang]?.[key] || translations['en'][key] || key
  }

  useEffect(() => {
    if (!window.api?.update) return

    const unsubStatus = window.api.update.onStatus((data) => {
      if (data.status === 'not-available') {
        setResult('up-to-date')
        setChecking(false)
        // 3 秒後清除結果
        setTimeout(() => setResult(null), 3000)
      } else if (data.status === 'available') {
        setChecking(false)
        setResult(null)
      } else if (data.status === 'error') {
        setResult('error')
        setChecking(false)
      }
    })

    return () => unsubStatus?.()
  }, [])

  const handleCheck = async () => {
    if (!window.api?.update || checking) return
    setChecking(true)
    setResult(null)
    await window.api.update.check()
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleCheck}
        disabled={checking}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? t('checking') : t('checkForUpdates')}
      </Button>
      {result === 'up-to-date' && (
        <span className="text-sm text-green-500 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {t('upToDate')}
        </span>
      )}
    </div>
  )
}
