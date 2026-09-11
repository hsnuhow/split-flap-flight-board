# DEPLOYMENT — split-flap-flight-board

> **這就是 `CLAUDE.md` 所說的「本專案的部署文件」。** 本檔只做「口令 → 指令」的對應，
> 口令的定義正本在 `CLAUDE.md` 第一節，衝突時以那一節為準。

| | |
|---|---|
| 專案分級 | 見 [`CLAUDE.md`](CLAUDE.md) 的**專案分級宣告**（此處不重述數值） |
| 部署路徑 | **B 單軌**——只有一個對外環境 |
| 雲端專案 ID | `split-flap-flight-board` |
| 對外網址 | https://split-flap-flight-board.web.app |
| 服務 | Firebase Hosting（純靜態）。**無** Cloud Run、**無** Functions |
| Firestore | `(default)` 存在，唯一 collection `airportNames`／5 筆機器快取，線上 rules 為 `allow read, write: if false`。本站不讀寫它（`CLAUDE.md` 待辦 B2）|
| 計費 | **已關閉**（`billingEnabled=False`）。Secret Manager 因此回 `BILLING_DISABLED` |
| CI | **無。** repo 內沒有 `.github/` 目錄，push 不會觸發任何自動部署 |

---

## 1. 口令 → 實際做什麼

| 口令 | 這份文件裡的哪一節 |
|---|---|
| `核准部署：preview` | 第 3 節 |
| `核准部署：正式` | 第 4 節 |
| `核准部署：還原` | [`ROLLBACK.md`](ROLLBACK.md) |
| `核准推送：分支`／`：PR`／`：merge` | 第 4 節前置條件 2 |
| `核准循環自治：<終點口令>` | 依序跑到終點口令那一節為止；煞車條件見 `CLAUDE.md` 第一節 |

**沒有口令就不要跑本文件的任何指令。** `可以`、`好`、`繼續`、`OK` 都不是口令。

---

## 2. 每次部署前

```bash
git -C . status --short          # 確認要送出去的就是你以為的那些檔
git -C . rev-parse --abbrev-ref HEAD
firebase projects:list --project split-flap-flight-board   # 確認打的是對的專案
```

🔴 **所有 `firebase` / `gcloud` 指令一律顯式帶 `--project split-flap-flight-board`。**
不帶會落到 CLI 的預設專案。這條由 `project-scope-guard.py` 在機器層擋，不是靠自律。

🔴 **`public/` 是部署根目錄——放進去的任何非隱藏檔都會被推上線，即使沒有任何程式碼引用它。**
`firebase.json` 的 `hosting.public` 是 `public`，`ignore` 只排除
`firebase.json`、`**/.*`、`node_modules/**`、`scripts/**`、`functions/**`。
且 `firebase deploy` 部署的是**本機檔案，不是 git 內容**——「沒有 commit」不代表「不會上線」。
**不要拿 `public/` 當暫存區**（2026-09-02 曾在此發現一張 1.37 MB、從未被引用也從未進版控的圖）。

---

## 3. `核准部署：preview`——部署但不接流量

**必經。** `CLAUDE.md` 上線鐵則第 2 條與簡化授權的「不免除」都要求：進 `main` 之前必須已實際打過端點。
單軌沒有中介環境可以緩衝，preview 是上線前唯一的驗證機會。

Firebase Hosting 的 preview channel 會給一個獨立的臨時網址，**不影響 live**。

```bash
firebase hosting:channel:deploy preview \
  --project split-flap-flight-board \
  --expires 7d
```

驗證（**實際打端點，不是看指令回傳成功**；輸出要貼進 PR）：

```bash
# 上一步的輸出會印出 Channel URL，代入下面的 <URL>
curl -sS -o /dev/null -w '%{http_code}\n' '<URL>'          # 期望 200
curl -sS '<URL>/data/promo.json' | head -c 200             # 期望是 JSON 陣列
```

再用瀏覽器實機看一次：翻牌動畫會動、中文不被截斷、promo bar 有在輪播、右上角時間在走。

> ⚠️ **未實測項**：`firebase hosting:channel:deploy` 在 CLI 15.28.2 確認存在，但**本專案從未實際跑過 preview channel**。
> 第一次執行若失敗（多半是專案未啟用 channel 或權限不足），回報後再處理，**不要改用第 4 節繞過去**。

---

## 4. `核准部署：正式`——上線

前置條件三條，缺一不可（來源：`CLAUDE.md` 第一節「上線鐵則」）：

1. 已在 preview 部署並驗證通過（第 3 節）
2. 已走 `核准推送：分支` → `核准推送：PR` → `核准推送：merge`（`--no-ff` 進 `main`）
3. 目前在 `main`，且與 `origin/main` 同步

```bash
git -C . rev-parse --abbrev-ref HEAD      # 必須是 main
git -C . fetch origin && git -C . status -sb | head -1
firebase deploy --only hosting --project split-flap-flight-board
```

上線後驗證：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://split-flap-flight-board.web.app   # 期望 200
```

> 本專案是純靜態站，**沒有 `/health` 端點**。鐵則第 3 條在本專案以
> 「根路徑回 200 ＋ 瀏覽器實機看板走一輪」代替。

---

## 5. `push-deploy.sh` 的地位

repo 根目錄有一支 `push-deploy.sh`（**已 gitignore，不在版控內**），
一次做完 `git add -A` → `commit` → `git push origin main` → `firebase deploy --only hosting`。

🔴 **它不是本文件任何一節的執行路徑，收到 `核准部署：正式` 時不得使用它。** 三個理由：

- 它把 push 與 deploy 綁死，**preview 沒有存在的空間**
- 它 `git add -A`，等於在沒有推送口令的情況下 commit + push
- 它不帶 `--project`

它可以留著當本機快速工具，但**用它就是繞過口令閘**。

---

## 6. 回滾

見 [`ROLLBACK.md`](ROLLBACK.md)（口令：`核准部署：還原`）。

本 repo **沒有任何 git tag**，且**刻意不建**（`CLAUDE.md` `## 刻意例外` 第 3 節豁免第 8 項）
——Firebase Hosting 的版本紀錄本身就是還原點。

---

## 7. 這份文件與標準的關係

跨專案標準見 `OpDev/standards/DEPLOYMENT.md`<!-- docs-sync: ignore-refs --><!-- 理由：指向另一個 repo (OpDev) -->。

本專案在 `CLAUDE.md` 有一節 `## 刻意例外`（純顯示前端，豁免跨專案治理骨架）。
它**就其明列的涵蓋範圍**優先於標準，但**明文不涵蓋口令表**——口令全部有效。
稽核請以該節的失效條件 E1–E7 逐條複查。
