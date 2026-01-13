/**
 * 工具函式模組屬性測試
 * **Property 1: bytesToSize Unit Conversion**
 * **Validates: Requirements 2.2, 2.3, 2.4**
 * 
 * Feature: app-jsx-refactor
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { bytesToSize } from './utils.js'

// 位元組範圍的 arbitrary
const bytesArb = fc.nat({ max: 10 * 1024 * 1024 * 1024 }) // 0 到 10GB

// 小於 1024 的位元組 arbitrary
const bytesUnderKBArb = fc.nat({ max: 1023 })

// 1024 到 1048575 的位元組 arbitrary (KB 範圍)
const bytesKBRangeArb = fc.integer({ min: 1024, max: 1048575 })

// 1048576 以上的位元組 arbitrary (MB 範圍)
const bytesMBRangeArb = fc.integer({ min: 1048576, max: 10 * 1024 * 1024 * 1024 })

describe('bytesToSize - Property Tests', () => {

  /**
   * Property 1: bytesToSize Unit Conversion
   * *For any* non-negative integer byte value, the `bytesToSize` function SHALL return:
   * - A string ending with " B" when value < 1024
   * - A string ending with " KB" when 1024 <= value < 1048576
   * - A string ending with " MB" when value >= 1048576
   */
  it('should return correct unit suffix for any non-negative byte value', () => {
    fc.assert(
      fc.property(bytesArb, (bytes) => {
        const result = bytesToSize(bytes)
        
        if (bytes < 1024) {
          expect(result).toMatch(/ B$/)
        } else if (bytes < 1024 * 1024) {
          expect(result).toMatch(/ KB$/)
        } else {
          expect(result).toMatch(/ MB$/)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.1: 小於 1024 位元組應該回傳 " B" 結尾
   */
  it('should return " B" suffix for bytes < 1024', () => {
    fc.assert(
      fc.property(bytesUnderKBArb, (bytes) => {
        const result = bytesToSize(bytes)
        expect(result).toBe(`${bytes} B`)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.2: 1024 到 1048575 位元組應該回傳 " KB" 結尾
   */
  it('should return " KB" suffix for 1024 <= bytes < 1048576', () => {
    fc.assert(
      fc.property(bytesKBRangeArb, (bytes) => {
        const result = bytesToSize(bytes)
        expect(result).toMatch(/ KB$/)
        
        // 驗證數值正確性
        const expectedValue = (bytes / 1024).toFixed(2)
        expect(result).toBe(`${expectedValue} KB`)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.3: 1048576 以上位元組應該回傳 " MB" 結尾
   */
  it('should return " MB" suffix for bytes >= 1048576', () => {
    fc.assert(
      fc.property(bytesMBRangeArb, (bytes) => {
        const result = bytesToSize(bytes)
        expect(result).toMatch(/ MB$/)
        
        // 驗證數值正確性
        const expectedValue = (bytes / (1024 * 1024)).toFixed(2)
        expect(result).toBe(`${expectedValue} MB`)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.4: 回傳值應該總是包含數字和單位
   */
  it('should always return a string with number and unit', () => {
    fc.assert(
      fc.property(bytesArb, (bytes) => {
        const result = bytesToSize(bytes)
        
        // 應該是字串
        expect(typeof result).toBe('string')
        
        // 應該匹配 "數字 單位" 格式
        expect(result).toMatch(/^\d+(\.\d+)? (B|KB|MB)$/)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.5: 單調性 - 較大的位元組值應該產生較大或相等的數值部分（在相同單位下）
   */
  it('should maintain monotonicity within same unit', () => {
    fc.assert(
      fc.property(bytesUnderKBArb, bytesUnderKBArb, (bytes1, bytes2) => {
        const result1 = bytesToSize(bytes1)
        const result2 = bytesToSize(bytes2)
        
        const num1 = parseFloat(result1)
        const num2 = parseFloat(result2)
        
        if (bytes1 <= bytes2) {
          expect(num1).toBeLessThanOrEqual(num2)
        } else {
          expect(num1).toBeGreaterThanOrEqual(num2)
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('bytesToSize - Unit Tests', () => {

  it('should handle 0 bytes', () => {
    expect(bytesToSize(0)).toBe('0 B')
  })

  it('should handle boundary value 1023 (max B)', () => {
    expect(bytesToSize(1023)).toBe('1023 B')
  })

  it('should handle boundary value 1024 (min KB)', () => {
    expect(bytesToSize(1024)).toBe('1.00 KB')
  })

  it('should handle boundary value 1048575 (max KB)', () => {
    expect(bytesToSize(1048575)).toBe('1024.00 KB')
  })

  it('should handle boundary value 1048576 (min MB)', () => {
    expect(bytesToSize(1048576)).toBe('1.00 MB')
  })

  it('should handle typical file sizes', () => {
    expect(bytesToSize(500)).toBe('500 B')
    expect(bytesToSize(5120)).toBe('5.00 KB')
    expect(bytesToSize(5242880)).toBe('5.00 MB')
  })

  it('should format KB with 2 decimal places', () => {
    expect(bytesToSize(1536)).toBe('1.50 KB')
    expect(bytesToSize(2560)).toBe('2.50 KB')
  })

  it('should format MB with 2 decimal places', () => {
    expect(bytesToSize(1572864)).toBe('1.50 MB')
    expect(bytesToSize(2621440)).toBe('2.50 MB')
  })
})
