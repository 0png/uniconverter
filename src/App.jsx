/**
 * App 元件 - 應用程式根元件
 * 作為組合層，整合所有 hooks 和視圖元件
 * @module App
 */

import { useState, useEffect } from 'react'
import { ToastProvider, useToast } from "@/components/ui/toast"
import { useSettings } from '@/hooks/useSettings'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { useTranslation } from '@/hooks/useTranslation'
import { translations } from '@/lib/translations'
import { Sidebar } from '@/components/Sidebar'
import { HomeView } from '@/components/HomeView'
import { SettingsView } from '@/components/SettingsView'
import { AboutView } from '@/components/AboutView'
import { HistoryView } from '@/components/HistoryView'
import { UpdateNotification } from '@/components/UpdateNotification'

/**
 * AppContent 元件 - 主要應用程式內容
 * 整合所有 hooks 和視圖元件
 */
function AppContent() {
  const toast = useToast()
  
  // --- View State ---
  const [currentView, setCurrentView] = useState('home')

  // --- Settings Hook ---
  const settings = useSettings({ toast })
  
  // --- Translation Hook ---
  const { t, tAction } = useTranslation(settings.language)

  // --- Task Queue Hook ---
  const taskQueue = useTaskQueue({
    outputConfig: settings.outputConfig,
    openFolderAfterConversion: settings.openFolderAfterConversion,
    toast,
    t
  })

  // --- 監聽從命令列傳入的檔案 ---
  useEffect(() => {
    if (!window.api?.onFilesFromArgs) return
    
    const unsubscribe = window.api.onFilesFromArgs((files) => {
      console.log('[App] Received files from args:', files)
      if (files && files.length > 0) {
        const newFiles = files.map(f => ({
          path: f.path,
          name: f.name,
          size: f.size || 0
        }))
        taskQueue.addFiles(newFiles)
        
        const lang = settings.language === 'system' 
          ? (navigator.language.startsWith('zh') ? 'zh-TW' : 'en')
          : settings.language
        const filesAddedText = translations[lang]?.filesAdded || translations['en'].filesAdded
        const filesText = translations[lang]?.files || translations['en'].files
        toast.success(filesAddedText, `${files.length} ${filesText}`)
        
        setCurrentView('home')
      }
    })
    
    return unsubscribe
  }, [settings.language, taskQueue, toast])

  // --- File Handlers ---
  const handleChooseFiles = async () => {
    if (!window.api) return
    try {
      const paths = await window.api.selectFiles()
      const newFiles = paths.map(p => ({
        path: p,
        name: p.split(/[\\/]/).pop(),
        size: 0 
      }))
      taskQueue.addFiles(newFiles)
    } catch (e) {
      console.error(e)
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
    taskQueue.addFiles(newFiles)
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleReconvert = (entry) => {
    taskQueue.addFiles([{ 
      path: entry.sourceFile, 
      name: entry.sourceFile.split(/[\\/]/).pop(), 
      size: 0 
    }])
    setCurrentView('home')
  }

  return (
    <div className="h-screen flex bg-background text-foreground transition-colors duration-300 overflow-hidden relative">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        t={t} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {currentView === 'home' && (
          <HomeView
            t={t}
            tAction={tAction}
            taskQueue={taskQueue.taskQueue}
            status={taskQueue.status}
            progress={taskQueue.progress}
            totalFileCount={taskQueue.totalFileCount}
            totalSize={taskQueue.totalSize}
            activeTypes={taskQueue.activeTypes}
            processing={taskQueue.processing}
            canStartAll={taskQueue.canStartAll}
            onChooseFiles={handleChooseFiles}
            onClearAll={taskQueue.handleClearAll}
            onStartAll={taskQueue.handleStartAll}
            onFormatChange={taskQueue.handleFormatChange}
            onStartGroup={taskQueue.handleStartGroup}
            onToggleGroup={taskQueue.handleToggleGroup}
            onRemoveFile={taskQueue.handleRemoveFile}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
        )}
        
        {currentView === 'history' && (
          <HistoryView 
            t={t} 
            tAction={tAction} 
            language={settings.language}
            onReconvert={handleReconvert}
          />
        )}
        
        {currentView === 'settings' && (
          <SettingsView
            t={t}
            theme={settings.theme}
            setTheme={settings.setTheme}
            language={settings.language}
            setLanguage={settings.setLanguage}
            outputConfig={settings.outputConfig}
            setOutputConfig={settings.setOutputConfig}
            openFolderAfterConversion={settings.openFolderAfterConversion}
            setOpenFolderAfterConversion={settings.setOpenFolderAfterConversion}
            discordRPCEnabled={settings.discordRPCEnabled}
            setDiscordRPCEnabled={settings.setDiscordRPCEnabled}
            contextMenuEnabled={settings.contextMenuEnabled}
            contextMenuLoading={settings.contextMenuLoading}
            onChooseOutputPath={settings.handleChooseOutputPath}
            onToggleContextMenu={settings.handleToggleContextMenu}
          />
        )}
        
        {currentView === 'about' && (
          <AboutView 
            t={t} 
            language={settings.language} 
          />
        )}
      </div>
      
      <UpdateNotification language={settings.language} />
    </div>
  )
}

/**
 * App 元件 - 提供 Toast Context
 */
function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
