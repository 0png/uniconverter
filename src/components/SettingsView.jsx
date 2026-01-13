/**
 * SettingsView 元件 - 設定頁面視圖
 * @module SettingsView
 */

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { FolderOpen, Sun, Moon, Monitor } from "lucide-react"

/**
 * 勾選框元件
 * @param {Object} props
 * @param {boolean} props.checked - 是否勾選
 * @param {Function} props.onChange - 變更處理函式
 * @param {boolean} [props.disabled] - 是否禁用
 * @param {boolean} [props.loading] - 是否載入中
 */
function Checkbox({ checked, onChange, disabled, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || loading}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
        ${loading 
          ? 'border-muted-foreground/30 bg-muted cursor-not-allowed'
          : checked 
            ? 'bg-primary border-primary text-primary-foreground' 
            : 'border-muted-foreground/50 hover:border-muted-foreground bg-transparent'
        }
      `}
    >
      {loading ? (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : checked && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

/**
 * SettingsView 元件
 * 渲染語言、主題、輸出位置等設定選項
 * 
 * @param {Object} props
 * @param {Function} props.t - 翻譯函式
 * @param {string} props.theme - 當前主題 ('light' | 'dark' | 'system')
 * @param {Function} props.setTheme - 設定主題函式
 * @param {string} props.language - 當前語言 ('en' | 'zh-TW' | 'system')
 * @param {Function} props.setLanguage - 設定語言函式
 * @param {Object} props.outputConfig - 輸出配置 { mode: 'source' | 'custom', path: string }
 * @param {Function} props.setOutputConfig - 設定輸出配置函式
 * @param {boolean} props.openFolderAfterConversion - 轉換後是否開啟資料夾
 * @param {Function} props.setOpenFolderAfterConversion - 設定轉換後開啟資料夾函式
 * @param {boolean} props.discordRPCEnabled - Discord RPC 是否啟用
 * @param {Function} props.setDiscordRPCEnabled - 設定 Discord RPC 啟用函式
 * @param {boolean} props.contextMenuEnabled - 右鍵選單是否啟用
 * @param {boolean} props.contextMenuLoading - 右鍵選單是否載入中
 * @param {Function} props.onChooseOutputPath - 選擇輸出路徑處理函式
 * @param {Function} props.onToggleContextMenu - 切換右鍵選單處理函式
 */
export function SettingsView({
  t,
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
  onChooseOutputPath,
  onToggleContextMenu
}) {
  return (
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
                <Button variant="secondary" onClick={onChooseOutputPath}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Open Folder After Conversion */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Label className="text-base">{t('openFolderAfterConversion')}</Label>
            <Checkbox 
              checked={openFolderAfterConversion}
              onChange={() => setOpenFolderAfterConversion(!openFolderAfterConversion)}
            />
          </div>

          {/* Discord Rich Presence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-base">{t('discordRPC')}</Label>
              <span className="text-xs text-muted-foreground">{t('discordRPCDesc')}</span>
            </div>
            <Checkbox 
              checked={discordRPCEnabled}
              onChange={() => setDiscordRPCEnabled(!discordRPCEnabled)}
            />
          </div>

          {/* Windows Context Menu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-base">{t('contextMenu')}</Label>
              <span className="text-xs text-muted-foreground">{t('contextMenuDesc')}</span>
            </div>
            <Checkbox 
              checked={contextMenuEnabled}
              onChange={onToggleContextMenu}
              loading={contextMenuLoading}
            />
          </div>

        </div>
      </Card>
    </div>
  )
}
