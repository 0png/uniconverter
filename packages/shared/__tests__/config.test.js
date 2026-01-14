/**
 * GitHub 配置屬性測試
 * **Property 5: GitHub Provider Configuration**
 * **Validates: Requirements 6.2**
 * 
 * Feature: electron-auto-update
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { parseRepositoryUrl, parseGitHubConfig, isValidGitHubConfig } from '../src/config.js'

// 生成有效的 GitHub 用戶名（字母數字和連字符）
const usernameArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(s) && !s.includes('--'))

// 生成有效的 repo 名稱
const repoNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[a-z0-9][a-z0-9._-]*$/.test(s) && !s.endsWith('.'))

describe('GitHub Config - Property Tests', () => {

  /**
   * Property 5.1: HTTPS URL 解析應該正確提取 owner 和 repo
   */
  it('should correctly parse HTTPS GitHub URLs', () => {
    fc.assert(
      fc.property(usernameArb, repoNameArb, (owner, repo) => {
        const url = `https://github.com/${owner}/${repo}.git`
        const result = parseRepositoryUrl(url)
        
        expect(result).not.toBeNull()
        expect(result.owner).toBe(owner)
        expect(result.repo).toBe(repo)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2: SSH URL 解析應該正確提取 owner 和 repo
   */
  it('should correctly parse SSH GitHub URLs', () => {
    fc.assert(
      fc.property(usernameArb, repoNameArb, (owner, repo) => {
        const url = `git@github.com:${owner}/${repo}.git`
        const result = parseRepositoryUrl(url)
        
        expect(result).not.toBeNull()
        expect(result.owner).toBe(owner)
        expect(result.repo).toBe(repo)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.3: 簡短格式解析應該正確提取 owner 和 repo
   */
  it('should correctly parse shorthand format', () => {
    fc.assert(
      fc.property(usernameArb, repoNameArb, (owner, repo) => {
        const url = `${owner}/${repo}`
        const result = parseRepositoryUrl(url)
        
        expect(result).not.toBeNull()
        expect(result.owner).toBe(owner)
        expect(result.repo).toBe(repo)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.4: 有效配置應該通過驗證
   */
  it('should validate correct configs as valid', () => {
    fc.assert(
      fc.property(usernameArb, repoNameArb, (owner, repo) => {
        const config = { owner, repo }
        expect(isValidGitHubConfig(config)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.5: parseGitHubConfig 應該優先使用 build.publish 配置
   */
  it('should prioritize build.publish config over repository', () => {
    fc.assert(
      fc.property(
        usernameArb, repoNameArb,
        usernameArb, repoNameArb,
        (publishOwner, publishRepo, repoOwner, repoRepo) => {
          const packageJson = {
            build: {
              publish: {
                provider: 'github',
                owner: publishOwner,
                repo: publishRepo
              }
            },
            repository: {
              type: 'git',
              url: `https://github.com/${repoOwner}/${repoRepo}.git`
            }
          }
          
          const result = parseGitHubConfig(packageJson)
          
          expect(result).not.toBeNull()
          expect(result.owner).toBe(publishOwner)
          expect(result.repo).toBe(publishRepo)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.6: 沒有 build.publish 時應該使用 repository
   */
  it('should fallback to repository when build.publish is not present', () => {
    fc.assert(
      fc.property(usernameArb, repoNameArb, (owner, repo) => {
        const packageJson = {
          repository: {
            type: 'git',
            url: `https://github.com/${owner}/${repo}.git`
          }
        }
        
        const result = parseGitHubConfig(packageJson)
        
        expect(result).not.toBeNull()
        expect(result.owner).toBe(owner)
        expect(result.repo).toBe(repo)
      }),
      { numRuns: 100 }
    )
  })
})

describe('GitHub Config - Unit Tests', () => {

  it('should parse various URL formats', () => {
    expect(parseRepositoryUrl('https://github.com/owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepositoryUrl('https://github.com/owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepositoryUrl('git@github.com:owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepositoryUrl('github:owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepositoryUrl('owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('should return null for invalid URLs', () => {
    expect(parseRepositoryUrl('')).toBeNull()
    expect(parseRepositoryUrl(null)).toBeNull()
    expect(parseRepositoryUrl(undefined)).toBeNull()
    expect(parseRepositoryUrl('invalid')).toBeNull()
  })

  it('should validate configs correctly', () => {
    expect(isValidGitHubConfig({ owner: 'test', repo: 'repo' })).toBe(true)
    expect(isValidGitHubConfig({ owner: '', repo: 'repo' })).toBe(false)
    expect(isValidGitHubConfig({ owner: 'test', repo: '' })).toBe(false)
    expect(isValidGitHubConfig(null)).toBe(false)
    expect(isValidGitHubConfig({})).toBe(false)
  })

  it('should parse package.json with string repository', () => {
    const packageJson = {
      repository: 'https://github.com/0png/uniconverter.git'
    }
    
    const result = parseGitHubConfig(packageJson)
    expect(result).toEqual({ owner: '0png', repo: 'uniconverter' })
  })

  it('should parse package.json with object repository', () => {
    const packageJson = {
      repository: {
        type: 'git',
        url: 'https://github.com/0png/uniconverter.git'
      }
    }
    
    const result = parseGitHubConfig(packageJson)
    expect(result).toEqual({ owner: '0png', repo: 'uniconverter' })
  })
})
