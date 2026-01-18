# Code Review TODO List
> 此檔案為臨時審查清單，不可推送至遠程 repo

## 🔴 重大問題 (High Priority) - 必須立即修復

### ✅ CRITICAL-H1-REOPEN: historyManager.js - writeQueue 全域狀態污染 [已修復]
- **檔案**: `packages/electron-app/src/historyManager.js`
- **行數**: 24
- **問題**: 
  1. `writeQueue` 是模組層級的全域變數，測試之間會互相污染
  2. 測試 A 的操作會影響測試 B 的 writeQueue 狀態
  3. 並發測試會使用同一個 queue，導致不可預測的結果
  4. 在慢速 CI 環境或高負載情況下會隨機失敗
- **為什麼測試沒發現**: 測試使用不同的 filePath，剛好速度夠快沒出問題
- **影響**: 測試隔離失敗，CI 環境會隨機失敗
- **嚴重性**: Critical
- **修復內容**:
  1. 將 `let writeQueue` 改為 `const writeQueues = new Map()`
  2. 新增 `getWriteQueue(filePath)` 和 `setWriteQueue(filePath, queue)` 輔助函式
  3. 所有使用 writeQueue 的地方改為使用 getWriteQueue/setWriteQueue
  4. 每個 filePath 有獨立的 queue，確保測試隔離
- **負責人**: /fix
- **狀態**: ✅ 已修復 (2025-01-18)

### ✅ CRITICAL-H7-REOPEN: image.test.js - 測試清理不完整 [已修復]
- **檔案**: `packages/converters/__tests__/image.test.js`
- **行數**: 73-78
- **問題**: 
  1. 清理順序錯誤：如果第一個 unlink 失敗，後續清理不會執行
  2. `catch {}` 吞掉所有錯誤，隱藏真正的問題
  3. `rmdir()` 會因為目錄不是空的而失敗，但被吞掉了
  4. 下次測試可能因為殘留檔案而失敗
- **影響**: 測試環境污染，Windows 上尤其嚴重（檔案鎖定）
- **嚴重性**: Critical
- **修復內容**:
  1. 使用 `fs.promises.rm(testDir, { recursive: true, force: true })`
  2. 一次刪除整個目錄，避免清理順序問題
  3. 保留 `.catch(() => {})` 避免清理失敗影響測試結果
- **負責人**: /fix
- **狀態**: ✅ 已修復 (2025-01-18)

### ✅ H1-INCOMPLETE: historyManager.js - 並發寫入競爭條件未解決 [已修復]
- **檔案**: `packages/electron-app/src/historyManager.js`
- **函式**: `addEntry()`, `removeEntry()`
- **問題**: 
  1. 雖然修正了「記憶體與磁碟一致性」，但並發問題仍存在
  2. 兩個 `addEntry()` 同時執行時，都會讀到相同的 entries
  3. 後寫入的會覆蓋前一個，導致第一個新增的記錄遺失
  4. `clearAll()` 沒有錯誤處理，失敗時呼叫端無法得知
- **影響**: 多視窗或快速操作時資料遺失
- **嚴重性**: High
- **修復內容**:
  1. 補充詳細註解說明並發安全設計
  2. 新增更嚴格的並發測試（驗證回傳值和中間狀態）
  3. 新增混合操作測試（addEntry + removeEntry 並發）
- **負責人**: /fix
- **狀態**: ✅ 已修復 (2025-01-18)
- **備註**: ⚠️ 但發現新問題 CRITICAL-H1-REOPEN（全域狀態污染）

### H4-SEMANTIC: image.js - mergeImagesToPDF API 語意不清
- **檔案**: `packages/converters/src/image.js`
- **函式**: `mergeImagesToPDF()`
- **問題**: 
  1. 回傳 `createResult(1, 0, errors)` 語意混淆
  2. `ok=1, fail=0` 表示成功，但 `errors=[...]` 包含圖片錯誤
  3. 呼叫端看到「成功但有錯誤」會困惑
  4. 圖片層級的錯誤應該與 PDF 層級的錯誤分開
