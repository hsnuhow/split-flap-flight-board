# AGENTS.md — AI 代理開發指引入口

本專案的開發 / 測試 / 部署規範**唯一準則為 [`CLAUDE.md`](CLAUDE.md)**。

所有 AI 代理（Claude Code、Codex 或其他工具）一律遵循 `CLAUDE.md`，**不另立分歧的規則文件**。

跨專案的共同標準見 `~/MyDeveloper/OpDev/standards/`：

| 文件 | 涵蓋 |
|---|---|
| `standards/DEVELOPMENT.md` | 口令紀律、提案格式、分支模型、合併紀律 |
| `standards/DEPLOYMENT.md` | 藍綠部署、部署前逐步檢查、回滾 |
| `standards/MAINTENANCE.md` | 備份、監控、機密輪替、成本 |
| `standards/STACK.md` | 技術棧、固定套件、Claude Code 配置 |

衝突時以本專案 `CLAUDE.md` 為準；`CLAUDE.md` 未涵蓋者依 `standards/`。

重點提醒：

- **無口令不部署。** `可以`、`好`、`繼續`、`OK` 均為無效批准。
- **先計畫後執行、最小變更、完成即停。**
- **文件即合約**——改到 API、資料模型、權限、部署流程就要同步更新文件。
- **不讀取、不列印、不提交** `.env*`、credential、私鑰。

> 本檔為薄入口。不要在這裡複製 `CLAUDE.md` 的內容——兩份規則必然漂移。
> `ichi_pickle_regi` 曾因此把獨立的 Codex 指引改為薄入口（2026-06-23）。
