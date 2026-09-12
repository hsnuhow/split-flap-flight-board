# ROLLBACK — split-flap-flight-board

> 依 OpDev/standards/DEPLOYMENT.md 第六節（回滾）產生於 2026-09-02。
> 級別：**T3**。服務名稱與區域取自當日實際雲端狀態。

**回滾的第一原則：先止血，再查原因。** 切回舊 revision 只要數十秒，不需重新 build。

---

## 1. 先確認要回到哪裡

```bash
git tag -l --sort=-creatordate | head -5   # 本 repo 沒有任何 tag，且**刻意不建**：
                                           # 見 CLAUDE.md `刻意例外 2026-09-10-A` 涵蓋範圍豁免第 8 項。
                                           # 還原點改看 Firebase Hosting 版本紀錄（第 3 節）。
git log --oneline -10
```

---

## 2. Cloud Run

此專案目前沒有 Cloud Run 服務，僅有 Firebase Hosting。

---

## 3. Firebase Hosting 回滾

Hosting 保留歷史版本，回滾不需重新 build：

Firebase CLI 15.x **沒有** `hosting:versions:list` 指令，必須走 Console。

或在 Console → Hosting → split-flap-flight-board.web.app → 版本紀錄 → 對目標版本按「復原」。

---

## 4. Firestore Rules 回滾

**不適用於本 repo**——repo 內沒有 `firestore.rules`，本 repo 不部署 rules。

⚠️ **更正（2026-09-10 實測）**：原文「也未透過本 repo 部署 rules」讓人以為線上沒有 rules。
實際上 `(default)` 資料庫存在，且**線上 ruleset `c27f794e…`（2026-03-10 部署）仍然生效**：

```
match /{document=**} { allow read, write: if false; }
```

全拒客戶端存取，無公開寫入。**不要為了「清乾淨」去刪掉它**——刪掉 rules 等於放寬。
資料庫本身的清理見 `CLAUDE.md` 待辦 B2。

---

## 5. 資料層——不可回滾的界線

**以下變更一旦執行就無法用上述任何方式復原，必須靠備份還原：**

- Firestore 文件的刪除或覆寫
- Storage 物件的刪除
- Firebase Auth 使用者的刪除

### 備份還原

⚠️ **此專案（T3）目前沒有 Firestore 備份排程**，資料層事故無法復原。
若資料價值提升，依 `OpDev/standards/MAINTENANCE.md` 建立每日備份。<!-- docs-sync: ignore-refs --><!-- 理由：指向另一個 repo (OpDev) -->

---

## 6. 回滾後

1. 確認服務恢復。本站**沒有 `/health`**（純靜態），以「根路徑回 200 ＋ 瀏覽器實機看板走一輪」代替
2. 記錄事故：什麼壞了、回到哪個版本、還沒解決什麼——**寫進 [`changelog.md`](changelog.md)**；
   還沒解決的列進 `CLAUDE.md` 的「待辦」節
3. 修正問題後重新走完整部署流程，**不要為了趕時間跳過預覽驗證**
   （單軌專案沒有第二個環境可以緩衝，預覽是唯一的驗證機會）