- **影響**: API 使用者可能誤判轉換結果
- **嚴重性**: High
- **建議**: 
  - 方案 1: errors 只包含 PDF 錯誤，新增 `warnings` 欄位存放圖片錯誤
  - 方案 2: 回傳格式改為 `{ pdfResult: {ok, fail}, imageResults: [...] }`
- **負責人**: /fix
- **狀態**: 新發現問題（H4 修復引入語意問題）

### ✅ H7-TEST-INVALID: 測試沒有驗證核心修復邏輯 [已修復]
- **檔案**: 
  - `packages/converters/__tests__/image.test.js`
  - `packages/converters/__tests__/video.test.js`
  - `packages/converters/__tests__/document.test.js`
- **問題**: 
  1. **image.test.js**: 只測試「所有圖片失敗」，沒測試「部分成功部分失敗」（H4 核心情境）
  2. **video.test.js**: 只測試空陣列，沒驗證 `fs.default.existsSync` 是否正確執行
  3. **document.test.js**: 測試名稱說「不重複 import」，但內容沒驗證這點
- **影響**: 測試無法確保修復有效，未來重構可能破壞修復
- **嚴重性**: High
- **修復內容**:
  1. 修正測試 1 和 2 的名稱與實作，明確測試「全部失敗」和「錯誤格式」
  2. 改進測試 3，正確驗證「部分成功部分失敗」的核心情境
  3. 新增 PDF 檔案存在性驗證
- **負責人**: /fix
- **狀態**: ✅ 已修復 (2025-01-18)
- **備註**: ⚠️ 但發現新問題 CRITICAL-H7-REOPEN（測試清理不完整）

## 🟡 潛在風險 (Medium Priority)

### ✅ M0-H1: historyManager.js - getAll() 沒有使用 queue [已修復]
- **檔案**: `packages/electron-app/src/historyManager.js`
- **函式**: `getAll()`
- **問題**: 
  1. `getAll()` 直接讀取，不經過 writeQueue
  2. 如果有 `addEntry()` 正在執行，可能讀到舊資料
  3. 與 `addEntry()` 的設計不一致
- **影響**: 並發讀寫時可能讀到不一致的資料
- **嚴重性**: Medium
- **修復內容**: `return getWriteQueue(filePath).then(() => readHistory(filePath))`
- **負責人**: /fix
- **狀態**: ✅ 已修復 (2025-01-18)

### M0-H1-TEST: historyManager.test.js - 測試時序依賴
- **檔案**: `packages/electron-app/__tests__/historyManager.test.js`
- **行數**: 35
- **問題**: 
  1. 使用 `Date.now()` 生成測試檔案名稱
  2. 並發測試可能在同一毫秒內執行，產生相同的檔案路徑
  3. 系統時間回溯（NTP 同步）可能產生重複檔案名
- **影響**: 測試可能隨機失敗（機率很低）
- **嚴重性**: Medium
- **建議**: 使用 `crypto.randomUUID()` 代替 `Date.now()`
- **負責人**: /fix
- **狀態**: 新發現問題

### M0-H7: image.test.js - 硬編碼 PNG buffer
- **檔案**: `packages/converters/__tests__/image.test.js`
- **行數**: 49-60
- **問題**: 
  1. 硬編碼 40 bytes 的 PNG magic numbers
  2. 可維護性差，沒人知道這些數字是什麼
  3. 如果 sharp 或 pdf-lib 更新，可能不接受這個最小 PNG
- **影響**: 測試脆弱，未來可能莫名其妙失敗
- **嚴重性**: Medium
- **建議**: 使用 sharp 動態生成測試圖片
- **負責人**: /fix
- **狀態**: 新發現問題

### M1-RACE: historyManager.js - 多視窗並發寫入風險
- **檔案**: `packages/electron-app/src/historyManager.js`
- **問題**: 多個 Electron 視窗同時開啟時，可能同時寫入 history 檔案
- **影響**: 資料可能被覆蓋或遺失
- **嚴重性**: Medium
- **建議**: 實作檔案鎖定機制或使用佇列
- **負責人**: 待評估
- **狀態**: 與 H1-INCOMPLETE 相關

