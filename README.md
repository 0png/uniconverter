# Uniconvert

## 簡介
- Uniconvert 是一款跨平台的檔案轉換工具（Electron + React），支援圖片、PDF、音訊與影片的常見轉檔工作。
- 特色包含：合併圖片為 PDF、PDF 每頁拆分為 PNG/JPG、批量圖片轉換（PNG/JPG）、影片轉檔（MP4/MOV）與提取音訊（MP3）、音訊格式互轉（MP3/WAV/M4A）。
- 介面技術：React、Vite、Tailwind、shadcn/ui；桌面端框架：Electron。
- 語言支援：English、繁體中文、系統語言偵測。

## 主要功能
- 圖片：
  - 合併多張圖片為單一 PDF
  - 批量轉 PNG、批量轉 JPG
- PDF：
  - PDF 每頁轉 PNG
  - PDF 每頁轉 JPG
- 影片：
  - 批量轉 MP4
  - 批量轉 MOV
  - 提取音訊為 MP3
- 音訊：
  - 批量轉 MP3 / WAV / M4A

## 系統需求
- Windows 10/11（已在 Windows 驗證）
- Node.js 18+（開發與打包）
- 內建使用 `ffmpeg-static` 搭配 `fluent-ffmpeg`，無需額外安裝 ffmpeg

## 安裝與使用
- 安裝檔（NSIS）：`release/Uniconvert Setup 1.0.0.exe`
  - 雙擊執行安裝；安裝完成後從開始選單啟動 Uniconvert
- 便攜執行檔：`release/win-unpacked/Uniconvert.exe`
  - 無需安裝，直接雙擊啟動

## 基本操作
- 於「工作區」選擇檔案
- 依檔案類型顯示建議操作（例如：PDF 會出現「每頁轉 PNG/JPG」）
- 選擇輸出位置（原始檔案位置或自訂資料夾）
- 按「開始轉換」執行，於下方觀察進度與狀態

## 開發環境
- 安裝依賴：
  - `npm install`
- 開發模式（前端）：
  - `npm run dev`
- 啟動 Electron（建置前端並啟動桌面端）：
  - `npm run start`

## 打包（Windows）
- 準備圖示（由根目錄 `icon.png` 轉成 `.ico`）：
  - `npm run prepare:icons`
- 產生前端靜態檔至 `web_dist/`：
  - `npm run build`
- 產出安裝檔與免安裝版：
  - `npm run release`
- 打包輸出位置：
  - 安裝檔：`release/Uniconvert Setup 1.0.0.exe`
  - 免安裝版：`release/win-unpacked/Uniconvert.exe`

## 設定
- 語言：English / 繁體中文 / 系統偵測
- 主題：淺色 / 深色 / 系統
- 輸出位置：原始檔案位置 / 自訂資料夾

## 目錄結構（節錄）
- `src/`：React 原始碼（UI、邏輯）
- `converters/`：轉檔邏輯（圖片、PDF、音訊、影片）
- `main.js`：Electron 主程序
- `preload.js`：Electron preload（IPC）
- `web_dist/`：Vite建置輸出
- `release/`：打包輸出（安裝檔、免安裝版）
- `icon.png`：程式圖示來源（打包時轉為 `build/icon.ico`）

## 授權
- 本專案採用 MIT 授權條款，詳見 [LICENSE](./LICENSE)。
