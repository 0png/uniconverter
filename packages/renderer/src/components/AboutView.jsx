/**
 * AboutView 元件 - 關於頁面視圖
 * @module AboutView
 */

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckUpdateButton } from "@/components/UpdateNotification"
import iconPng from "@/assets/icon.png"

/**
 * 開啟外部連結
 * @param {string} url - 要開啟的 URL
 */
function openExternal(url) {
  if (window.api?.openExternal) {
    window.api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

/**
 * 格式標籤元件
 * @param {Object} props
 * @param {string} props.format - 格式名稱
 * @param {boolean} [props.isOutput] - 是否為輸出格式
 */
function FormatTag({ format, isOutput }) {
  return (
    <span 
      className={`px-1.5 py-0.5 text-[10px] rounded ${
        isOutput 
          ? 'bg-primary/10 border border-primary/20 text-primary'
          : 'bg-background border text-muted-foreground'
      }`}
    >
      {format}
    </span>
  )
}

/**
 * 格式卡片元件
 * @param {Object} props
 * @param {string} props.title - 標題
 * @param {string} props.iconColor - 圖示顏色類別
 * @param {React.ReactNode} props.icon - 圖示 SVG
 * @param {string[]} props.inputFormats - 輸入格式陣列
 * @param {string[]} props.outputFormats - 輸出格式陣列
 */
function FormatCard({ title, iconColor, icon, inputFormats, outputFormats }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {inputFormats.map(fmt => (
            <FormatTag key={fmt} format={fmt} />
          ))}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="flex flex-wrap gap-1">
          {outputFormats.map(fmt => (
            <FormatTag key={fmt} format={fmt} isOutput />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * AboutView 元件
 * 渲染應用程式資訊、支援格式、技術棧和外部連結
 * 
 * @param {Object} props
 * @param {Function} props.t - 翻譯函式
 * @param {string} props.language - 當前語言
 */
export function AboutView({ t, language }) {
  const [version, setVersion] = useState('--')
  
  useEffect(() => {
    if (window.api?.getVersion) {
      window.api.getVersion().then(v => setVersion(v))
    }
  }, [])

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
                  src={iconPng} 
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
                  <p className="text-sm font-medium">{version}</p>
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
                <FormatCard
                  title={t('typeImage')}
                  iconColor="bg-blue-500/10"
                  icon={
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  }
                  inputFormats={['PNG', 'JPG', 'HEIC', 'WEBP', 'BMP', 'GIF', 'TIFF', 'ICO']}
                  outputFormats={['PNG', 'JPG', 'WEBP', 'ICO', 'BMP', 'GIF', 'TIFF', 'PDF']}
                />

                {/* 文件 (PDF + Markdown) */}
                <FormatCard
                  title={t('typeDocument')}
                  iconColor="bg-red-500/10"
                  icon={
                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  }
                  inputFormats={['PDF', 'MD']}
                  outputFormats={['PNG', 'JPG', 'PDF']}
                />

                {/* 影片 */}
                <FormatCard
                  title={t('typeVideo')}
                  iconColor="bg-purple-500/10"
                  icon={
                    <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  }
                  inputFormats={['MP4', 'MOV', 'AVI', 'MKV']}
                  outputFormats={['MP4', 'MOV', 'MP3']}
                />

                {/* 音訊 */}
                <FormatCard
                  title={t('typeAudio')}
                  iconColor="bg-green-500/10"
                  icon={
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"/>
                      <circle cx="6" cy="18" r="3"/>
                      <circle cx="18" cy="16" r="3"/>
                    </svg>
                  }
                  inputFormats={['MP3', 'WAV', 'M4A']}
                  outputFormats={['MP3', 'WAV', 'M4A']}
                />
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
