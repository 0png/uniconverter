import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { 
  History, 
  Trash2, 
  FolderOpen, 
  RefreshCw, 
  Image, 
  Video, 
  Music, 
  FileText, 
  File,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"

// 類型圖示映射
const TypeIcon = ({ type, className }) => {
  const icons = {
    image: Image,
    video: Video,
    audio: Music,
    document: FileText,
    markdown: File
  }
  const Icon = icons[type] || File
  return <Icon className={className} />
}

// 格式化時間
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 小於 1 分鐘
  if (diff < 60000) return '剛剛'
  // 小於 1 小時
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`
  // 小於 24 小時
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`
  // 小於 7 天
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  // 超過 7 天顯示日期
  return date.toLocaleDateString()
}

// 格式化時間（英文）
const formatTimeEn = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  
  return date.toLocaleDateString('en-US')
}

/**
 * HistoryView - 歷史記錄頁面元件
 */
export function HistoryView({ t, tAction, language, onReconvert, toast }) {
  const [entries, setEntries] = useState([])
  const [counts, setCounts] = useState({ all: 0, image: 0, video: 0, audio: 0, document: 0, markdown: 0 })
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const lastOpenLocationTime = useRef(0)

  // 載入歷史記錄
  const loadHistory = async () => {
    if (!window.api?.history) return
    
    setLoading(true)
    try {
      const [historyResult, countsResult] = await Promise.all([
        window.api.history.getAll(),
        window.api.history.getCounts()
      ])
      
      if (historyResult.ok) {
        setEntries(historyResult.data)
      }
      if (countsResult.ok) {
        setCounts(countsResult.data)
      }
    } catch (err) {
      console.error('[HistoryView] Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // 篩選後的記錄
  const filteredEntries = filter === 'all' 
    ? entries 
    : entries.filter(e => e.fileType === filter)

  // 刪除單筆記錄
  const handleRemove = async (id) => {
    if (!window.api?.history) return
    
    try {
      const result = await window.api.history.remove(id)
      if (result.ok) {
        await loadHistory()
      }
    } catch (err) {
      console.error('[HistoryView] Failed to remove entry:', err)
    }
  }

  // 清除所有記錄
  const handleClearAll = async () => {
    if (!window.api?.history) return
    
    try {
      const result = await window.api.history.clear()
      if (result.ok) {
        setEntries([])
        setCounts({ all: 0, image: 0, video: 0, audio: 0, document: 0, markdown: 0 })
        setConfirmClear(false)
      }
    } catch (err) {
      console.error('[HistoryView] Failed to clear history:', err)
    }
  }

  // 開啟檔案位置（3 秒 throttle）
  const handleOpenLocation = async (filePath) => {
    if (!window.api?.history) return
    
    // Throttle: 3 秒內只能點擊一次
    const now = Date.now()
    if (now - lastOpenLocationTime.current < 3000) return
    lastOpenLocationTime.current = now
    
    try {
      const result = await window.api.history.openLocation(filePath)
      if (!result.ok && result.error === 'FILE_NOT_FOUND') {
        toast?.error(t('error'), t('fileNotFound'))
      }
    } catch (err) {
      console.error('[HistoryView] Failed to open location:', err)
    }
  }

  // 重新轉換
  const handleReconvert = (entry) => {
    if (onReconvert) {
      onReconvert(entry)
    }
  }

  // 取得檔案名稱
  const getFileName = (path) => {
    return path?.split(/[\\/]/).pop() || path
  }

  // 格式化時間（根據語言）
  const formatTimestamp = (timestamp) => {
    const lang = language === 'system' 
      ? (navigator.language.startsWith('zh') ? 'zh-TW' : 'en')
      : language
    return lang === 'zh-TW' ? formatTime(timestamp) : formatTimeEn(timestamp)
  }

  // 篩選按鈕
  const FilterButton = ({ type, label, count }) => (
    <Button
      variant={filter === type ? "default" : "outline"}
      size="sm"
      onClick={() => setFilter(type)}
      className="text-xs"
    >
      {label}
      <span className="ml-1 text-[10px] opacity-70">({count})</span>
    </Button>
  )


  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('history')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          {entries.length > 0 && (
            confirmClear ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleClearAll}>
                  {t('confirm')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
                  {t('cancel')}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('clearAll')}
              </Button>
            )
          )}
        </div>
      </div>

      {/* 篩選按鈕列 */}
      <div className="flex flex-wrap gap-2">
        <FilterButton type="all" label={t('filterAll')} count={counts.all} />
        <FilterButton type="image" label={t('typeImage')} count={counts.image} />
        <FilterButton type="video" label={t('typeVideo')} count={counts.video} />
        <FilterButton type="audio" label={t('typeAudio')} count={counts.audio} />
        <FilterButton type="document" label={t('typeDocument')} count={counts.document} />
        <FilterButton type="markdown" label={t('typeMarkdown')} count={counts.markdown} />
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4">
          <CardDescription>
            {filteredEntries.length > 0 
              ? `${filteredEntries.length} ${t('records')}`
              : t('noHistory')
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{t('noHistory')}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t('noHistoryDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                >
                  {/* 類型圖示 */}
                  <div className="shrink-0">
                    <TypeIcon type={entry.fileType} className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  {/* 檔案資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate" title={entry.sourceFile}>
                        {getFileName(entry.sourceFile)}
                      </span>
                      {entry.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{tAction(entry.conversionType)}</span>
                      <span>•</span>
                      <span>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenLocation(entry.outputFile)}
                      title={t('openLocation')}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleReconvert(entry)}
                      title={t('reconvert')}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(entry.id)}
                      title={t('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default HistoryView
