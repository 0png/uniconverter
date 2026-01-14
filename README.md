# Uniconvert

<p align="center">
  <img src="icon.png" alt="Uniconvert Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A universal file converter for images, videos, audio and documents</strong>
</p>

<p align="center">
  <a href="#english">English</a> | <a href="#繁體中文">繁體中文</a>
</p>

---

## English

### Introduction

Uniconvert is a cross-platform file conversion tool built with Electron + React. It supports common conversion tasks for images, PDFs, audio, and video files.

### Features

- **Images**
  - Merge multiple images into a single PDF
  - Batch convert to PNG, JPG, WEBP, ICO, BMP, GIF, TIFF
  - Support for HEIC/HEIF format input
  
- **Documents**
  - PDF pages to PNG
  - PDF pages to JPG
  
- **Video**
  - Batch convert to MP4, MOV
  - Extract audio to MP3
  
- **Audio**
  - Batch convert to MP3, WAV, M4A

### Smart Task Queue

- Automatically groups files by type (images, videos, audio, documents)
- Smart action recommendations based on file type
- Process multiple file types in one session
- Individual or batch processing options

### System Requirements

- Windows 10/11
- No additional software required (ffmpeg is bundled)

### Installation

Download the latest release from [Releases](https://github.com/0png/uniconverter/releases):

- **Installer**: `Uniconvert Setup 1.0.0.exe` - Standard installation with Start Menu shortcuts
- **Portable**: `win-unpacked/Uniconvert.exe` - No installation required

### Usage

1. Drag and drop files or click "Select Files"
2. Files are automatically grouped by type
3. Select output format for each group
4. Choose output location (source folder or custom)
5. Click "Start All" or start individual groups

### Settings

- **Language**: English / 繁體中文 / System
- **Theme**: Light / Dark / System
- **Output Location**: Source folder / Custom folder
- **Auto-open folder**: Open output folder after conversion

### Development

This project uses a pnpm workspace monorepo structure:

```
packages/
├── shared/        # Shared utilities (@uniconvert/shared)
├── converters/    # File converters (@uniconvert/converters)
├── renderer/      # React frontend (@uniconvert/renderer)
└── electron-app/  # Electron main process (@uniconvert/electron-app)
```

```bash
# Install dependencies
pnpm install

# Development mode (Electron app)
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Build for production release
pnpm release:build
```

### License

MIT License - see [LICENSE](./LICENSE)

---

## 繁體中文

### 簡介

Uniconvert 是一款跨平台的檔案轉換工具（Electron + React），支援圖片、PDF、音訊與影片的常見轉檔工作。

### 功能特色

- **圖片**
  - 合併多張圖片為單一 PDF
  - 批量轉換為 PNG、JPG、WEBP、ICO、BMP、GIF、TIFF
  - 支援 HEIC/HEIF 格式輸入
  
- **文件**
  - PDF 每頁轉 PNG
  - PDF 每頁轉 JPG
  
- **影片**
  - 批量轉換為 MP4、MOV
  - 提取音訊為 MP3
  
- **音訊**
  - 批量轉換為 MP3、WAV、M4A

### 智能任務佇列

- 自動依檔案類型分組（圖片、影片、音訊、文件）
- 根據檔案類型智能推薦操作
- 一次處理多種檔案類型
- 支援單獨或批量處理

### 系統需求

- Windows 10/11
- 無需額外安裝軟體（已內建 ffmpeg）

### 安裝方式

從 [Releases](https://github.com/0png/uniconverter/releases) 下載最新版本：

- **安裝版**: `Uniconvert Setup 1.0.0.exe` - 標準安裝，建立開始選單捷徑
- **免安裝版**: `win-unpacked/Uniconvert.exe` - 無需安裝，直接執行

### 使用方式

1. 拖放檔案或點擊「選擇檔案」
2. 檔案會自動依類型分組
3. 為每個群組選擇輸出格式
4. 選擇輸出位置（原始資料夾或自訂）
5. 點擊「全部開始」或單獨啟動各群組

### 設定選項

- **語言**: English / 繁體中文 / 系統預設
- **主題**: 淺色 / 深色 / 系統預設
- **輸出位置**: 原始檔案位置 / 自訂資料夾
- **自動開啟資料夾**: 轉換完成後開啟輸出資料夾

### 開發環境

本專案使用 pnpm workspace monorepo 架構：

```
packages/
├── shared/        # 共用工具 (@uniconvert/shared)
├── converters/    # 檔案轉換器 (@uniconvert/converters)
├── renderer/      # React 前端 (@uniconvert/renderer)
└── electron-app/  # Electron 主程序 (@uniconvert/electron-app)
```

```bash
# 安裝依賴
pnpm install

# 開發模式（Electron 應用）
pnpm dev

# 建置所有套件
pnpm build

# 執行所有測試
pnpm test

# 打包發布版本
pnpm release:build
```

### 授權條款

MIT 授權 - 詳見 [LICENSE](./LICENSE)

---

## Author

**0png** - [GitHub](https://github.com/0png)

## Copyright

© 2025 0png. All rights reserved.
