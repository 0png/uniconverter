/**
 * 翻譯 Hook - 提供翻譯函式
 * @module useTranslation
 */

import { translations, getEffectiveLanguage } from '@/lib/translations'

/**
 * 翻譯 Hook
 * 提供 t() 和 tAction() 函式用於取得翻譯文字
 * @param {string} language - 語言設定 ('system' | 'en' | 'zh-TW')
 * @returns {{ t: Function, tAction: Function, lang: string }}
 */
export function useTranslation(language) {
  const lang = getEffectiveLanguage(language)
  
  /**
   * 取得翻譯文字
   * @param {string} key - 翻譯鍵值
   * @returns {string} 翻譯後的文字，若找不到則回傳鍵值本身
   */
  const t = (key) => {
    return translations[lang]?.[key] || translations['en'][key] || key
  }
  
  /**
   * 取得動作翻譯文字
   * @param {string} action - 動作名稱
   * @returns {string} 翻譯後的動作名稱，若找不到則回傳原始名稱
   */
  const tAction = (action) => {
    return translations[lang]?.actions?.[action] || action
  }
  
  return { t, tAction, lang }
}
