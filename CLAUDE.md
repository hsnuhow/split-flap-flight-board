# CLAUDE.md — CAL Split-Flap Flight Board 開發規範

## ⚠️ 重要規則

**在取得口令「執行開發」之前，禁止修改任何程式碼。**
本文件只作規劃用途，所有改善計畫須經使用者確認後才執行。

---

## 專案背景

2026 COMPUTEX 展示用途。單一終端靜態展示，無多用戶需求。
- 技術棧：純 HTML/CSS/JS（無 bundler）+ Firebase Hosting + GitHub Actions
- 資料來源：台灣交通部 TDX 平台 FIDS API（中華航空 CI，桃園機場 TPE）

---

## 改善計畫

### 功能面

#### F1｜API 憑證安全性（目前憑證直接寫在 index.html 前端）

**問題**：`CONFIG.tdx.clientId` / `clientSecret` 明碼暴露於瀏覽器，任何人可從開發者工具讀取。

**方案（最簡單，無複雜基礎設施）：Firebase Cloud Functions 輕量代理**

- 新增 `functions/index.js`，一個 Firebase Cloud Function：
  - 讀取儲存在 Firebase Functions Secret Manager 的 TDX 憑證（`firebase functions:secrets:set TDX_CLIENT_ID`）
  - 對外暴露 `GET /api/flights?type=arrival|departure` 端點
  - 後端呼叫 TDX API 後回傳 normalized JSON
- `index.html` 前端改呼叫 `/api/flights` 而非直接打 TDX
- 憑證完全留在 Firebase 後端，前端不再有任何 secret

**成本**：Firebase Functions 免費額度（每月 200 萬次呼叫）足夠單一終端使用。

---

#### F2｜AIRPORT_NAMES 重複三份問題

**問題**：`index.html`、`fetch_flights.js`、`convert_export.js` 各自維護一份相同的機場代碼對照表，新增機場需改三個地方。

**方案**：
- 建立 `public/data/airports.json` 作為單一來源
- `fetch_flights.js` 和 `convert_export.js` 以 `require`/`readFileSync` 載入
- `index.html` 改為在啟動時 `fetch('data/airports.json')` 載入
- 此 JSON 本身就是靜態資產，可隨 Firebase Hosting 部署

---

#### F3｜每 30 分鐘自動更新資料

**問題**：目前資料只在 GitHub Actions push 時更新，展示期間資料是靜態的。

**方案（配合 F1 的 Cloud Function）**：
- `index.html` 新增 `setInterval`，每 30 分鐘（`30 * 60 * 1000` ms）呼叫一次 `/api/flights`
- 取得新資料後更新 `flightData`、重新計算頁數、重設 `phaseIdx = 0 / pageIdx = 0`
- 在頁面右上角 `update-label` 顯示最後資料抓取時間
- 翻頁輪播（每 10 秒）維持不變，與資料刷新週期完全獨立

**流程圖**：
```
啟動 → 載入資料 → 開始翻頁輪播（每 10s）
                    ↑
        每 30 分鐘呼叫 /api/flights 更新 flightData
```

---

#### F4｜狀態解析（parseStatus）

使用者評估：目前顯示效果可接受，暫不列為優先改善項目。保持現狀。

---

### 顯示面

#### D1｜標題列與第一資料列之間出現不應有的黃色間隙

**問題**：標題列（header row）翻牌格的 `.bottom` 下緣 border 仍為黃色，與第一資料列之間的 gap 透出黃色光。

**修正**：在 `.row.header-row .flap .bottom` CSS 規則中，將所有 border 顏色覆蓋為 `#111`（目前只改了 `border-bottom-color`，需改為 `border-color: #111`）。同時確認 `.flipper` 在 header row 的 border 也一併處理。

---

#### D2｜字寬 90%，字高增加

**問題**：翻牌格的字體顯示比例不夠接近真實翻牌板，字太寬、太矮。

**修正**：
- 字寬縮減：在 `.flap .top, .flap .bottom, .flap .flipper` 加入 `transform: scaleX(0.9)`
- 字高增加：調整 `font-size`（目前 `1.55vw`），改為更大的值（約 `1.9vw`）
- 可能同步調整行高 `line-height`，讓字在格子中垂直居中顯示

---

#### D3｜翻牌速度慢 100%（即慢一倍）

**問題**：目前翻牌過快，不夠有機械感。

**修正**：
- CSS `@keyframes flip-down` 動畫時間：`0.065s` → `0.13s`
- `triggerFlip` 中 `setInterval tick`：`70ms` → `140ms`
- 每格隨機延遲：`Math.random() * 380` → `Math.random() * 760`

---

#### D4｜中華航空 LOGO 放大

**問題**：目前 Logo 高度 `7.5vh`，在大螢幕展示時偏小。

**修正**：
- `#cal-logo` 高度：`7.5vh` → `10vh`（或依視覺效果調整）
- Logo bar 整體高度 `#logo-bar`：`9vh` → `12vh`，確保不裁切

---

#### D5｜最上方顯示即時日期時間

