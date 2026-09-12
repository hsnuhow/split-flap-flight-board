# changelog — split-flap-flight-board

> 只記「發生過什麼」。**規則一律不寫在這裡**，規則在 [`CLAUDE.md`](CLAUDE.md)。
> `刻意例外` 的宣告與撤銷依 `OpDev/standards/DEPLOYMENT.md` 第七節記在本檔。

## 2026-09-12｜OpDev R-008／R-009 落地（文件變更，無程式碼變更）

### R-008：建 `docs/BACKLOG.md`，撤銷豁免

- **撤銷**：`刻意例外 2026-09-10-A` 涵蓋範圍豁免**第 1 項「`docs/BACKLOG.md` 不建——角色被本檔『待辦』節吸收」**。依 `OpDev/standards/DEPLOYMENT.md` 第七節，宣告與撤銷都記在本檔。
  使用者裁示（2026-09-12，逐字）：「純前端也列 backlog 好了，畢竟是修改待辦。」
  理由：BACKLOG 記的是「要改什麼」，與專案是前端或後端無關。**只撤銷第 1 項，本則例外其餘部分不動。**
- **編號不留洞**：涵蓋範圍舊第 2–8 項重編為 **1–7**。外部引用同步：`DEPLOYMENT.md` 第 5 節與 `ROLLBACK.md` 第 1 節的「涵蓋範圍豁免第 8 項」改為「第 7 項」。
- **`CLAUDE.md` 的 `## 待辦` 節整節刪除**（含開頭那句「本節承擔 `docs/BACKLOG.md` 的角色」——它存在的唯一理由就是被撤銷的第 1 項）。B1–B7 依 `OpDev/standards/DOCUMENTATION.md` 第十節改寫為 `### [未處理] <一句話>`，表格／自編號／「級別」欄不再使用。
- **B1 不只是搬家**：`Browser key (auto created by Firebase)` 未設來源限制，是 `FRAMEWORK.md` 第三節「不分級別一律必須」的安全項未過。依 `AUDIT.md` 第七節改以**第五種處置（已指派，等待外部人工行動）**追蹤，條目備齊指派對象、為什麼 AI 不能代做、一條可執行的驗收指令（2026-09-12 實跑結束碼 0，第二欄空白 ＝ 尚未設定，紅）。`刻意例外` 不豁免第 5 項的引用一併改指該條目，未斷鏈。
- **B2 的 E4 引用仍指得到**：`刻意例外 2026-09-10-A` 失效條件 E4 未動，BACKLOG 條目改為跨檔具名引用。
- **B3 關閉**（`OpDev/standards/DOCUMENTATION.md` 第十節三步收尾）。原條目標題逐字：「repo 無任何 git tag，`ROLLBACK.md` 第 1 節的還原點指令會回空」。結果：**判定不做**——處置已是「宣告例外」（涵蓋範圍豁免現第 7 項），指標留在 `ROLLBACK.md` 第 1 節註解，故不帶進 `docs/BACKLOG.md`。`git tag | wc -l` 仍為 `0`。
- **`docs/INDEX.md` 那一項的失效基準更新**：「根目錄 markdown 共 6 份」→「全 repo markdown 共 7 份（根目錄 6 份 ＋ `docs/BACKLOG.md`）」。`docs/INDEX.md` **仍不建**，只是理由的數字對齊現況。
- 其餘引用同步：`DEPLOYMENT.md` 第 1 節與 `ROLLBACK.md` 第 3、6 節的「`CLAUDE.md` 待辦 B2／待辦節」改指 `docs/BACKLOG.md`。**本檔歷史條目不回溯重寫**（含 2026-09-12 那筆「R-007 不適用：本專案無 `docs/BACKLOG.md`」——它在當時為真）。

### R-009：`--project` 紅線補齊四要素的乙與丙

- 依 `OpDev/standards/CLAUDE_MD.md` 第二節〈只操作本專案的雲端資源：四個必含要素〉。本專案單軌，**丁不適用**；甲原本已具備。
- **乙（要件齊備）**：補「不得依賴會話狀態」＋**逐一點名機制**——`gcloud config set project`、`firebase use`、`.firebaserc` 的 `default`、`CLOUDSDK_CORE_PROJECT`。
- **丙（逐字「不會報錯」）**：寫本專案自己實測到的後果，不抄別的專案。2026-09-12 實跑 `gcloud config get-value project` → `ichipickle-dev`（另一個專案），`gcloud config configurations list` 顯示同一個帳號對它有權限，所以沒帶 `--project` 的 `gcloud` 指令**在錯的目標上一樣會成功執行，不會報錯**。`firebase` 這端另記：本 repo `.firebaserc` `default` 正好是 `split-flap-flight-board`，漏帶當下無害，但那是設定檔兜底而非指令寫對。

### 本批的授權與豁免

- 授權：`核准修正` ＋ `核准推送：分支` ＋ `核准推送：PR`（使用者 2026-09-12）。**做到開 PR 為止，未 merge、未部署。**
- **單次豁免（使用者 2026-09-12 授權）**：本批為純文件變更（`public/` 未動），經使用者裁示略過「merge 進 `main` 前必須已在 preview 部署並驗證」一條。**條文不刪除、不放寬**，僅此一批有效；下一批回復必經 preview。

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
