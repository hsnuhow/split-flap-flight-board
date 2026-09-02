# check-env — split-flap-flight-board

> 一次性環境檢查清單，產生於 2026-09-02。
> **在本專案自己的 Claude Code session 中逐項執行**，不要在 OpDev 裡跑。
> 做完後把結果回報，或直接依各項的處置建議修。

| | |
|---|---|
| 雲端專案 | `split-flap-flight-board` |
| 級別 | T3 |
| 部署路徑 | B 單軌（無口令制度） |

## 本專案的部署口令

全站統一標準（2026-09-02 定案）。八個專案一致，已寫進本專案 CLAUDE.md 最前面。

| 動作 | 口令 |
|---|---|
| 部署但不接流量 | `核准部署：preview` |
| 部署到 staging | — 本專案無此環境，跳過 |
| 上線 | `核准部署：正式` |
| 從穩定點還原 | `核准部署：還原` |

**上線鐵則**：先在 preview 驗證無誤 → `核准推送：PR` → `核准推送：merge`（`--no-ff` 進 main）→ 從 main 上線。

---

## 一、已知問題（2026-09-02 四個平行驗證 session 實測發現）

逐項確認是否仍存在。🔴 應優先處理。

### 🔴 CLAUDE.md 完全沒有部署口令制度

351 行內搜不到任何 `核准部署`。唯一閘門是 `執行開發`。

### 🔴 `push-deploy.sh` 與口令閘互斥

一次執行 `git add -A` → `commit` → `push origin main` → `firebase deploy --only hosting`。**一次 push 就直接上 live，preview 沒有存在空間。**

### 🟡 CLAUDE.md 引用不存在的目錄

第 317／318／339／340 行提到 `.github/workflows/`（已於 commit `a4a4445` 移除）、第 134–151 行整節講 `functions/`（不存在）。

### 🟡 `github-action-*` 服務帳戶仍在

金鑰已於 2026-09-02 刪除（該帳戶的 workflows 已不存在），但帳戶本身仍持有 `cloudfunctions.developer` + `firebasehosting.admin`。確認是否還需要。

### 🟡 沒有任何 git tag、沒有 changelog.md

### 🟢 `.claude/settings.json` 本次新建

原本沒有，且差點因 gitignore 規則而無法進版控（已修）。

---

## 二、雲端基準線

```bash
# 計費狀態
gcloud billing projects describe split-flap-flight-board --format='value(billingEnabled,billingAccountName)'

# Firestore 備份排程（T1 必須每日、保留 7 天）
gcloud firestore backups schedules list --database='(default)' --project=split-flap-flight-board

# 警示政策（T1 至少 3 條：5xx / uptime / ERROR log）
gcloud alpha monitoring policies list --project=split-flap-flight-board --format='value(displayName,enabled)'

# API key 限制（兩個維度都要有：限定 API + 限定來源）
gcloud services api-keys list --project=split-flap-flight-board --format=json | jq '.[] | {name:.displayName, restrictions}'

# 可下載私鑰（應為 0；全資產已於 2026-09-02 清空，不得再產生）
for SA in $(gcloud iam service-accounts list --project=split-flap-flight-board --format='value(email)'); do
  gcloud iam service-accounts keys list --iam-account=$SA --project=split-flap-flight-board --managed-by=user --format='value(name)'
done

# 公開 IAM 授權（應為空）
gcloud projects get-iam-policy split-flap-flight-board --format=json | jq '.bindings[] | select(.members[] | contains("allUsers"))'
```

---

## 三、本機開發環境

```bash
# 不得存在服務帳戶金鑰檔（改用 ADC）
find . -name '*.json' -not -path '*/node_modules/*' -size -20k | xargs grep -l '"type": *"service_account"' 2>/dev/null

# 若有，確認是否被 git 追蹤（曾 commit 過就算外洩）
git log --all --oneline -- <該檔案路徑>

# ADC 狀態
gcloud auth application-default print-access-token >/dev/null && echo 'ADC 可用'

# 前端相依架構是否正確（arm64 機器不能裝 x64 版 rollup）
ls node_modules/.pnpm 2>/dev/null | grep rollup- || ls frontend/node_modules/.pnpm 2>/dev/null | grep rollup-
uname -m   # 應與上面的 rollup 架構相符
```

---

## 四、文件與設定

```bash
# 標準文件是否齊備
ls CLAUDE.md AGENTS.md ROLLBACK.md 2>&1

# settings.json 是否合法且可版控
python3 -c "import json;json.load(open('.claude/settings.json'));print('JSON OK')"
git check-ignore -q .claude/settings.json && echo '⚠ 被忽略，不會進版控' || echo '✓ 可版控'

# agents 與 skill 是否齊備（應為 8 個 agent + team-verify）
ls .claude/agents/*.md | wc -l
ls .claude/skills/team-verify/SKILL.md

# deny 是否真的擋住機密（注意：deny 只擋 Read 工具，不擋 Bash(cat)）
python3 -c "import json;d=json.load(open('.claude/settings.json'));print('\n'.join(x for x in d['permissions']['deny'] if x.startswith('Read')))"

# 口令對照表是否與 CLAUDE.md 一致
grep -n '核准部署' CLAUDE.md | head -20
```

