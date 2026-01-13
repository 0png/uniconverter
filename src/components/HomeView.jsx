/**
 * HomeView 元件 - 首頁工作區視圖
 * @module HomeView
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TaskGroup } from "@/components/TaskGroup"
import { FolderOpen, Play, Upload, Trash2 } from "lucide-react"
import { bytesToSize } from "@/lib/utils"

/**
 * HomeView 元件
 * 渲染檔案選擇、拖放區域、任務群組和進度條
 * 
 * @param {Object} props
 * @param {Function} props.t - 翻譯函式
 * @param {Function} props.tAction - 動作翻譯函式
 * @param {Object} props.taskQueue - 任務佇列狀態
 * @param {string} props.status - 當前狀態文字
 * @param {number} props.progress - 進度百分比 (0-100)
 * @param {number} props.totalFileCount - 總檔案數
 * @param {number} props.totalSize - 總檔案大小 (bytes)
 * @param {Array<string>} props.activeTypes - 有檔案的群組類型
 * @param {boolean} props.processing - 是否正在處理中
 * @param {boolean} props.canStartAll - 是否可以開始全部轉換
 * @param {Function} props.onChooseFiles - 選擇檔案處理函式
 * @param {Function} props.onClearAll - 清除全部處理函式
 * @param {Function} props.onStartAll - 開始全部轉換處理函式
 * @param {Function} props.onFormatChange - 格式變更處理函式
 * @param {Function} props.onStartGroup - 開始單一群組處理函式
 * @param {Function} props.onToggleGroup - 切換群組啟用狀態處理函式
 * @param {Function} props.onRemoveFile - 移除檔案處理函式
 * @param {Function} props.onDrop - 拖放處理函式
 * @param {Function} props.onDragOver - 拖曳經過處理函式
 */
export function HomeView({
  t,
  tAction,
  taskQueue,
  status,
  progress,
  totalFileCount,
  totalSize,
  activeTypes,
  processing,
  canStartAll,
  onChooseFiles,
  onClearAll,
  onStartAll,
  onFormatChange,
  onStartGroup,
  onToggleGroup,
  onRemoveFile,
  onDrop,
  onDragOver
}) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header with buttons */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('workspace')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onChooseFiles}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t('selectFiles')}
          </Button>
          {totalFileCount > 0 && (
            <Button variant="outline" onClick={onClearAll} disabled={processing}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('clearAll')}
            </Button>
          )}
          <Button 
            onClick={onStartAll}
            disabled={!canStartAll || processing}
          >
            <Play className="mr-2 h-4 w-4" />
            {t('startAll')}
          </Button>
        </div>
      </div>

      {/* Card with drag-drop zone and task groups */}
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
            onDragOver={onDragOver}
            onDrop={onDrop}
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
                    onFormatChange={onFormatChange}
                    onStart={onStartGroup}
                    onToggle={onToggleGroup}
                    onRemoveFile={onRemoveFile}
                    t={t}
                    tAction={tAction}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Progress bar */}
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
}
