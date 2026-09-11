# CLAUDE.md — CAL Split-Flap Flight Board 開發規範

## 🔴 部署口令與上線流程（全站統一標準，最高優先）

> 與本檔其他段落衝突時，**以本節為準**。
> `## 刻意例外` 節就其**明列的涵蓋範圍**優先於本節，**但明文不涵蓋本節的口令表**——
> 表上的口令全部有效，抽取工具（`enter-project.sh`、`team-verify`）抽到的算數。

| | |
|---|---|
| 專案分級 | T3 |
| 部署路徑 | B 單軌 |
| 雲端專案 ID | `split-flap-flight-board` |
| 對外網址 | https://split-flap-flight-board.web.app |
| 部署文件 | [`DEPLOYMENT.md`](DEPLOYMENT.md) |
| 回滾文件 | [`ROLLBACK.md`](ROLLBACK.md) |
| 變更紀錄 | [`changelog.md`](changelog.md) |

本專案為**單軌（只有一個對外環境）**。

### 口令表

**專案內唯一正本。用字逐字取自 `OpDev/standards/DEPLOYMENT.md` 第二節正典表，不得改字。**

| 語意角色 | 口令 |
|---|---|
| 預覽（部署但不接流量） | `核准部署：preview` |
| 中介（部署到 staging） | — **本專案單軌，無此環境** |
| 上線 | `核准部署：正式` |
| 還原（從穩定點回復） | `核准部署：還原` |
| 開 PR | `核准推送：PR` |
| 合併進 `main` | `核准推送：merge` |
| 推送非 `main` 分支到遠端 | `核准推送：分支` |
| 撤銷／急停（收回已給的授權） | `禁止執行開發` |

開發類四個，**不授權任何部署**：`核准開發`／`核准修正`／`核准改善`／`核准執行`

循環自治族（依序做完每一步並驗證，中間不逐步請示，跑到終點口令的狀態為止）：

| 終點 | 口令 |
|---|---|
| 預覽 | `核准循環自治：核准部署：preview` |
| 中介 | — **本專案單軌，無此環境** |
| 合併進 `main` | `核准循環自治：核准推送：merge` |
| 上線（全鏈） | `核准循環自治：核准部署：正式` |

`可以`、`好`、`繼續`、`OK`、`試試看` 一律**無效**，不觸發任何 build 或 deploy。

收到部署口令後，**第一步必須讀 [`DEPLOYMENT.md`](DEPLOYMENT.md)**——口令與實際指令的對應在它第 1 節。逐步執行，不得憑記憶。

### 上線鐵則

```
在 preview 驗證通過
        ↓
核准推送：PR  →  核准推送：merge   （--no-ff 進 main）
        ↓
從 main 上線（核准部署：正式）
```

三條缺一不可：

1. **上線一律從 `main` 出。** 不得從 feature 分支或 worktree 直接上線。
2. **merge 到 `main` 之前，必須已在 preview 部署並驗證且無誤。**
3. **驗證是實際打端點**，不是看部署指令回傳成功。本站無 `/health`，以「根路徑回 200 ＋ 瀏覽器實機看板走一輪」代替，且**結果要貼進 PR**。

### 煞車條件

**適用於所有循環自治口令與簡化授權。任一條成立 → 立刻停下請示，不得為了讓鏈走完而降低標準。**

1. **git 衝突**（rebase／merge 出現 conflict）。
2. **驗證不綠。** 判準是「**有沒有綠**」，不是「有沒有紅」——指令沒執行、環境沒起來、端點沒回 200，三者看起來都不紅。
3. **要進 `main` 但缺 preview 部署與端點驗證。**
4. **超出當下授權範圍**（例如終點是 preview 卻要上線）。
5. **碰到下一節任何一條紅線或絕對禁令。**
6. **驗證結果留不下來**（沒有可貼進 PR 的實際輸出）。

`禁止執行開發` 一出現，立即停止當前所有循環與部署動作。

---

## 🔴 永久強制規則（紅線與絕對禁令，不受上下文壓縮影響）

> **紅線＝要口令才能做；絕對禁令＝給了口令也不做。**

- **【絕對禁令】所有 `firebase` / `gcloud` 指令一律顯式帶 `--project split-flap-flight-board`。** 不帶會落到 CLI 的預設專案，而那可能是別人的專案。
- **【絕對禁令】不讀取、不列印、不提交 `.env*`、credential、私鑰、API 金鑰。** 憑證只進 Secret Manager，不進 repo、不進 `.claude/settings*.json`。
- **【絕對禁令】不得 force push、不得改寫 `main` 的 git 歷史、不得 `git push origin main` 繞過 PR。** 本 repo 無 tag、無 CI、無 build 產物存檔——**git 歷史是唯一的還原能力**。
- **【紅線】沒有部署口令不得 build 或 deploy。**
- **【紅線】沒有推送口令不得 `git add` / `commit` / `push` / 開 PR / merge。**
- **【紅線】不得使用 `push-deploy.sh` 作為部署路徑。** 它把 `git add -A` + `commit` + `push` + `deploy` 綁成一步，preview 沒有存在空間，且不帶 `--project`。理由見 `DEPLOYMENT.md` 第 5 節。
- **【紅線】上線一律從 `main` 出，且 merge 進 `main` 前必須已在 preview 驗證。**