---

---

## 五之二、本機環境稽核發現（2026-09-02，另一 session 實測）

來源：`OpDev/plans/local-devenv-audit-20260902.md`<!-- docs-sync: ignore-refs --><!-- 理由：指向另一個 repo (OpDev) -->

### 🟡 gitleaks 1 筆，高機率誤報

`public/index.html` — 前端設定。**待辦**：確認後列入 `.gitleaksignore`。

---

## 五之三、雲端待處理（2026-09-02 掃描，**全部需要你核准**）

雲端專案：`split-flap-flight-board`

以下是 OpDev 掃描出、**尚未處理**的項目。都不是我能自行執行的。

- [ ] **預設 compute 服務帳戶持有 `roles/editor`**
- [ ] **`github-action-*` 服務帳戶仍持有部署權限**
      金鑰已於 2026-09-02 刪除，但帳戶仍在且有 `cloudfunctions.developer` + `firebasehosting.admin`。workflows 已移除，確認是否還需要這個帳戶。

### 這些為什麼都要你核准

依 OpDev 的授權界線（2026-09-02 你選的「唯讀掃描，所有變更都要我確認」），
以上每一項都會改動雲端狀態，我不會自行執行。**而且其中幾項本來就該謹慎**：

| 動作 | 風險 |
|---|---|
| 設配額上限 | 設太低會擋掉正常流量 |
| API key 加來源限制 | 設錯會讓現有呼叫全部失敗 |
| Artifact Registry 清理政策 | 會刪除映像，包含可能還要回滾用的版本 |
| Bucket 生命週期規則 | 會刪除物件 |
| 改預設服務帳戶 | 需逐服務建立專屬帳戶並確認最小權限，是唯一需要真正工程時間的項目 |

要處理時，在 OpDev 跑 `opdev scan --plan` 產生核可清單，逐項確認後再執行。

### 查詢指令（唯讀，可自行跑）

```bash
# 預設 compute 服務帳戶的角色
gcloud projects get-iam-policy <PROJECT> --format=json | \
  jq '.bindings[] | select(.role=="roles/editor") | .members'

# Artifact Registry 大小與清理政策
gcloud artifacts repositories list --project=<PROJECT> \
  --format='table(name,sizeBytes,cleanupPolicies)'

# Bucket 生命週期
gcloud storage buckets list --project=<PROJECT> --format='table(name,lifecycle_config)'

# Cloud Run 是否有 min-instances > 0（會 24 小時計費）
gcloud run services list --project=<PROJECT> --format=json | \
  jq '.[] | {name:.metadata.name, minScale:.spec.template.metadata.annotations["autoscaling.knative.dev/minScale"]}'
```


---

## 五之四、public/ 是部署根目錄（2026-09-02 處理）

`firebase.json` 的 `hosting.public` 是 `public`，`ignore` 只排除
`firebase.json`、`**/.*`、`node_modules/**`、`scripts/**`、`functions/**`。

**放進 `public/` 的任何非隱藏檔都會被 `firebase deploy` 推上線**，即使沒有任何程式碼引用它。
`firebase deploy` 部署的是本機檔案，不是 git 內容，所以「沒有 commit」不代表「不會上線」。

### 已處理

`public/routemap.png`（1.37 MB，中華航空全球航點圖）從未被引用、從未進版控。
實測線上該路徑回傳的是 index.html（SPA fallback），確認未被部署——純粹是因為
上次部署早於這個檔案（2026-05-18 建立）。**下一次部署就會把它推上線。**

**已刪除**（2026-09-02）。該檔從未進版控，所以刪除不影響 git 歷史；
它是中華航空官網的公開素材，需要時可重新取得。

### 日後要注意

- [ ] 新增資產前先確認它是否真的要對外——不要用 `public/` 當暫存區
- [ ] `public/.DS_Store` 目前存在，但被 `ignore` 的 `**/.*` 排除，不會部署
- [ ] 本專案使用中華航空的 logo 與品牌素材（`CAL_logo.png` 已上線）。
      個人專案常見，但若日後要公開推廣，第三方商標的使用範圍值得你自己確認

## 五、完成後

1. 把仍存在的 🔴 項目排進 `docs/BACKLOG.md`（沒有就建一個）
2. 已解決的項目在本檔劃掉，並註明日期
3. 本檔是**一次性**檢查。日常節奏改用 OpDev 的 `opdev health` / `opdev scan --plan`

---

## 六、建置注意事項（全專案適用）

⚠️ **在這台 M2 Mac 建置要推上 Cloud Run 的映像，必須帶 `--platform linux/amd64`：**

```bash
docker buildx build --platform linux/amd64 -t <tag> --load .
```

不帶的話會產出 arm64 映像，**推上 Cloud Run 無法啟動**，而錯誤訊息通常不會指向架構問題。

本機環境：colima 0.10.3（手動 `colima start`）、docker 29.7.2、buildx 0.36.1。

來源：`OpDev/plans/local-devenv-audit-20260902.md`<!-- docs-sync: ignore-refs --><!-- 理由：指向另一個 repo (OpDev) -->
