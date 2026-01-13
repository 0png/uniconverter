import { useState } from 'react'
import {
  createInitialTaskQueue,
  groupFilesToQueue,
  getActiveGroupTypes,
  getTotalFileCount,
  getTotalFileSize,
  isAnyProcessing,
  hasEnabledGroups,
  availableActions
} from '@/lib/taskQueue'

/**
 * 任務佇列管理 Hook
 * 管理檔案轉換任務的狀態和操作
 * 
 * @param {Object} options - 配置選項
 * @param {Object} options.outputConfig - 輸出配置 { mode: 'source' | 'custom', path: string }
 * @param {boolean} options.openFolderAfterConversion - 轉換後是否開啟資料夾
 * @param {Object} options.toast - Toast 通知物件
 * @param {Function} options.t - 翻譯函式
 * @returns {Object} 任務佇列狀態和操作函式
 */
export function useTaskQueue(options) {
  const { outputConfig, openFolderAfterConversion, toast, t } = options

  // --- Task Queue State ---
  const [taskQueue, setTaskQueue] = useState(createInitialTaskQueue)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)

  // --- Handlers ---

  /**
   * 新增檔案到任務佇列
   * @param {Array<{path: string, name: string, size: number}>} newFiles - 新檔案陣列
   */
  const addFiles = (newFiles) => {
    setTaskQueue(prev => groupFilesToQueue(newFiles, prev))
  }

  /**
   * 更新群組輸出格式
   * @param {string} type - 群組類型
   * @param {string} format - 輸出格式
   */
  const handleFormatChange = (type, format) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: { ...prev[type], outputFormat: format }
    }))
  }

  /**
   * 切換群組啟用狀態
   * @param {string} type - 群組類型
   */
  const handleToggleGroup = (type) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled }
    }))
  }

  /**
   * 移除單一檔案
   * @param {string} type - 群組類型
   * @param {number} index - 檔案索引
   */
  const handleRemoveFile = (type, index) => {
    setTaskQueue(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        files: prev[type].files.filter((_, i) => i !== index)
      }
    }))
  }

  /**
   * 清除所有檔案
   */
  const handleClearAll = () => {
    setTaskQueue(createInitialTaskQueue())
    setProgress(0)
    setStatus('')
  }

  /**
   * 取得群組對應的 action 字串
   * @param {string} type - 群組類型
   * @param {string} format - 輸出格式
   * @returns {string|null} action 字串
   */
  const getActionForGroup = (type, format) => {
    const actions = availableActions[type] || []
    const action = actions.find(a => a.id === format)
    return action?.action || null
  }

  /**
   * 執行單一群組轉換
   * @param {string} type - 群組類型
   */
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

  /**
   * 執行所有啟用的群組
   */
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

  // --- Computed Values ---
  const totalFileCount = getTotalFileCount(taskQueue)
  const totalSize = getTotalFileSize(taskQueue)
  const activeTypes = getActiveGroupTypes(taskQueue)
  const processing = isAnyProcessing(taskQueue)
  const canStartAll = hasEnabledGroups(taskQueue)

  return {
    // State
    taskQueue,
    status,
    progress,
    // Handlers
    addFiles,
    handleFormatChange,
    handleToggleGroup,
    handleRemoveFile,
    handleClearAll,
    handleStartGroup,
    handleStartAll,
    // Computed
    totalFileCount,
    totalSize,
    activeTypes,
    processing,
    canStartAll
  }
}
