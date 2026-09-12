# changelog — split-flap-flight-board

> 只記「發生過什麼」。**規則一律不寫在這裡**，規則在 [`CLAUDE.md`](CLAUDE.md)。
> `刻意例外` 的宣告與撤銷依 `OpDev/standards/DEPLOYMENT.md` 第七節記在本檔。

## 2026-09-12｜OpDev R-005／R-006 落地（文件變更，無程式碼變更）

- **R-006**：`CLAUDE.md` 第 2 節節名改為標準逐字 `永久強制規則（最高優先·不可省略·不受上下文壓縮影響）`（`OpDev/standards/CLAUDE_MD.md` 第二節）；原節名括號內的「紅線與絕對禁令」語意移入節內文首句。
- **R-005**：`刻意例外` 改用日期式識別碼（`OpDev/standards/DEPLOYMENT.md` 第七節）。`## 刻意例外｜純顯示前端…` → `## 刻意例外` ＋ `### 刻意例外 2026-09-10-A：純顯示前端，豁免跨專案治理骨架`；`### 0. 單人專案的簡化授權` → `### 刻意例外 2026-09-11-A：啟用「單人專案的簡化授權」`。
- 一併收掉本檔第三套裸數字編號：`### 1. 理由`／`### 2. 失效條件`／`### 3. 涵蓋範圍` 降為 `#### 理由`／`#### 失效條件`／`#### 涵蓋範圍`。內容未改。
- 引用同步：`CLAUDE.md` 待辦節、`DEPLOYMENT.md`（2 處）、`ROLLBACK.md`（1 處）的「`## 刻意例外` 第 3 節豁免第 N 項」改為「`刻意例外 2026-09-10-A` 涵蓋範圍豁免第 N 項」。本檔歷史條目不回溯重寫。
- **R-007 不適用**：本專案無 `docs/BACKLOG.md`，且 `刻意例外 2026-09-10-A` 涵蓋範圍豁免第 1 項明文宣告不建該檔。

- **單次豁免（使用者 2026-09-12 授權）**：本批為純文件變更（`public/` 未動），經使用者裁示略過「merge 進 `main` 前必須已在 preview 部署並驗證」一條。**條文不刪除、不放寬**，僅此一批有效；下一批回復必經 preview。

## 2026-09-11｜文件精簡與口令對齊（文件變更，無程式碼變更）

- `CLAUDE.md` 675 → 約 210 行：刪除沿革／已作廢宣告／已失效指令段／已完成的改善計畫與優先順序表／重複的「重要規則」節，章節依 `OpDev/standards/CLAUDE_MD.md` 第二節重排（口令節改為第一節）。
- 口令表補齊為 14 支：新增 `核准推送：分支`、`核准循環自治：核准部署：preview`／`：核准推送：merge`／`：核准部署：正式`；急停用字由自訂的 `撤銷授權` 改為正典的 `禁止執行開發`。
- 新增「煞車條件」小節；`刻意例外` 節啟用「單人專案的簡化授權」（標準第四節）。
- **撤銷**豁免「preview 前置降為可選」——與簡化授權「進 `main` 前必須實際打過端點」牴觸，preview 恢復為必經。
- **撤銷**豁免「`changelog.md` 不建」——本檔即為該項撤銷的結果，開發日誌自 `CLAUDE.md` 移入。
- 刪除 `check-env.md`（一次性清單，2026-09-02 產生）：仍成立的三項未處理發現移入 `CLAUDE.md` 待辦 B5–B7，`public/` 是部署根目錄的警告移入 `DEPLOYMENT.md` 第 2 節，其餘（已解決、已重複、不適用於本專案的 Docker/Cloud Run 段）刪除。

- **單次豁免（使用者 2026-09-11 授權）**：本批為純文件與設定變更（9 項，`public/` 未動），經使用者裁示略過「merge 進 `main` 前必須已在 preview 部署並驗證」一條。**條文不刪除、不放寬**，僅此一批有效；下一批回復必經 preview。

## 2026-09-10｜刻意例外宣告 ＋ 口令與工具對齊（文件變更，無程式碼變更）

- 宣告 `## 刻意例外`（純顯示前端），四條件齊備；2026-09-02 的「本專案不採用部署口令制度」由使用者裁示改為「豁免治理骨架但保留口令」。
- 新建 `DEPLOYMENT.md`（此前口令從未接上任何具名部署文件）。
- 更正過期事實（實測）：計費**已關閉**（非 Blaze）、Firestore `(default)` **存在**（`DEPLOYMENT.md` 原寫「無」）、0 Cloud Function、線上 Firestore rules 仍生效（`allow read, write: if false`）。
- `push-deploy.sh` 列入紅線；更正「push → GitHub Actions 自動部署」的錯誤敘述（repo 內無 `.github/`）。

## 2026-04-30｜廣播訊息列 ＋ 安全稽核 ＋ 舊檔清理

- 新增 `#promo-bar` 滾動廣播列與 `public/data/promo.json`（16 則，手動維護）；移除語言指示器。
- **安全**：`.claude/settings.local.json` 的 `permissions.allow` 撿到三組明碼憑證（Gemini／TDX ×2），已刪除並加入 `.gitignore`；金鑰輪換仍未執行（`CLAUDE.md` 待辦 B4）。
- 架構改為純靜態 JSON：移除 `functions/`、`scripts/`、`firestore.rules`、舊 TDX 快照與 `.github/workflows/` 的抓取步驟。
- 新增 `push-deploy.sh`（已 gitignore）——**現已列為紅線，不得作為部署路徑**。

## 2026-03-26｜字型與顯示優化

- `@font-face` 本機載入 NotoSansTC（無 CDN 依賴）；移除 `.flap { perspective }` 修掉翻牌白條紋；標題列改為整塊 `.header-cell`（欄名不再截斷）；字寬改以中文為基準（CJK `scaleX(1.0)`、拉丁 `scaleX(0.9)`）。

## 2026-03-10｜Gemini 機場代號解析 ＋ Cloud Function 部署

- 當時架構：Cloud Function `api` ＋ 三層機場名稱解析（靜態表 → Firestore `airportNames` → Gemini）；`?forcereflash` 強制更新。
- **此架構已於 2026-04-30 全部移除**，僅餘 Firestore 的 5 筆快取（`CLAUDE.md` 待辦 B2）。
