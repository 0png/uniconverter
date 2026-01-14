import { useState, useEffect } from 'react'

/**
 * 設定狀態管理 Hook
 * 管理應用程式的所有設定狀態，包含主題、語言、輸出設定等
 * 
 * @param {Object} options - 選項
 * @param {Object} options.toast - Toast 通知物件（用於顯示錯誤訊息）
 * @param {Function} options.t - 翻譯函式
 * @returns {Object} 設定狀態和處理函式
 */
export function useSettings(options = {}) {
  const { toast, t } = options

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

  // --- Effects ---

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  // Persist language to localStorage
  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  // Persist openFolderAfterConversion to localStorage
  useEffect(() => {
    localStorage.setItem('openFolderAfterConversion', openFolderAfterConversion)
  }, [openFolderAfterConversion])

  // Persist discordRPCEnabled and sync with backend
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

  // Persist outputConfig to localStorage
  useEffect(() => {
    localStorage.setItem('outputConfig', JSON.stringify(outputConfig))
  }, [outputConfig])

  // Apply Theme to document root
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

  // --- Handlers ---

  /**
   * 選擇自訂輸出路徑
   */
  const handleChooseOutputPath = async () => {
    if (!window.api) return
    const dir = await window.api.selectDir()
    if (dir) {
      setOutputConfig(prev => ({ ...prev, path: dir, mode: 'custom' }))
    }
  }

  /**
   * 切換右鍵選單註冊狀態
   */
  const handleToggleContextMenu = async () => {
    if (!window.api?.contextMenu || contextMenuLoading) return
    
    setContextMenuLoading(true)
    try {
      if (contextMenuEnabled) {
        const result = await window.api.contextMenu.unregister()
        if (result.success) {
          setContextMenuEnabled(false)
        } else {
          toast?.error(t?.('error') || 'Error', result.error || 'Failed to unregister')
        }
      } else {
        const result = await window.api.contextMenu.register()
        if (result.success) {
          setContextMenuEnabled(true)
        } else {
          toast?.error(t?.('error') || 'Error', result.error || 'Failed to register')
        }
      }
    } catch (err) {
      toast?.error(t?.('error') || 'Error', err.message)
    } finally {
      setContextMenuLoading(false)
    }
  }

  return {
    // 狀態
    theme,
    setTheme,
    language,
    setLanguage,
    outputConfig,
    setOutputConfig,
    openFolderAfterConversion,
    setOpenFolderAfterConversion,
    discordRPCEnabled,
    setDiscordRPCEnabled,
    contextMenuEnabled,
    contextMenuLoading,
    // Handlers
    handleChooseOutputPath,
    handleToggleContextMenu
  }
}
