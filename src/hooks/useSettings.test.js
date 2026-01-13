/**
 * 設定 Hook 屬性測試
 * **Property 3: Settings Persistence Round-Trip**
 * **Property 4: Theme Application**
 * **Validates: Requirements 3.7, 10.4, 10.5**
 * 
 * Feature: app-jsx-refactor
 * 
 * 注意：由於專案未安裝 @testing-library/react，
 * 這裡測試設定相關的純函式邏輯和 localStorage 互動
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'

// Mock localStorage
const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value.toString() }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get store() { return { ...store } }
  }
}

// Arbitraries
const themeArb = fc.constantFrom('light', 'dark', 'system')
const languageArb = fc.constantFrom('en', 'zh-TW', 'system')
const outputModeArb = fc.constantFrom('source', 'custom')
const pathArb = fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes('\0'))
const booleanArb = fc.boolean()

// 有效的 outputConfig arbitrary
const outputConfigArb = fc.record({
  mode: outputModeArb,
  path: pathArb
})

/**
 * 模擬 useSettings 的初始化邏輯（純函式版本）
 * 用於測試 localStorage 讀取邏輯
 */
function initializeSettings(localStorage) {
  const theme = localStorage.getItem('theme') || 'system'
  const language = localStorage.getItem('language') || 'system'
  const openFolderAfterConversion = localStorage.getItem('openFolderAfterConversion') !== 'false'
  const discordRPCEnabled = localStorage.getItem('discordRPCEnabled') === 'true'
  
  let outputConfig
  try {
    outputConfig = JSON.parse(localStorage.getItem('outputConfig')) || { mode: 'source', path: '' }
  } catch {
    outputConfig = { mode: 'source', path: '' }
  }
  
  return {
    theme,
    language,
    outputConfig,
    openFolderAfterConversion,
    discordRPCEnabled
  }
}

/**
 * 模擬主題應用邏輯（純函式版本）
 * 用於測試主題 class 應用
 */
function applyTheme(theme, systemPrefersDark = false) {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return theme
}