---

## 核心原則

- **這是一台展場看板，不是一個系統。** 沒有使用者、沒有帳號、沒有後端、沒有狀態機。任何提案若引入其中之一，先問「展場真的需要嗎」。
- **內容與程式分離。** 會變的是 `public/data/*.json`（班次與廣播文字），不是 `index.html`。改內容不要改程式。
- **零外部依賴是刻意的。** 無 bundler、無框架、無 CDN、無外部網域請求。新增依賴要有理由。
- **最小變更、完成即停。** 先計畫後執行。

---

## 專案背景

2026 COMPUTEX 展示用途。單一終端靜態展示，無多用戶需求。

- 技術棧：純 HTML/CSS/JS（無 bundler）+ Firebase Hosting。**無 CI**——repo 內沒有 `.github/`，push 不觸發任何自動部署
- 架構：一個 `public/index.html`（單檔，含全部 CSS/JS）＋ `public/data/` 三個靜態 JSON ＋ 本機字型 `NotoSansTC-VariableFont_wght.ttf`
- 資料：`flights-zh.json`、`flights-en.json`、`promo.json`，**人工維護**，不串接任何 API
- 雲端殘留：Firestore `(default)` 與 collection `airportNames`（2026-03-10 遺留，本站不讀寫）；計費**已關閉**；0 Cloud Function
- 部署：見 [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## 待辦

> 本節承擔 `docs/BACKLOG.md` 的角色（見 `## 刻意例外` 第 3 節豁免第 1 項）。

| # | 項目 | 級別 | 處置 |
|---|---|---|---|
| B1 | `Browser key (auto created by Firebase)` 未設來源（referrer）限制（`browserKeyRestrictions: {}`）。該 key 目前未被本站使用、計費已關閉 | LOW | 一次性：Console → API 與服務 → 憑證 → 設 HTTP referrer 限制為 `split-flap-flight-board.web.app/*` |
| B2 | Firestore `(default)` 與 collection `airportNames`（5 筆）為 2026-03-10 遺留，本站不使用 | LOW | 衛生項。刪除後 `刻意例外` 失效條件 E4 的基準要同步改為「不得有任何 collection」 |
| B3 | repo 無任何 git tag，`ROLLBACK.md` 第 1 節的還原點指令會回空 | LOW | 已豁免建 tag，改以 Hosting 版本紀錄為還原點 |
| B4 | Secret Manager 內的 TDX／Gemini 金鑰自 2026-04-30 起已不被前端使用，**尚未輪換**；曾於 `.claude/settings.local.json` 以明碼出現過 | LOW | 至各平台輪換或刪除。計費已關閉，Secret Manager 目前回 `BILLING_DISABLED` |
| B5 | 預設 compute 服務帳戶持有 `roles/editor` | LOW | 需雲端變更，要使用者核准 |
| B6 | `github-action-*` 服務帳戶仍持有 `cloudfunctions.developer` + `firebasehosting.admin`（金鑰已於 2026-09-02 刪除，workflows 已不存在） | LOW | 確認是否還需要此帳戶，不需要就刪 |
| B7 | gitleaks 在 `public/index.html` 有 1 筆命中，高機率誤報 | LOW | 確認後列入 `.gitleaksignore` |

---

## 刻意例外｜純顯示前端，豁免跨專案治理骨架（2026-09-10 宣告，2026-09-11 修訂）

> 依 `OpDev/standards/DEPLOYMENT.md` 第七節四條件撰寫。**全專案只有這一節，沒有第二處例外宣告。**

### 0. 單人專案的簡化授權（2026-09-11 啟用）

本專案啟用「單人專案的簡化授權」（`OpDev/standards/DEPLOYMENT.md` 第四節）。
煞車條件見本檔第 1 節「煞車條件」。
失效條件：出現第二位有 merge 權限的維護者。

### 1. 理由

**使用者裁示（2026-09-10，逐字）：**

> 「Split-flap 是很單純小的前端頁面，沒有任何後端，純顯示。因此列為所有規則的例外。」

**實跑佐證（2026-09-10）：** 純前端單檔 629 行、0 Cloud Function、0 個外部網域、0 個表單／`localStorage`、`billingEnabled=False`、無 `.github/`、Firestore 僅 1 個機器快取 collection。

**照標準做的成本是持續性的**（第七節：一次性成本走 BACKLOG，不構成例外理由）：骨架文件要求與程式碼保持一致，等於**每改一行 CSS 或一則廣播文案，都要回頭確認多份文件還對得上**；而分母是一個無輸入、無後端、無帳單的展示頁。**不寫這一節的代價不是「省事」，是稽核分不出「刻意不做」與「忘了做」。**

### 2. 失效條件

**逐條在稽核當下可判真假。任一條為真，本節整節失效**，回復完整標準，並在 `changelog.md` 記一筆。

| # | 失效條件（**為真即失效**） | 2026-09-10 實跑輸出 |
|---|---|---|
| E1 | repo 內出現伺服器端程式碼目錄（`functions`／`server`／`api`／`backend`） | 無輸出（四者皆不存在） |
| E2 | 雲端專案有任何 Cloud Function／Cloud Run 服務 | `No functions found in project split-flap-flight-board.` |
| E3 | 計費被啟用 | `False` |
| E4 | Firestore 出現 `airportNames` 以外的 collection | `{"collectionIds": ["airportNames"]}` |
| E5 | 前端開始收使用者輸入或存瀏覽器狀態 | `0` |
| E6 | 前端出現同源 `data/*.json` 以外的網路請求 | 無輸出 |
| E7 | 出現第二位有 `main` merge 權限的維護者 | `hsnuhow`（僅一位） |

**複驗腳本**（整段複製貼上即可跑；輸出與上表右欄逐項比對）：

```bash
cd ~/MyDeveloper/split-flap-flight-board
echo "E1:"; ls -d functions server api backend 2>/dev/null
echo "E2:"; firebase functions:list --project split-flap-flight-board
echo "E3:"; gcloud beta billing projects describe split-flap-flight-board \
             --format='value(billingEnabled)'
echo "E4:"; curl -sS -X POST \
  "https://firestore.googleapis.com/v1/projects/split-flap-flight-board/databases/(default)/documents:listCollectionIds" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" -d '{"pageSize":20}'
echo "E5:"; grep -cE '<form|<input|localStorage|sessionStorage|document\.cookie' public/index.html
echo "E6:"; grep -oE 'https?://[^"'"'"' ]+' public/index.html | sort -u
echo "E7:"; gh api repos/hsnuhow/split-flap-flight-board/collaborators --jq '.[].login'
```

> ⚠️ E5／E6 的 ERE 樣式要用**單引號**包住。改成雙引號再逃脫管線符號會讓 `grep -E` 把 `\|` 當字面字元，於是恆回 0，把「已失效」報成「仍成立」。

> **E3 是最有力的一條**：帳單關閉時，這個專案在雲端上不可能造成金錢損失。一旦有人開啟計費，本節立刻失效。

### 3. 涵蓋範圍

**🟢 豁免（逐項；沒列到的一律不在例外範圍內，舉證責任在本專案）：**

1. **`docs/BACKLOG.md` 不建**——角色被本檔「待辦」節吸收。
2. **`architecture.md` 不建**——架構是「一個 `public/index.html` ＋ 三個靜態 JSON ＋ Firebase Hosting」，已寫在「專案背景」節；獨立成檔只會多一份會漂移的副本。
3. **`docs/data-model.md` 不建**——沒有資料庫；資料就是 `public/data/` 的三個 JSON，schema 由檔案自身表達。
4. **`product_guideline.md` 不建**——沒有業務規則可寫：無使用者、無角色、無權限、無狀態機。產品行為就是「輪播班次表」。
5. **`docs/INDEX.md` 不建**——根目錄 markdown 共 6 份，索引的維護成本高於它省下的尋找成本。
6. **`devops-audit` 不按月跑**——改為「`public/` 或部署設定有實質變更後才跑」。
7. **`FRAMEWORK.md` 第三節 T3 的兩項計費基準線不建立**（「所屬計費帳戶有預算警示」「貴 SKU 支出天花板」）——`billingEnabled=False`，沒有計費帳戶可以掛。**E3 觸發時本項一併失效。**
8. **`ROLLBACK.md` 的 git tag 還原點不建立**——Firebase Hosting 的版本紀錄本身就是還原點，tag 對一個無 build 步驟的靜態站不增加還原能力。

**🔴 不豁免（下限）——即使使用者說「所有規則的例外」，以下仍然成立：**

> 判準是**失效方向對不對稱**：下列各項省不到持續成本（不需要每月維護），卻拿掉唯一的兜底。

1. **本檔「🔴 永久強制規則」節整節**，含全部絕對禁令。
2. **本檔第 1 節的口令表整表與煞車條件。** 口令沒有持續性成本，依第七節本來就不夠格當例外標的；且它是使用者自己的授權開關。
3. **上線一律從 `main` 出、必經 PR、進 `main` 前 preview 端點驗證、部署後實際打端點。** 簡化授權免除的是「誰來審」，不是「留不留軌跡」。
4. **不把機密寫進 repo。** 純靜態頁一樣會誤放 API key（2026-04-30 實例）。這條的風險與專案大小無關。
5. **`FRAMEWORK.md` 第三節「不分級別一律必須」的安全項。** 2026-09-10 實測：Firestore rules 無公開寫入 ✅（線上 ruleset `allow read, write: if false`）、零可下載私鑰 ✅、專屬最小權限執行帳戶（無執行中運算資源，不適用）、**API key 雙維度限制 ⚠️ 未過**（來源限制未設）。未過項是一次性成本，依第七節走 BACKLOG → 本檔待辦 B1；**不得因此宣告為已通過**。
6. **`settings-baseline.json` 不得往寬鬆改。**
7. **`OpDev/standards/DEPLOYMENT.md` 第四節與第七節自己**——不可被自己豁免。
