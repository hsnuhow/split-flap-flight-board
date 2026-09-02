---
name: team-verify
description: 召集 agent 團隊對一個任務階段做循環開發/驗證。先讓 PM 定範圍與驗收，dev 實作，security+code-reviewer+ui-designer+user-tester 並行稽核，dev 修補，循環到收斂。依當前授權決定是否含部署。
---

# /team-verify — agent 團隊循環編排

你（主控）依本流程召集 `.claude/agents/` 的專業 agent。用 **Agent 工具**派工，`subagent_type` 填對應名稱（`product-manager` / `dev-engineer` / `devops-architect` / `security-auditor` / `code-reviewer` / `ui-designer` / `user-tester`）。獨立稽核**同一回合並行派出**。

## 🔴 口令以本專案 CLAUDE.md 為唯一權威

**本 SKILL 不定義、不發明任何口令。** 不同專案的部署口令用字不同
（有的用 `stage` / `production`，有的用 `正式` / `測試`，有的用 `firebase` / `cloudflare`）。

開始前先讀本專案 `CLAUDE.md` 的部署章節，確認以下四個語意角色各自對應哪個口令：

| 語意角色 | 本專案的口令 |
|---|---|
| 預覽（不受流量 / preview channel） | 讀 CLAUDE.md |
| 部署到中介環境（**僅雙軌專案有**） | 讀 CLAUDE.md |
| 部署到最終對外環境 | 讀 CLAUDE.md |
| 從穩定點還原 | 讀 CLAUDE.md |

**若 CLAUDE.md 沒有定義某個角色的口令，那個動作就不存在授權，一律停下請使用者裁示。**
不得用其他專案的詞代替，也不得自行造詞。

## 先判斷環境結構

先確認本專案是**雙軌**（有中介環境）或**單軌**（只有一個對外環境）——
看產品文件的「部署路徑」宣告，或 `.firebaserc` / CLAUDE.md 的環境描述。

- **雙軌**：第 7 步的「部署中介環境並複驗」成立。
- **單軌**：**沒有中介環境可緩衝**。第 7 步改為「部署 preview 並複驗」；
  正式上線一律停下請使用者下對應口令，**自治模式絕不自行上線**。

## 先判斷授權模式（決定迴圈走多遠）

- **無口令 / 只給開發類口令（`核准開發`、`核准修正` 等）**：跑 find→fix→review→**再驗證（編譯/type-check/邏輯）**，**停在部署前**，回報「請下 <本專案的預覽或部署口令>」。
- **階段內自治口令**（若本專案 CLAUDE.md 有定義，例如 `核准循環開發部署：<階段>`）：在該**指定階段範圍內**自行 開發+執行+部署到**非最終環境**+複驗，循環到驗收達成或連續 2 輪無新問題。
  - 🔴 **絕不**自動：部署到最終對外環境、`git push`、開 PR、merge。要動這些一律停下請使用者下對應口令。
  - 每次部署**前必讀本專案的部署文件**（若有 `DEPLOYMENT.md` / `DEPLOY_SOP.md` 就讀它；沒有就讀 CLAUDE.md 的部署章節）。
  - 範圍模糊就停下問，不自我擴張階段。
- **全鏈自治口令**（若本專案 CLAUDE.md 有定義）：語意與煞車條件一律以該專案 CLAUDE.md 為準。
  煞車（保護非流程）：merge 衝突／文件門檻未過／測試修不綠／需使用者決策的岔路／範圍跨出指定階段／全域安全紅線 → 停下回報。

## 標準循環

1. **定範圍（product-manager）**：把任務階段拆成目標、範圍（will / won't）、**可驗證的驗收標準**；必要時上網研究 GitHub/文獻找參考。產出驗收清單。
2. **（架構把關，視需要 devops-architect）**：評估設計合理性、Cloud Run 成本/效能、部署就緒度（rules/index/env）。
3. **實作（dev-engineer）**：在驗收標準與批准範圍內最小變更實作；本地編譯/type-check 過；同步文件。
4. **並行稽核**（同一回合派出）：
   - `security-auditor`：弱點/越權/PII/注入
   - `code-reviewer`：正確性/乾淨/命名/模組邊界
   - `ui-designer`：UI 清晰/一致/手機（若涉前端）
   - `user-tester`：對已部署的可測環境亂測挑毛病（單軌專案用 preview，不可對正式環境亂測）
5. **彙整 → 修補（dev-engineer）**：把確認的發現依優先序修；對抗式複驗（找「看似對其實錯」）。
6. **收斂判斷**：回到 4 複驗。連續 2 輪無新 🔴/🟡 → 視為收斂。
7. **（自治模式）部署到非最終環境 + 實機複驗** → user-tester 再亂測一輪。
8. **總結**：本階段做了什麼、驗證結果、剩餘待辦、（自治）宣告授權結束 /（非自治）請使用者下對應部署口令。

## 紀律（所有 agent 適用，主控負責把關）
- agent 一律先讀 `CLAUDE.md`；若本專案有文件索引（例如 `docs/INDEX.md`）也一併讀；正體中文；最小變更；忠實回報。
- 只有 `dev-engineer` 能改 code；稽核類 agent 唯讀只出報告。
- **沒有任何 agent 能自行 build/deploy/push** —— 部署只由主控在**對應授權下**親自執行。
- 文件即合約：改到產品就同步 docs。

## 用法
- `/team-verify <任務階段或範圍>` —— 例：`/team-verify 管理員管理模式`、`/team-verify 報名到付款全流程`。
- 也可只點名部分 agent：「資安 + reviewer 掃這次改動」「user-tester 去亂測報名」。