### M2-VALIDATION: video.js - FFmpeg 路徑驗證時機錯誤
- **檔案**: `packages/converters/src/video.js`
- **函式**: `initFfmpeg()`
- **問題**: 
  1. 只在 `if (ffmpeg && ffmpegPath)` 內驗證路徑
  2. 如果 `ffmpegPath` 是 `null` 或 `undefined`，不會驗證就直接使用
  3. 應該先驗證 `ffmpegPath` 是否有效，再設定
- **影響**: 無效路徑可能導致後續操作失敗
- **嚴重性**: Medium
- **負責人**: /fix
- **狀態**: H5 修復不完整

### M3-CLARITY: clearAll() 錯誤處理不一致
- **檔案**: `packages/electron-app/src/historyManager.js`
- **函式**: `clearAll()`
- **問題**: 
  1. `clearAll()` 直接呼叫 `writeHistory([])`
  2. 如果失敗會拋出例外，但函式簽名是 `Promise<void>`
  3. 與 `addEntry()` 和 `removeEntry()` 的錯誤處理不一致
- **影響**: 呼叫端無法統一處理錯誤
- **嚴重性**: Medium
- **負責人**: /fix
- **狀態**: 新發現問題

### M4: fileArgParser.js - 錯誤處理不夠徹底
- **檔案**: `packages/electron-app/src/fileArgParser.js`
- **函式**: `getFileSize()`, `fileExists()`
- **問題**: 雖然加了 console.warn，但無法區分錯誤類型（不存在 vs 權限錯誤）
- **影響**: 呼叫端無法根據不同錯誤做不同處理
- **嚴重性**: Medium
- **負責人**: /fix
- **狀態**: 部分修復（來自原 H2）

### M5: image.js - HEIC buffer 驗證不夠嚴格
- **檔案**: `packages/converters/src/image.js`
- **函式**: `convertHeicToBuffer()`
- **問題**: 只檢查 byteLength，沒驗證 buffer 內容是否為有效圖片
- **影響**: 可能產生「有大小但損壞」的圖片
- **嚴重性**: Medium
- **負責人**: /fix
- **狀態**: 部分修復（來自原 H3）

### M6: parseFileArguments 邏輯複雜
- **檔案**: `packages/electron-app/src/fileArgParser.js`
- **函式**: `parseFileArguments()`
- **問題**: 
  1. 開發模式與打包模式的邏輯混在一起
  2. 多個 continue 和 break，難以追蹤執行流程
- **影響**: 維護困難，容易引入 bug
- **嚴重性**: Medium
- **建議**: 拆分成兩個獨立函式
- **負責人**: 待評估

### M7: image.js - 延遲載入初始化狀態管理混亂
- **檔案**: `packages/converters/src/image.js`
- **問題**: 
  1. 使用多個全域變數追蹤初始化狀態
  2. `pdfToPngError` 會永久快取錯誤，無法重試
- **影響**: 如果初始化失敗，需要重啟應用程式
- **嚴重性**: Medium
- **建議**: 使用單一狀態管理物件
- **負責人**: 待評估

### M8: document.js - mdToPdfError 永久快取問題
- **檔案**: `packages/converters/src/document.js`
- **問題**: 
  1. `mdToPdfError` 會永久快取錯誤
  2. 如果第一次載入失敗（暫時性問題），之後永遠無法重試
  3. 與 image.js 的 `pdfToPngError` 有相同問題
- **影響**: 暫時性錯誤變成永久性錯誤
- **嚴重性**: Medium
- **負責人**: 待評估

### M9: 所有 converter 模組 - 缺少進度回報
- **檔案**: `packages/converters/src/*.js`
- **問題**: 批量轉換時無法回報進度
- **影響**: 使用者體驗差，不知道轉換是否卡住
- **嚴重性**: Medium
- **建議**: 加入 progress callback
- **負責人**: 待評估

