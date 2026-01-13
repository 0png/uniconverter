/**
 * Sidebar 元件 - 側邊欄導航
 * @module Sidebar
 */

import { Button } from "@/components/ui/button"
import { Home, History, Settings, Info } from "lucide-react"

/**
 * 導航按鈕元件
 * @param {Object} props
 * @param {string} props.view - 視圖名稱
 * @param {string} props.currentView - 當前視圖
 * @param {Function} props.setCurrentView - 設定當前視圖的函式
 * @param {React.ComponentType} props.icon - 圖示元件
 * @param {string} props.label - 按鈕標籤
 */
function NavButton({ view, currentView, setCurrentView, icon: Icon, label }) {
  return (
    <Button 
      variant={currentView === view ? 'secondary' : 'ghost'} 
      className="justify-start" 
      onClick={() => setCurrentView(view)}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

/**
 * Sidebar 元件
 * 渲染側邊欄導航按鈕
 * 
 * @param {Object} props
 * @param {string} props.currentView - 當前視圖 ('home' | 'history' | 'settings' | 'about')
 * @param {Function} props.setCurrentView - 設定當前視圖的函式
 * @param {Function} props.t - 翻譯函式
 */
export function Sidebar({ currentView, setCurrentView, t }) {
  return (
    <div className="w-64 border-r bg-muted/20 p-4 flex flex-col gap-2 shrink-0">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          {t('appName')}
        </h1>
      </div>
      <NavButton 
        view="home" 
        currentView={currentView}
        setCurrentView={setCurrentView}
        icon={Home} 
        label={t('workspace')} 
      />
      <NavButton 
        view="history" 
        currentView={currentView}
        setCurrentView={setCurrentView}
        icon={History} 
        label={t('history')} 
      />
      <NavButton 
        view="settings" 
        currentView={currentView}
        setCurrentView={setCurrentView}
        icon={Settings} 
        label={t('settings')} 
      />
      <NavButton 
        view="about" 
        currentView={currentView}
        setCurrentView={setCurrentView}
        icon={Info} 
        label={t('about')} 
      />
    </div>
  )
}
