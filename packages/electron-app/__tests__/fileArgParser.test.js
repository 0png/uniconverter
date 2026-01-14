/**
 * File Argument Parser 測試
 * 使用 fast-check 進行屬性測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import fs from 'fs'
import path from 'path'
import os from 'os'

const {
  SUPPORTED_EXTENSIONS,
  isSupportedFile,
  getFileSize,
  getFileType,
  parseFileArguments
} = require('../src/fileArgParser.js')

describe('FileArgParser', () => {
  describe('isSupportedFile', () => {
    it('should return true for supported image extensions', () => {
      const imageExts = ['.png', '.jpg', '.jpeg', '.heic', '.webp', '.bmp', '.gif', '.tiff', '.ico']
      for (const ext of imageExts) {
        expect(isSupportedFile(`test${ext}`)).toBe(true)
        expect(isSupportedFile(`C:\\path\\to\\file${ext}`)).toBe(true)
      }
    })

    it('should return true for supported video extensions', () => {
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
      for (const ext of videoExts) {
        expect(isSupportedFile(`test${ext}`)).toBe(true)
      }
    })

    it('should return true for supported audio extensions', () => {
      const audioExts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
      for (const ext of audioExts) {
        expect(isSupportedFile(`test${ext}`)).toBe(true)
      }
    })

    it('should return true for supported document extensions', () => {
      expect(isSupportedFile('test.pdf')).toBe(true)
      expect(isSupportedFile('test.md')).toBe(true)
      expect(isSupportedFile('test.markdown')).toBe(true)
    })

    it('should return false for unsupported extensions', () => {
      expect(isSupportedFile('test.txt')).toBe(false)
      expect(isSupportedFile('test.exe')).toBe(false)
      expect(isSupportedFile('test.doc')).toBe(false)
    })

    it('should return false for invalid inputs', () => {
      expect(isSupportedFile(null)).toBe(false)
      expect(isSupportedFile(undefined)).toBe(false)
      expect(isSupportedFile('')).toBe(false)
      expect(isSupportedFile(123)).toBe(false)
    })
  })

  describe('getFileType', () => {
    it('should return correct type for each extension', () => {
      expect(getFileType('test.png')).toBe('image')
      expect(getFileType('test.jpg')).toBe('image')
      expect(getFileType('test.mp4')).toBe('video')
      expect(getFileType('test.mov')).toBe('video')
      expect(getFileType('test.mp3')).toBe('audio')
      expect(getFileType('test.wav')).toBe('audio')
      expect(getFileType('test.pdf')).toBe('document')
      expect(getFileType('test.md')).toBe('document')
    })

    it('should return null for unsupported extensions', () => {
      expect(getFileType('test.txt')).toBe(null)
      expect(getFileType('test.exe')).toBe(null)
    })

    it('should be case insensitive', () => {
      expect(getFileType('test.PNG')).toBe('image')
      expect(getFileType('test.MP4')).toBe('video')
      expect(getFileType('test.PDF')).toBe('document')
    })
  })

  describe('getFileSize', () => {
    let testDir
    let testFile

    beforeEach(async () => {
      testDir = path.join(os.tmpdir(), `filesize-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      testFile = path.join(testDir, 'test.txt')
      await fs.promises.writeFile(testFile, 'hello world') // 11 bytes
    })

    afterEach(async () => {
      try {
        await fs.promises.unlink(testFile)
        await fs.promises.rmdir(testDir)
      } catch {}
    })

    it('should return correct file size', () => {
      const size = getFileSize(testFile)
      expect(size).toBe(11)
    })

    it('should return 0 for non-existent files', () => {
      expect(getFileSize('/non/existent/file.txt')).toBe(0)
    })

    it('should return 0 for invalid paths', () => {
      expect(getFileSize(null)).toBe(0)
      expect(getFileSize(undefined)).toBe(0)
    })
  })

  describe('parseFileArguments', () => {
    let testDir
    let testFiles = []

    beforeEach(async () => {
      // 建立臨時測試目錄和檔案
      testDir = path.join(os.tmpdir(), `filearg-test-${Date.now()}`)
      await fs.promises.mkdir(testDir, { recursive: true })
      
      // 建立測試檔案
      const extensions = ['.png', '.jpg', '.mp4', '.mp3', '.pdf', '.md']
      for (const ext of extensions) {
        const filePath = path.join(testDir, `test${ext}`)
        await fs.promises.writeFile(filePath, 'test content')
        testFiles.push(filePath)
      }
    })

    afterEach(async () => {
      // 清理測試檔案
      for (const file of testFiles) {
        try {
          await fs.promises.unlink(file)
        } catch {}
      }
      try {
        await fs.promises.rmdir(testDir)
      } catch {}
      testFiles = []
    })

    it('should parse valid file paths from argv', () => {
      // 使用 --file 參數（開發模式）
      const argv = ['node', 'app.js', '--file', testFiles[0]]
      const result = parseFileArguments(argv)
      
      expect(result.files.length).toBe(1)
      expect(result.files[0].path).toBe(testFiles[0])
      expect(result.files[0].type).toBe('image')
      expect(result.files[0].size).toBeGreaterThan(0)
    })

    it('should skip option arguments', () => {
      const argv = ['node', 'app.js', '--debug', '-v', '--file', testFiles[0]]
      const result = parseFileArguments(argv)
      
      expect(result.files.length).toBe(1)
      expect(result.files[0].path).toBe(testFiles[0])
    })

    it('should skip non-existent files', () => {
      // 使用一個絕對不存在的路徑
      const nonExistentPath = path.join(testDir, 'definitely-not-exists-12345.png')
      const argv = ['node', 'app.js', '--file', nonExistentPath]
      const result = parseFileArguments(argv)
      
      expect(result.files.length).toBe(0)
      expect(result.skipped).toContain(nonExistentPath)
    })

    it('should skip unsupported file types', () => {
      const argv = ['node', 'app.js', '--file', 'C:\\path\\to\\file.txt']
      const result = parseFileArguments(argv)
      
      expect(result.files.length).toBe(0)
      expect(result.skipped).toContain('C:\\path\\to\\file.txt')
    })

    it('should return empty arrays for invalid input', () => {
      expect(parseFileArguments(null)).toEqual({ files: [], skipped: [] })
      expect(parseFileArguments(undefined)).toEqual({ files: [], skipped: [] })
      expect(parseFileArguments('not an array')).toEqual({ files: [], skipped: [] })
    })
  })

  describe('Property 8: File Argument Processing', () => {
    it('should correctly categorize all supported extensions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUPPORTED_EXTENSIONS),
          (ext) => {
            const filePath = `C:\\test\\file${ext}`
            
            // 所有支援的副檔名都應該被識別
            expect(isSupportedFile(filePath)).toBe(true)
            
            // 所有支援的副檔名都應該有對應的類型
            const fileType = getFileType(filePath)
            expect(['image', 'video', 'audio', 'document', 'markdown']).toContain(fileType)
          }
        ),
        { numRuns: SUPPORTED_EXTENSIONS.length }
      )
    })
  })
})