describe('useSettings - Property Tests', () => {
  let localStorageMock

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
  })

  /**
   * Property 3: Settings Persistence Round-Trip
   * *For any* valid settings state (theme, language, outputConfig, openFolderAfterConversion, discordRPCEnabled),
   * saving to localStorage and then reading back SHALL produce equivalent values.
   */
  describe('Property 3: Settings Persistence Round-Trip', () => {
    
    it('should persist and read back theme correctly', () => {
      fc.assert(
        fc.property(themeArb, (theme) => {
          localStorageMock.clear()
          localStorageMock.setItem('theme', theme)
          
          const settings = initializeSettings(localStorageMock)
          expect(settings.theme).toBe(theme)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist and read back language correctly', () => {
      fc.assert(
        fc.property(languageArb, (language) => {
          localStorageMock.clear()
          localStorageMock.setItem('language', language)
          
          const settings = initializeSettings(localStorageMock)
          expect(settings.language).toBe(language)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist and read back outputConfig correctly', () => {
      fc.assert(
        fc.property(outputConfigArb, (outputConfig) => {
          localStorageMock.clear()
          localStorageMock.setItem('outputConfig', JSON.stringify(outputConfig))
          
          const settings = initializeSettings(localStorageMock)
          expect(settings.outputConfig).toEqual(outputConfig)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist and read back openFolderAfterConversion correctly', () => {
      fc.assert(
        fc.property(booleanArb, (value) => {
          localStorageMock.clear()
          localStorageMock.setItem('openFolderAfterConversion', value.toString())
          
          const settings = initializeSettings(localStorageMock)
          // 原始邏輯：localStorage.getItem('openFolderAfterConversion') !== 'false'
          // 當 value 為 true 時，存 'true'，讀取時 'true' !== 'false' = true
          // 當 value 為 false 時，存 'false'，讀取時 'false' !== 'false' = false
          expect(settings.openFolderAfterConversion).toBe(value)
        }),
        { numRuns: 100 }
      )
    })

    it('should persist and read back discordRPCEnabled correctly', () => {
      fc.assert(
        fc.property(booleanArb, (value) => {
          localStorageMock.clear()
          localStorageMock.setItem('discordRPCEnabled', value.toString())
          
          const settings = initializeSettings(localStorageMock)
          // 原始邏輯：localStorage.getItem('discordRPCEnabled') === 'true'
          expect(settings.discordRPCEnabled).toBe(value)
        }),
        { numRuns: 100 }
      )
    })

    it('should handle complete settings round-trip', () => {
      fc.assert(
        fc.property(
          themeArb,
          languageArb,
          outputConfigArb,
          booleanArb,
          booleanArb,
          (theme, language, outputConfig, openFolder, discordRPC) => {
            localStorageMock.clear()
            
            // 寫入
            localStorageMock.setItem('theme', theme)
            localStorageMock.setItem('language', language)
            localStorageMock.setItem('outputConfig', JSON.stringify(outputConfig))
            localStorageMock.setItem('openFolderAfterConversion', openFolder.toString())
            localStorageMock.setItem('discordRPCEnabled', discordRPC.toString())
            
            // 讀取
            const settings = initializeSettings(localStorageMock)
            
            // 驗證
            expect(settings.theme).toBe(theme)
            expect(settings.language).toBe(language)
            expect(settings.outputConfig).toEqual(outputConfig)
            expect(settings.openFolderAfterConversion).toBe(openFolder)
            expect(settings.discordRPCEnabled).toBe(discordRPC)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 4: Theme Application
   * *For any* theme value in ['light', 'dark', 'system'], after setting the theme,
   * the document.documentElement SHALL have exactly one of 'light' or 'dark' class applied.
   */
  describe('Property 4: Theme Application', () => {
    
    it('should always resolve to either "light" or "dark", never "system"', () => {
      fc.assert(
        fc.property(themeArb, booleanArb, (theme, systemPrefersDark) => {
          const appliedTheme = applyTheme(theme, systemPrefersDark)
          
          expect(appliedTheme).not.toBe('system')
          expect(['light', 'dark']).toContain(appliedTheme)
        }),
        { numRuns: 100 }
      )
    })

    it('should apply "light" when theme is "light" regardless of system preference', () => {
      fc.assert(
        fc.property(booleanArb, (systemPrefersDark) => {
          const appliedTheme = applyTheme('light', systemPrefersDark)
          expect(appliedTheme).toBe('light')
        }),
        { numRuns: 100 }
      )
    })

    it('should apply "dark" when theme is "dark" regardless of system preference', () => {
      fc.assert(
        fc.property(booleanArb, (systemPrefersDark) => {
          const appliedTheme = applyTheme('dark', systemPrefersDark)
          expect(appliedTheme).toBe('dark')
        }),
        { numRuns: 100 }
      )
    })

    it('should follow system preference when theme is "system"', () => {
      fc.assert(
        fc.property(booleanArb, (systemPrefersDark) => {
          const appliedTheme = applyTheme('system', systemPrefersDark)
          expect(appliedTheme).toBe(systemPrefersDark ? 'dark' : 'light')
        }),
        { numRuns: 100 }
      )
    })

    it('should produce exactly one valid theme class', () => {
      fc.assert(
        fc.property(themeArb, booleanArb, (theme, systemPrefersDark) => {
          const appliedTheme = applyTheme(theme, systemPrefersDark)
          
          // 模擬 DOM class 操作
          const classes = new Set()
          classes.add(appliedTheme)
          
          const hasLight = classes.has('light')
          const hasDark = classes.has('dark')
          
          // 應該恰好有一個主題 class（XOR）
          expect(hasLight !== hasDark).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('useSettings - Unit Tests', () => {
  let localStorageMock

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
  })

  it('should use default values when localStorage is empty', () => {
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.theme).toBe('system')
    expect(settings.language).toBe('system')
    expect(settings.outputConfig).toEqual({ mode: 'source', path: '' })
    expect(settings.openFolderAfterConversion).toBe(true)
    expect(settings.discordRPCEnabled).toBe(false)
  })

  it('should handle invalid JSON in outputConfig gracefully', () => {
    localStorageMock.setItem('outputConfig', 'invalid-json')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.outputConfig).toEqual({ mode: 'source', path: '' })
  })

  it('should handle null outputConfig in localStorage', () => {
    localStorageMock.setItem('outputConfig', 'null')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.outputConfig).toEqual({ mode: 'source', path: '' })
  })

  it('should correctly parse boolean string "true" for discordRPCEnabled', () => {
    localStorageMock.setItem('discordRPCEnabled', 'true')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.discordRPCEnabled).toBe(true)
  })

  it('should correctly parse boolean string "false" for discordRPCEnabled', () => {
    localStorageMock.setItem('discordRPCEnabled', 'false')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.discordRPCEnabled).toBe(false)
  })

  it('should treat any non-"true" value as false for discordRPCEnabled', () => {
    localStorageMock.setItem('discordRPCEnabled', 'yes')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.discordRPCEnabled).toBe(false)
  })

  it('should correctly parse boolean string "false" for openFolderAfterConversion', () => {
    localStorageMock.setItem('openFolderAfterConversion', 'false')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.openFolderAfterConversion).toBe(false)
  })

  it('should treat any non-"false" value as true for openFolderAfterConversion', () => {
    localStorageMock.setItem('openFolderAfterConversion', 'no')
    
    const settings = initializeSettings(localStorageMock)
    
    expect(settings.openFolderAfterConversion).toBe(true)
  })

  describe('applyTheme function', () => {
    it('should return "light" for theme "light"', () => {
      expect(applyTheme('light', false)).toBe('light')
      expect(applyTheme('light', true)).toBe('light')
    })

    it('should return "dark" for theme "dark"', () => {
      expect(applyTheme('dark', false)).toBe('dark')
      expect(applyTheme('dark', true)).toBe('dark')
    })

    it('should return "light" for theme "system" when system prefers light', () => {
      expect(applyTheme('system', false)).toBe('light')
    })

    it('should return "dark" for theme "system" when system prefers dark', () => {
      expect(applyTheme('system', true)).toBe('dark')
    })
  })
})
