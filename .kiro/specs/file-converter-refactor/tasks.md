# Implementation Plan: File Converter Refactor

## Overview

重構 `converters/` 目錄下的檔案轉換模組，改善錯誤處理、依賴檢查和結果回報機制。不修改前端 GUI。

## Tasks

- [x] 1. 建立 Utils 工具模組
  - [x] 1.1 建立 `converters/utils.js` 檔案
    - 實作 `checkDependency` 函式檢查依賴可用性
    - 實作 `fileExists` 函式驗證檔案存在
    - 實作 `ensureDir` 函式確保目錄存在
    - 實作 `getUniqueFilename` 函式生成不重複檔名
    - 實作 `createResult` 函式建立標準化結果物件
    - _Requirements: 1.1, 1.4, 6.3, 6.4, 7.1, 7.3_

- [x] 2. 重構 Image Converter
  - [x] 2.1 重構 `converters/image.js`
    - 加入依賴檢查（sharp, pdf-lib, pdfjs-dist, skia-canvas）
    - 使用 utils 模組的共用函式
    - 改善 `batchConvert` 函式的錯誤處理
    - 改善 `mergeImagesToPDF` 函式的錯誤處理
    - 改善 `pdfEachPageToImage` 函式的錯誤處理
    - 統一回傳 `{ ok, fail, errors }` 格式
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 重構 Video Converter
  - [x] 3.1 重構 `converters/video.js`
    - 加入 FFmpeg 依賴檢查
    - 使用 utils 模組的共用函式
    - 改善 `batchConvertVideo` 函式的錯誤處理
    - 改善 `extractAudioMp3` 函式的錯誤處理
    - 統一回傳 `{ ok, fail, errors }` 格式
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. 重構 Audio Converter
  - [x] 4.1 重構 `converters/audio.js`
    - 加入 FFmpeg 依賴檢查
    - 使用 utils 模組的共用函式
    - 改善 `batchConvertAudio` 函式的錯誤處理
    - 統一回傳 `{ ok, fail, errors }` 格式
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. 重構 Index 入口模組
  - [x] 5.1 重構 `converters/index.js`
    - 使用 utils 模組的共用函式
    - 確保所有動作都回傳統一格式
    - 加入輸入驗證
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_

- [ ] 6. Checkpoint - 確保所有轉換功能正常運作
  - 手動測試各轉換功能
  - 確認錯誤處理正確
  - 如有問題請告知

## Notes

- 此重構僅涉及 `converters/` 目錄，不修改前端 GUI
- 保持現有的 API 介面不變，確保與前端相容
- 所有轉換器統一使用 `{ ok: number, fail: number, errors: Array }` 格式回傳結果
