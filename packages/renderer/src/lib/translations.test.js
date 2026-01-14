/**
 * 翻譯模組屬性測試
 * **Property 2: Translation Language Support**
 * **Validates: Requirements 1.3**
 * 
 * Feature: app-jsx-refactor
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { translations, getEffectiveLanguage, detectLanguageFromBrowser } from './translations.js'

// 有效語言選項的 arbitrary
const languageArb = fc.constantFrom('system', 'en', 'zh-TW')

// 瀏覽器語言的 arbitrary
const browserLanguageArb = fc.constantFrom(
  'en-US', 'en-GB', 'en', 
  'zh-TW', 'zh-CN', 'zh-HK', 'zh',
  'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES'
)

// 中文瀏覽器語言的 arbitrary
const chineseBrowserLanguageArb = fc.constantFrom('zh-TW', 'zh-CN', 'zh-HK', 'zh')

// 非中文瀏覽器語言的 arbitrary
const nonChineseBrowserLanguageArb = fc.constantFrom('en-US', 'en-GB', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE')

describe('Translation Module - Property Tests', () => {

  /**
   * Property 2: Translation Language Support
   * *For any* language value in ['system', 'en', 'zh-TW'], 
   * the `getEffectiveLanguage` function SHALL return either 'en' or 'zh-TW', never 'system'.
   */
  it('should always return a concrete language, never "system"', () => {
    fc.assert(
      fc.property(languageArb, browserLanguageArb, (language, browserLang) => {
        const result = getEffectiveLanguage(language, browserLang)
        expect(result).not.toBe('system')
        expect(['en', 'zh-TW']).toContain(result)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.1: 當語言設定為 'en' 時，應該回傳 'en'
   */
  it('should return "en" when language is set to "en"', () => {
    fc.assert(
      fc.property(browserLanguageArb, (browserLang) => {
        const result = getEffectiveLanguage('en', browserLang)
        expect(result).toBe('en')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.2: 當語言設定為 'zh-TW' 時，應該回傳 'zh-TW'
   */
  it('should return "zh-TW" when language is set to "zh-TW"', () => {
    fc.assert(
      fc.property(browserLanguageArb, (browserLang) => {
        const result = getEffectiveLanguage('zh-TW', browserLang)
        expect(result).toBe('zh-TW')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.3: 當語言設定為 'system' 且瀏覽器語言以 'zh' 開頭時，應該回傳 'zh-TW'
   */
  it('should return "zh-TW" when language is "system" and browser language starts with "zh"', () => {
    fc.assert(
      fc.property(chineseBrowserLanguageArb, (browserLang) => {
        const result = getEffectiveLanguage('system', browserLang)
        expect(result).toBe('zh-TW')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.4: 當語言設定為 'system' 且瀏覽器語言不以 'zh' 開頭時，應該回傳 'en'
   */
  it('should return "en" when language is "system" and browser language does not start with "zh"', () => {
    fc.assert(
      fc.property(nonChineseBrowserLanguageArb, (browserLang) => {
        const result = getEffectiveLanguage('system', browserLang)
        expect(result).toBe('en')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.5: detectLanguageFromBrowser 應該正確分類語言
   */
  it('should correctly classify browser languages', () => {
    fc.assert(
      fc.property(browserLanguageArb, (browserLang) => {
        const result = detectLanguageFromBrowser(browserLang)
        if (browserLang.startsWith('zh')) {
          expect(result).toBe('zh-TW')
        } else {
          expect(result).toBe('en')
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Translation Module - Unit Tests', () => {

  it('should have translations for both "en" and "zh-TW"', () => {
    expect(translations).toHaveProperty('en')
    expect(translations).toHaveProperty('zh-TW')
  })

  it('should have matching keys in both languages', () => {
    const enKeys = Object.keys(translations.en).filter(k => k !== 'actions')
    const zhKeys = Object.keys(translations['zh-TW']).filter(k => k !== 'actions')
    
    expect(enKeys.sort()).toEqual(zhKeys.sort())
  })

  it('should have matching action keys in both languages', () => {
    const enActionKeys = Object.keys(translations.en.actions)
    const zhActionKeys = Object.keys(translations['zh-TW'].actions)
    
    expect(enActionKeys.sort()).toEqual(zhActionKeys.sort())
  })

  it('should return correct language for explicit settings', () => {
    expect(getEffectiveLanguage('en', 'zh-TW')).toBe('en')
    expect(getEffectiveLanguage('zh-TW', 'en-US')).toBe('zh-TW')
  })

  it('should detect Chinese browser language correctly', () => {
    expect(getEffectiveLanguage('system', 'zh-TW')).toBe('zh-TW')
    expect(getEffectiveLanguage('system', 'zh-CN')).toBe('zh-TW')
  })

  it('should default to English for non-Chinese browser languages', () => {
    expect(getEffectiveLanguage('system', 'ja-JP')).toBe('en')
    expect(getEffectiveLanguage('system', 'fr-FR')).toBe('en')
  })

  it('should have appName in both languages', () => {
    expect(translations.en.appName).toBe('UniConvert')
    expect(translations['zh-TW'].appName).toBe('UniConvert')
  })
})