**需求**：在看板最頂部顯示目前的日期與時間，方便現場觀眾辨識資訊時效性。

**設計**：
- 位置：`#logo-bar` 右側（目前 section-indicator 上方）或另起一個 `#datetime-display`
- 格式：`2026.05.20  WED  14:32:55`（含星期）
- 字體：`Courier New`，顏色 `#ffcc00`（與主題一致），字級約 `0.9vw`
- 實作：`setInterval` 每秒更新一次 `textContent`，使用 `Intl.DateTimeFormat` 格式化

---

---

## 部署一次性設定（F1 Cloud Function）

在第一次部署 Cloud Function 之前，需執行以下命令：

```bash
# 1. 設定 TDX 憑證至 Firebase Secret Manager（互動式輸入，不會暴露）
firebase functions:secrets:set TDX_CLIENT_ID
firebase functions:secrets:set TDX_CLIENT_SECRET

# 2. 取得 GitHub Actions 用的 Firebase CI token
firebase login:ci
# 將輸出的 token 加入 GitHub 專案 Secrets，名稱為 FIREBASE_TOKEN

# 3. 安裝 functions 依賴
npm install --prefix functions

# 4. 完整部署（含 functions）
firebase deploy --only hosting,functions
```

---

## 優先順序建議

| 優先 | 項目 | 難度 | 狀態 |
|------|------|------|------|
| 高   | D1 黃色間隙 | 低（一行 CSS） | ✅ 已完成（前次） |
| 高   | D5 即時時間顯示 | 低（幾行 JS） | ✅ 已完成（前次） |
| 高   | D3 翻牌速度 | 低（改常數） | ✅ 已完成（前次） |
| 中   | D4 Logo 放大 | 低（改 CSS） | ✅ 已完成（前次） |
| 中   | D2 字寬字高 | 低（改 CSS） | ✅ 已完成（前次） |
| 中   | F3 30 分鐘自動更新 | 中（JS 邏輯） | ✅ 已完成（前次） |
| 低   | F2 機場表單一來源 | 中（重構） | ✅ 已完成（前次） |
| 低   | F1 憑證安全（Cloud Function） | 中高（新增 Function） | ✅ 已完成（前次） |

---

## 開發日誌

### 2026-03-10｜Gemini 機場代號解析 + 部署完成

#### 本次開發項目

**G1｜Gemini API 機場代號動態解析**

- **問題**：TDX API 回傳的 ICAO 機場代號（如 ONT、PRG、BWN 等）不在 `airports.json` 靜態表中，前端直接顯示原始英文代號。
- **解法**：Cloud Function 新增三層機場名稱解析架構：
  1. `airports.json`（靜態，同步，最快）
  2. Firestore `airportNames` collection（動態快取，Gemini 解析後永久存入）
  3. Gemini API `gemini-2.5-flash-lite`（未知代號首次遇到時呼叫，結果存入 Firestore）
- **安全性**：`GEMINI_API_KEY` 存於 Firebase Secret Manager，前端完全無法存取
- **效能**：同一次 API 請求內，每個未知代號只呼叫一次 Gemini（批次去重）

**G2｜Firestore 錯誤快取修正**

- Gemini 首次解析時將部分 TDX 自訂代號誤認（BWN → 台南、PEN → 屏東、ROR → 台東、TAK → 台東、TFU → 台東）
- 修正方式：將正確對照直接寫入 `airports.json`（Layer 1 優先），並清除 Firestore 錯誤快取
- 同時將 Gemini 正確解析的代號（CNX、ONT、PHX、PRG 等）一併收入靜態表

**G3｜`?forcereflash` 強制更新功能**

- 新增 URL 參數 `?forcereflash`：繞過所有快取，立即重新呼叫 TDX API
- 靜默更新（無 overlay），`update-label` 顯示進度
- 呼叫完成後自動以 `history.replaceState` 清除網址參數

#### 修改的檔案

| 檔案 | 變更內容 |
|------|---------|
| `functions/index.js` | 新增 Gemini + Firestore 三層解析；GEMINI_API_KEY secret |
| `functions/package.json` | 新增 `firebase-admin: ^13.0.0` |
| `firebase.json` | 新增 `firestore.rules` 設定 |
| `firestore.rules` | 新增（拒絕所有客戶端存取） |
| `public/data/airports.json` | 新增 9 個機場（含修正 CTU 為成都雙流、新增 TFU 成都天府）|
| `public/index.html` | 新增 `?forcereflash` URL 參數處理邏輯 |
| `scripts/fix_airport_cache.js` | 新增一次性 Firestore 快取修正腳本 |

#### Firebase 環境狀態

- Firebase 方案：已升級至 **Blaze（pay-as-you-go）**
- Secret Manager 已設定：`TDX_CLIENT_ID`、`TDX_CLIENT_SECRET`、`GEMINI_API_KEY`
- Firestore 已建立（asia-east1），rules 已部署（拒絕客戶端存取）
- Cloud Function `api`（asia-east1）：已部署，正常運作
- Artifact Registry 清理政策：已設定（images > 1 天自動刪除）