### M10: 測試覆蓋率不足
- **檔案**: `packages/converters/src/*.js`
- **問題**: converters 模組測試覆蓋率低
- **影響**: 無法確保轉換功能正確性
- **嚴重性**: Medium
- **負責人**: 待評估

## 🟢 程式碼品質問題 (Low Priority)

### L1: historyManager.js - 魔術數字
- **檔案**: `packages/electron-app/src/historyManager.js`
- **問題**: `MAX_HISTORY_ENTRIES = 100` 應該可設定
- **嚴重性**: Low
- **建議**: 從設定檔讀取或提供 API 修改
- **負責人**: 待評估

### L2: fileArgParser.js - 重複的副檔名列表
- **檔案**: `packages/electron-app/src/fileArgParser.js`
- **函式**: `getFileType()`
- **問題**: 副檔名列表與 SUPPORTED_EXTENSIONS 重複定義
- **嚴重性**: Low
- **建議**: 重構為單一來源
- **負責人**: 待評估

### L3: 所有 converter 模組 - console.log 應該使用 logger
- **檔案**: `packages/converters/src/*.js`
- **問題**: 直接使用 console.log/error
- **嚴重性**: Low
- **建議**: 使用統一的 logger 模組
- **負責人**: 待評估

### L4: image.js - BMP 格式處理不正確
- **檔案**: `packages/converters/src/image.js`
- **函式**: `convertWithSharp()`
- **問題**: BMP 格式轉換為 PNG 但副檔名是 .bmp
- **嚴重性**: Low
- **建議**: 使用 sharp 的 raw() 或明確說明限制
- **負責人**: /fix

### L5: 缺少 JSDoc 型別註解
- **檔案**: `packages/converters/src/*.js`
- **問題**: 大部分函式缺少完整的 JSDoc
- **嚴重性**: Low
- **建議**: 補充型別註解和範例
- **負責人**: 待評估

### L6: image.js - convertWithSharp 缺少格式驗證
- **檔案**: `packages/converters/src/image.js`
- **函式**: `convertWithSharp()`
- **問題**: default case 沒有驗證格式是否支援
- **影響**: 可能產生非預期的輸出格式
- **嚴重性**: Low
- **負責人**: /fix

### L7: historyManager.test.js - 測試隔離不完整
- **檔案**: `packages/electron-app/__tests__/historyManager.test.js`
- **問題**: 使用 `Date.now()` 可能在並發測試時衝突
- **嚴重性**: Low
- **建議**: 使用 `crypto.randomUUID()` 或測試框架的 temp file API
- **負責人**: 待評估

### L8: fileArgParser.test.js - 缺少邊界測試
- **檔案**: `packages/electron-app/__tests__/fileArgParser.test.js`
- **問題**: 
  1. 沒有測試超長路徑
  2. 沒有測試特殊字元路徑
  3. 沒有測試符號連結
- **嚴重性**: Low
- **負責人**: 待評估

### L9: image.js - HEIC 轉換沒有 timeout
- **檔案**: `packages/converters/src/image.js`
- **函式**: `convertHeicToBuffer()`
- **問題**: 如果 HEIC 檔案損壞或超大，可能永久卡住
- **嚴重性**: Low
- **建議**: 加入 timeout 機制
- **負責人**: 待評估

## 📊 架構問題

### A1: electron-app package.json 版本不一致
- **檔案**: `packages/electron-app/package.json`
- **問題**: 版本是 1.2.3，但其他 packages 都是 1.2.2
- **嚴重性**: Medium
- **建議**: 統一版本號或說明版本策略
- **負責人**: 待評估

### A2: utils.js - checkDependency 未被使用
- **檔案**: `packages/converters/src/utils.js`
- **問題**: 
  1. `checkDependency()` 函式定義但從未被使用
  2. 各模組都自己實作延遲載入邏輯，沒有使用這個共用函式
  3. 造成程式碼重複和不一致
- **嚴重性**: Low
- **建議**: 移除未使用的函式或重構各模組使用它
- **負責人**: 待評估

