/**
 * 版本比較屬性測試
 * **Property 1: Version Comparison Correctness**
 * **Validates: Requirements 1.2**
 * 
 * Feature: electron-auto-update
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parseVersion, compareVersions, isUpdateAvailable, formatVersion } from '../src/version.js'

// 生成有效的 semver 版本號
const versionArb = fc.tuple(
  fc.integer({ min: 0, max: 999 }),
  fc.integer({ min: 0, max: 999 }),
  fc.integer({ min: 0, max: 999 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`)

// 生成帶有 'v' 前綴的版本號
const versionWithPrefixArb = versionArb.map(v => fc.boolean().map(hasPrefix => hasPrefix ? `v${v}` : v)).chain(x => x)

describe('Version Comparison - Property Tests', () => {
  
  /**
   * Property 1.1: 版本比較的反對稱性
   * 如果 v1 > v2，則 v2 < v1
   */
  it('should be antisymmetric: if v1 > v2 then v2 < v1', () => {
    fc.assert(
      fc.property(versionArb, versionArb, (v1, v2) => {
        const cmp1 = compareVersions(v1, v2)
        const cmp2 = compareVersions(v2, v1)
        
        if (cmp1 > 0) expect(cmp2).toBeLessThan(0)
        else if (cmp1 < 0) expect(cmp2).toBeGreaterThan(0)
        else expect(cmp2).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.2: 版本比較的傳遞性
   * 如果 v1 <= v2 且 v2 <= v3，則 v1 <= v3
   */
  it('should be transitive: if v1 <= v2 and v2 <= v3 then v1 <= v3', () => {
    fc.assert(
      fc.property(versionArb, versionArb, versionArb, (v1, v2, v3) => {
        const cmp12 = compareVersions(v1, v2)
        const cmp23 = compareVersions(v2, v3)
        const cmp13 = compareVersions(v1, v3)
        
        if (cmp12 <= 0 && cmp23 <= 0) {
          expect(cmp13).toBeLessThanOrEqual(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.3: 版本比較的自反性
   * 任何版本與自己比較應該相等
   */
  it('should be reflexive: v == v', () => {
    fc.assert(
      fc.property(versionArb, (v) => {
        expect(compareVersions(v, v)).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.4: 解析後格式化應該產生一致的結果
   * formatVersion(v) 應該是冪等的
   */
  it('should produce consistent format after parsing', () => {
    fc.assert(
      fc.property(versionArb, (v) => {
        const formatted = formatVersion(v)
        const formattedAgain = formatVersion(formatted)
        expect(formatted).toBe(formattedAgain)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.5: 'v' 前綴不應影響比較結果
   */
  it('should ignore v prefix in comparison', () => {
    fc.assert(
      fc.property(versionArb, (v) => {
        const withPrefix = `v${v}`
        expect(compareVersions(v, withPrefix)).toBe(0)
        expect(compareVersions(withPrefix, v)).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.6: isUpdateAvailable 應該與 compareVersions 一致
   */
  it('should have isUpdateAvailable consistent with compareVersions', () => {
    fc.assert(
      fc.property(versionArb, versionArb, (current, latest) => {
        const hasUpdate = isUpdateAvailable(current, latest)
        const comparison = compareVersions(latest, current)
        
        expect(hasUpdate).toBe(comparison > 0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.7: 較大的 major 版本總是較新
   */
  it('should consider higher major version as newer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 998 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 999 }),
        (major, minor1, patch1, minor2, patch2) => {
          const v1 = `${major}.${minor1}.${patch1}`
          const v2 = `${major + 1}.${minor2}.${patch2}`
          
          expect(compareVersions(v2, v1)).toBe(1)
          expect(isUpdateAvailable(v1, v2)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Version Comparison - Unit Tests', () => {
  
  it('should correctly compare equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0)
  })

  it('should correctly identify newer versions', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
  })

  it('should correctly identify older versions', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
  })

  it('should handle versions with v prefix', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('v1.0.1', 'v1.0.0')).toBe(1)
  })

  it('should handle partial versions', () => {
    expect(parseVersion('1')).toEqual([1, 0, 0])
    expect(parseVersion('1.2')).toEqual([1, 2, 0])
  })

  it('should detect update availability', () => {
    expect(isUpdateAvailable('1.0.0', '1.0.1')).toBe(true)
    expect(isUpdateAvailable('1.0.0', '1.0.0')).toBe(false)
    expect(isUpdateAvailable('1.0.1', '1.0.0')).toBe(false)
  })
})
