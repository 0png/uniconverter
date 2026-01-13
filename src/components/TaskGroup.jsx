import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trash2, File as FileIcon, Play, ChevronDown, ChevronUp, Check } from "lucide-react"
import { typeIcons, getGroupActions } from "@/lib/taskQueue"

const bytesToSize = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * ActionBar - 智能推薦操作按鈕 + 更多選項
 */
function ActionBar({ actions, selectedFormat, onSelect, t, tAction, disabled }) {
  const [showMore, setShowMore] = useState(false)
  
  // 分割為主要操作（前3個）和更多操作
  const primaryActions = actions.slice(0, 3)
  const moreActions = actions.slice(3)
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      {primaryActions.map(action => (
        <Button
          key={action.id}
          variant={selectedFormat === action.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelect(action.id)}
          disabled={disabled}
          className="text-xs relative"
        >
          {tAction(action.action)}
          {action.recommended && selectedFormat !== action.id && (
            <span className="ml-1 px-1 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
              {t('recommended')}
            </span>
          )}
        </Button>
      ))}
      
      {moreActions.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMore(!showMore)}
            disabled={disabled}
            className="text-xs"
          >
            {t('more')}
            {showMore ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
          </Button>
          
          {showMore && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-popover border rounded-md shadow-lg min-w-[120px]">
              {moreActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => {
                    onSelect(action.id)
                    setShowMore(false)
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  {selectedFormat === action.id && <Check className="h-3 w-3" />}
                  <span className={selectedFormat === action.id ? 'font-medium' : ''}>
                    {tAction(action.action)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * TaskGroup - 任務群組卡片元件
 */
export function TaskGroup({ 
  type, 
  group, 
  onFormatChange, 
  onStart, 
  onToggle, 
  onRemoveFile,
  t,
  tAction
}) {
  const [expanded, setExpanded] = useState(true)
  const actions = getGroupActions(type, group.files.length)
  const isProcessing = group.status === 'processing'
  const isCompleted = group.status === 'completed'
  const hasError = group.status === 'error'
  
  const typeLabels = {
    image: t('typeImage'),
    video: t('typeVideo'),
    audio: t('typeAudio'),
    document: t('typeDocument')
  }
  
  const statusColors = {
    pending: '',
    processing: 'border-blue-500/50',
    completed: 'border-green-500/50',
    error: 'border-red-500/50'
  }

  return (
    <Card className={`transition-all ${statusColors[group.status]} ${!group.enabled ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 啟用/停用 Checkbox */}
            <button
              onClick={() => onToggle(type)}
              disabled={isProcessing}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${group.enabled 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground/50 hover:border-muted-foreground'
                }
                ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {group.enabled && <Check className="h-3 w-3" />}
            </button>
            
            {/* 類型圖示和標籤 */}
            <span className="text-lg">{typeIcons[type]}</span>
            <span className="font-medium">{typeLabels[type]}</span>
            <span className="text-sm text-muted-foreground">({group.files.length})</span>
            
            {/* 狀態標籤 */}
            {isProcessing && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">
                {t('processing')}
              </span>
            )}
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                {t('completed')}
              </span>
            )}
            {hasError && (
              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded">
                {t('error')}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 展開/收合按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {/* 單獨開始按鈕 */}
            <Button
              size="sm"
              onClick={() => onStart(type)}
              disabled={isProcessing || !group.enabled || group.files.length === 0}
              className="h-8"
            >
              <Play className="h-3 w-3 mr-1" />
              {isProcessing ? t('processing') : t('startGroup')}
            </Button>
          </div>
        </div>
        
        {/* 操作按鈕列 */}
        {expanded && (
          <div className="mt-3">
            <ActionBar
              actions={actions}
              selectedFormat={group.outputFormat}
              onSelect={(format) => onFormatChange(type, format)}
              t={t}
              tAction={tAction}
              disabled={isProcessing}
            />
          </div>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {/* 檔案列表 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-40 overflow-auto">
              {group.files.map((file, index) => (
                <div 
                  key={file.path} 
                  className="flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-muted/50 transition-colors text-sm group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate" title={file.path}>{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono">
                      {bytesToSize(file.size || 0)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveFile(type, index)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 進度條 */}
          {isProcessing && (
            <div className="mt-3">
              <Progress value={group.progress} className="h-1.5" />
            </div>
          )}
          
          {/* 錯誤訊息 */}
          {hasError && group.errors?.length > 0 && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              {group.errors[0]?.error}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default TaskGroup
