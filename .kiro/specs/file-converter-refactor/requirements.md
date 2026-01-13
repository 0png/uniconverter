# Requirements Document

## Introduction

重構 Uniconvert 應用程式的檔案轉換功能，修復目前損壞的轉換器並改善程式碼結構、錯誤處理和可維護性。

## Glossary

- **Converter**: 負責執行特定類型檔案轉換的模組
- **FFmpeg**: 用於音訊和影片處理的多媒體框架
- **Sharp**: 用於圖片處理的 Node.js 函式庫
- **PDF-lib**: 用於 PDF 操作的函式庫
- **pdfjs-dist**: 用於 PDF 渲染的函式庫
- **skia-canvas**: 用於 Canvas 渲染的函式庫

## Requirements

### Requirement 1: 依賴檢查與錯誤處理

**User Story:** 作為使用者，我希望在轉換失敗時能得到清楚的錯誤訊息，以便了解問題所在。

#### Acceptance Criteria

1. WHEN 轉換器初始化時，THE Converter_Module SHALL 檢查所有必要的依賴是否可用
2. IF 必要的依賴不可用，THEN THE Converter_Module SHALL 回傳描述性的錯誤訊息
3. WHEN 轉換過程發生錯誤，THE Converter_Module SHALL 捕獲錯誤並回傳詳細的錯誤資訊
4. THE Converter_Module SHALL 在每次轉換操作前驗證輸入檔案是否存在

### Requirement 2: 圖片轉換功能

**User Story:** 作為使用者，我希望能夠批量轉換圖片格式並合併圖片為 PDF。

#### Acceptance Criteria

1. WHEN 使用者選擇批量轉 PNG，THE Image_Converter SHALL 將所有支援的圖片格式轉換為 PNG
2. WHEN 使用者選擇批量轉 JPG，THE Image_Converter SHALL 將所有支援的圖片格式轉換為 JPG
3. WHEN 使用者選擇合併圖片為 PDF，THE Image_Converter SHALL 將多張圖片合併為單一 PDF 檔案
4. THE Image_Converter SHALL 支援 PNG、JPG、JPEG、HEIC、WEBP、BMP 格式的輸入
5. IF 圖片檔案損壞或格式不支援，THEN THE Image_Converter SHALL 跳過該檔案並記錄錯誤

### Requirement 3: PDF 轉換功能

**User Story:** 作為使用者，我希望能夠將 PDF 的每一頁轉換為圖片。

#### Acceptance Criteria

1. WHEN 使用者選擇 PDF 每頁轉 PNG，THE PDF_Converter SHALL 將 PDF 的每一頁轉換為 PNG 圖片
2. WHEN 使用者選擇 PDF 每頁轉 JPG，THE PDF_Converter SHALL 將 PDF 的每一頁轉換為 JPG 圖片
3. THE PDF_Converter SHALL 以適當的解析度（至少 144 DPI）渲染 PDF 頁面
4. THE PDF_Converter SHALL 為每個輸出檔案使用原始檔名加上頁碼命名
5. IF PDF 檔案損壞或無法讀取，THEN THE PDF_Converter SHALL 回傳錯誤並繼續處理其他檔案

### Requirement 4: 影片轉換功能

**User Story:** 作為使用者，我希望能夠轉換影片格式並從影片中提取音訊。

#### Acceptance Criteria

1. WHEN 使用者選擇批量轉 MP4，THE Video_Converter SHALL 將影片轉換為 MP4 格式
2. WHEN 使用者選擇批量轉 MOV，THE Video_Converter SHALL 將影片轉換為 MOV 格式
3. WHEN 使用者選擇提取 MP3，THE Video_Converter SHALL 從影片中提取音訊並儲存為 MP3
4. THE Video_Converter SHALL 支援 MP4、MOV、AVI、MKV 格式的輸入
5. IF FFmpeg 不可用，THEN THE Video_Converter SHALL 回傳明確的錯誤訊息

### Requirement 5: 音訊轉換功能

**User Story:** 作為使用者，我希望能夠轉換音訊檔案格式。

#### Acceptance Criteria

1. WHEN 使用者選擇批量轉 MP3，THE Audio_Converter SHALL 將音訊轉換為 MP3 格式
2. WHEN 使用者選擇批量轉 WAV，THE Audio_Converter SHALL 將音訊轉換為 WAV 格式
3. WHEN 使用者選擇批量轉 M4A，THE Audio_Converter SHALL 將音訊轉換為 M4A 格式
4. THE Audio_Converter SHALL 支援 MP3、WAV、M4A 格式的輸入
5. IF FFmpeg 不可用，THEN THE Audio_Converter SHALL 回傳明確的錯誤訊息

### Requirement 6: 輸出目錄處理

**User Story:** 作為使用者，我希望能夠選擇輸出檔案的儲存位置。

#### Acceptance Criteria

1. WHEN 使用者指定自訂輸出目錄，THE Converter_Module SHALL 將轉換後的檔案儲存到該目錄
2. WHEN 使用者未指定輸出目錄，THE Converter_Module SHALL 將轉換後的檔案儲存到原始檔案所在目錄
3. IF 輸出目錄不存在，THEN THE Converter_Module SHALL 自動建立該目錄
4. THE Converter_Module SHALL 避免覆蓋現有檔案，使用時間戳記或序號區分

### Requirement 7: 統一的轉換結果回報

**User Story:** 作為使用者，我希望能夠清楚知道轉換的成功和失敗數量。

#### Acceptance Criteria

1. THE Converter_Module SHALL 回傳包含成功數量和失敗數量的結果物件
2. WHEN 轉換完成，THE Converter_Module SHALL 提供每個失敗檔案的錯誤原因
3. THE Converter_Module SHALL 使用一致的結果格式：`{ ok: number, fail: number, errors: Array }`
