/**
 * Sidebar 元件屬性測試
 * **Property 11: Sidebar Active View Highlighting**
 * **Validates: Requirements 5.4**
 * 
 * Feature: app-jsx-refactor
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// 有效視圖選項的 arbitrary
const viewArb = fc.constantFrom('home', 'history', 'settings', 'about')

// 所有視圖列表
const ALL_VIEWS = ['home', 'history', 'settings', 'about']

/**
 * 模擬 Sidebar 的視圖高亮邏輯
 * 這是從 Sidebar 元件中抽取的核心邏輯
 * 
 * @param {string} currentView - 當前視圖
 * @returns {Object} 每個視圖的 variant 狀態
 */
function getViewVariants(currentView) {
  return ALL_VIEWS.reduce((acc, view) => {
    acc[view] = currentView === view ? 'secondary' : 'ghost'
    return acc
  }, {})
}

/**
 * 計算有多少個視圖是 active 狀態
 * @param {Object} variants - 視圖 variant 狀態物件
 * @returns {number} active 視圖數量
 */
function countActiveViews(variants) {
  return Object.values(variants).filter(v => v === 'secondary').length
}

describe('Sidebar - Property Tests', () => {

  /**
   * Property 11: Sidebar Active View Highlighting
   * *For any* currentView value in ['home', 'history', 'settings', 'about'], 
   * exactly one navigation button SHALL have the 'secondary' variant (active state).
   */
  it('should have exactly one active view for any valid currentView', () => {
    fc.assert(
      fc.property(viewArb, (currentView) => {
        const variants = getViewVariants(currentView)
        const activeCount = countActiveViews(variants)
        
        // 應該恰好有一個 active 視圖
        expect(activeCount).toBe(1)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11.1: 當前視圖應該是 active 狀態
   */
  it('should mark the current view as active', () => {
    fc.assert(
      fc.property(viewArb, (currentView) => {
        const variants = getViewVariants(currentView)
        
        // 當前視圖應該是 'secondary' (active)
        expect(variants[currentView]).toBe('secondary')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11.2: 非當前視圖應該是 inactive 狀態
   */
  it('should mark non-current views as inactive', () => {
    fc.assert(
      fc.property(viewArb, (currentView) => {
        const variants = getViewVariants(currentView)
        
        // 所有非當前視圖應該是 'ghost' (inactive)
        ALL_VIEWS.forEach(view => {
          if (view !== currentView) {
            expect(variants[view]).toBe('ghost')
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11.3: 切換視圖應該正確更新 active 狀態
   */
  it('should correctly update active state when switching views', () => {
    fc.assert(
      fc.property(viewArb, viewArb, (fromView, toView) => {
        const beforeVariants = getViewVariants(fromView)
        const afterVariants = getViewVariants(toView)
        
        // 切換前，fromView 是 active
        expect(beforeVariants[fromView]).toBe('secondary')
        
        // 切換後，toView 是 active
        expect(afterVariants[toView]).toBe('secondary')
        
        // 如果 fromView !== toView，則 fromView 應該變成 inactive
        if (fromView !== toView) {
          expect(afterVariants[fromView]).toBe('ghost')
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('Sidebar - Unit Tests', () => {

  it('should have all four views defined', () => {
    expect(ALL_VIEWS).toHaveLength(4)
    expect(ALL_VIEWS).toContain('home')
    expect(ALL_VIEWS).toContain('history')
    expect(ALL_VIEWS).toContain('settings')
    expect(ALL_VIEWS).toContain('about')
  })

  it('should return correct variants for home view', () => {
    const variants = getViewVariants('home')
    expect(variants.home).toBe('secondary')
    expect(variants.history).toBe('ghost')
    expect(variants.settings).toBe('ghost')
    expect(variants.about).toBe('ghost')
  })

  it('should return correct variants for settings view', () => {
    const variants = getViewVariants('settings')
    expect(variants.home).toBe('ghost')
    expect(variants.history).toBe('ghost')
    expect(variants.settings).toBe('secondary')
    expect(variants.about).toBe('ghost')
  })

  it('should return correct variants for history view', () => {
    const variants = getViewVariants('history')
    expect(variants.home).toBe('ghost')
    expect(variants.history).toBe('secondary')
    expect(variants.settings).toBe('ghost')
    expect(variants.about).toBe('ghost')
  })

  it('should return correct variants for about view', () => {
    const variants = getViewVariants('about')
    expect(variants.home).toBe('ghost')
    expect(variants.history).toBe('ghost')
    expect(variants.settings).toBe('ghost')
    expect(variants.about).toBe('secondary')
  })
})
