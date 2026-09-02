# ROLLBACK — split-flap-flight-board

> 依 OpDev/standards/DEPLOYMENT.md 第六節（回滾）產生於 2026-09-02。
> 級別：**T3**。服務名稱與區域取自當日實際雲端狀態。

**回滾的第一原則：先止血，再查原因。** 切回舊 revision 只要數十秒，不需重新 build。

---

## 1. 先確認要回到哪裡

```bash
git tag -l --sort=-creatordate | head -5   # ⚠️ 本 repo 目前沒有任何 tag，
                                           #    還原點需先建立（見第 6 節）
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

**不適用**——本 repo 沒有 `firestore.rules`，也未透過本 repo 部署 rules。

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

1. 確認服務恢復（`/health`、關鍵流程實機走一次）
2. 記錄事故：什麼壞了、回到哪個版本、還沒解決什麼。
   ⚠️ 本 repo 沒有 `changelog.md`，建議建立；否則至少寫進 commit message
3. 修正問題後重新走完整部署流程，**不要為了趕時間跳過預覽驗證**
   （單軌專案沒有第二個環境可以緩衝，預覽是唯一的驗證機會）