### A3: utils.js - fileExists 同步/非同步不一致
- **檔案**: `packages/converters/src/utils.js`
- **問題**: 
  1. `fileExists()` 是 async 函式
  2. `getUniqueFilename()` 使用同步的 `fs.existsSync()`
  3. 同一個檔案內對檔案存在性檢查的處理方式不一致
- **嚴重性**: Low
- **建議**: 統一使用同步或非同步方式
- **負責人**: 待評估

---

## 📈 統計

### 本次審查發現（H1-H7 修復檢查）
- ✅ **H1 和 H7 Critical 問題已完全修復**：
  - ✅ CRITICAL-H1-REOPEN: writeQueue 全域狀態污染（已修復）
  - ✅ CRITICAL-H7-REOPEN: 測試清理不完整（已修復）
  - ✅ M0-H1: getAll() 現在使用 queue（已修復）
- 🟡 剩餘 2 個 Medium 問題：
  - M0-H1-TEST: 測試時序依賴（建議使用 randomUUID）
  - M0-H7: 硬編碼 PNG buffer（建議使用 sharp 生成）

### 總體統計
- 🔴 重大問題: 1 (H4-SEMANTIC 待修復，H1 和 H7 Critical 已修復)
- 🟡 潛在風險: 12 (M0-H1 已修復，剩餘 12 個)
- 🟢 程式碼品質: 9
- 📊 架構問題: 3
- **總計: 25 項 (1 高優先級, 12 中優先級, 12 低優先級)**

---

## ⚠️ 重要提醒

1. **H1-H7 的修復不完整**：雖然解決了部分問題，但引入了新的問題或遺漏了核心邏輯
2. **測試品質不足**：新增的測試沒有真正驗證修復內容
3. **建議立即處理**: H1-INCOMPLETE, H4-SEMANTIC, H7-TEST-INVALID
4. **此檔案不可推送至遠程 repo**

---

## 下一步建議

1. **短期**: 修復 H4-SEMANTIC（API 設計決策）
2. **中期**: 處理 M2-M3（驗證邏輯和錯誤處理一致性）
3. **長期**: 逐步改進其他中低優先級問題

---

## 修復記錄

### 2025-01-18 (第三次修復 - Critical 問題)
- ✅ **CRITICAL-H1-REOPEN**: 修復 writeQueue 全域狀態污染
  - 將 `let writeQueue` 改為 `const writeQueues = new Map()`
  - 每個 filePath 有獨立的 queue，確保測試隔離
  - 新增 getWriteQueue/setWriteQueue 輔助函式
  - 所有測試通過，測試隔離問題解決
- ✅ **CRITICAL-H7-REOPEN**: 修復測試清理不完整
  - 使用 `fs.promises.rm({ recursive: true, force: true })`
  - 一次刪除整個目錄，避免清理順序問題
  - 測試清理更可靠，不會污染測試環境
- ✅ **M0-H1**: 修復 getAll() 不使用 queue
  - getAll() 現在等待 writeQueue 完成後再讀取
  - 確保讀取到最新資料

### 2025-01-18 (第二次審查)
- ❌ **H1 修復不完整**: 發現 CRITICAL-H1-REOPEN（全域狀態污染）
  - 註解補充了，但 writeQueue 全域變數會導致測試隔離失敗
  - 在 CI 環境或並發執行時會隨機失敗
- ❌ **H7 修復不完整**: 發現 CRITICAL-H7-REOPEN（測試清理不完整）
  - 測試邏輯改了，但清理邏輯有缺陷
  - `catch {}` 吞掉錯誤，清理順序錯誤
- 🟡 發現 3 個新的 Medium 問題

### 2025-01-18 (第一次修復)
- ✅ **H7-TEST-INVALID**: 修正 image.test.js 測試邏輯
  - 修正測試名稱與實作不符的問題
  - 正確驗證「部分成功部分失敗」的核心情境
  - 新增 PDF 檔案存在性驗證
- ✅ **H1-INCOMPLETE**: 補充並發安全設計註解和測試
  - 在 addEntry() 和 removeEntry() 補充詳細註解
  - 新增驗證回傳值的並發測試
  - 新增混合操作（add + remove）並發測試
