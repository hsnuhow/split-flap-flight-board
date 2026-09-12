# docs/BACKLOG.md — split-flap-flight-board

> 依 `OpDev/standards/DOCUMENTATION.md` 第十節。
> 狀態只有 `[未處理]` 與 `[處理中]` 兩種，寫在條目標題的方括號裡。
> **沒有「已解決」**——條目做完（或被判定不做、被駁回）時，
> 在 [`changelog.md`](../changelog.md) 記一行（日期 ＋ 原條目標題逐字 ＋ 結果），
> 然後**從本檔刪除該條**。所以本檔裡的每一條都是還沒完成的。

### [未處理] `Browser key (auto created by Firebase)` 未設來源（referrer）限制

- **分類**：AUDIT.md 第七節處置第五種——**已指派，等待外部人工行動**。
- **為什麼不是一般待辦**：這是 `FRAMEWORK.md` 第三節「不分級別一律必須」的安全項
  （API key 雙維度限制）**未過**，見 `CLAUDE.md` `刻意例外 2026-09-10-A` 涵蓋範圍
  「🔴 不豁免」第 5 項。**寫進本檔不等於已通過**，只是讓它有指派、有驗收。
- **現況**（2026-09-12 實跑）：`restrictions.browserKeyRestrictions` 為空，
  即未設任何 HTTP referrer 限制。該 key 目前未被本站前端使用、計費已關閉。
- **指派對象**：使用者本人（`how.penguin@gmail.com`）。
- **為什麼 AI 不能代做**：需在 Cloud Console（API 與服務 → 憑證）互動操作；
  且依全站規則 `dash` 類雲端主控台不做瀏覽器自動化。
- **動作**：Console → API 與服務 → 憑證 → 該 key → 應用程式限制選「HTTP 參照網址」
  → 加入 `split-flap-flight-board.web.app/*`。
- **驗收指令**（現在就跑得動；未設定時為紅）：

```bash
gcloud services api-keys list --project split-flap-flight-board \
  --format='value(displayName,restrictions.browserKeyRestrictions.allowedReferrers.list())'
```

  2026-09-12 實跑輸出（結束碼 0）：

```
Browser key (auto created by Firebase)	
```

  顯示名稱後只有一個 tab 與換行，**第二欄空白 ＝ 尚未設定（紅）**。
  設定完成後第二欄應出現 `split-flap-flight-board.web.app/*`。

### [未處理] Firestore `(default)` 與 collection `airportNames`（5 筆）為 2026-03-10 遺留，本站不使用

- **級別**：LOW。衛生項。
- **連動**：刪除後，`CLAUDE.md` `刻意例外 2026-09-10-A` **失效條件 E4**
  （現為「Firestore 出現 `airportNames` 以外的 collection」）的基準要同步改為
  「不得有任何 collection」，否則 E4 會變成恆假而失去偵測力。
- **相關引用**：`DEPLOYMENT.md` 第 1 節環境表、`ROLLBACK.md` 第 3 節。

### [未處理] Secret Manager 內的 TDX／Gemini 金鑰自 2026-04-30 起已不被前端使用，尚未輪換

- **級別**：LOW。
- **背景**：曾於 `.claude/settings.local.json` 以明碼出現過（已於 2026-09-02 刪除並加入 `.gitignore`）。
- **動作**：至各平台（TDX、Google AI Studio）輪換或刪除該金鑰。
- **現況**：計費已關閉，Secret Manager 目前回 `BILLING_DISABLED`。

### [未處理] 預設 compute 服務帳戶持有 `roles/editor`

- **級別**：LOW。
- **動作**：需雲端 IAM 變更，要使用者核准後才執行。

### [未處理] `github-action-*` 服務帳戶仍持有 `cloudfunctions.developer` ＋ `firebasehosting.admin`

- **級別**：LOW。
- **背景**：金鑰已於 2026-09-02 刪除，`.github/` workflows 已不存在。
- **動作**：確認是否還需要此帳戶，不需要就刪。

### [未處理] gitleaks 在 `public/index.html` 有 1 筆命中，高機率誤報

- **級別**：LOW。
- **動作**：確認後列入 `.gitleaksignore`。
