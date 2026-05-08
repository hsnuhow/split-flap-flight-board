# CAL Split-Flap Flight Board

中華航空 2026 COMPUTEX 展示用航班資訊看板。

- 網址：https://split-flap-flight-board.web.app
- 技術棧：純 HTML/CSS/JS + Firebase Hosting

---

## 現場展示設定——全螢幕 Kiosk 模式

### Windows（推薦：Chrome Kiosk 捷徑）

適合自備展示機或主辦方提供的 Windows 電腦。

**步驟：**

1. 確認電腦已安裝 Google Chrome
2. 在桌面空白處右鍵 → **新增** → **捷徑**
3. 位置填入以下指令（完整複製，含引號）：

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars https://split-flap-flight-board.web.app
```

4. 名稱填入「**航班看板**」→ 完成
5. 雙擊捷徑，Chrome 即以全螢幕 Kiosk 模式啟動，完全隱藏網址列與工具列

**退出方式：** `Alt + F4`

> ⚠️ 如果 Chrome 安裝在其他路徑，請改為 `"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"`

---

### Windows（備用：Edge Kiosk，電腦未安裝 Chrome 時使用）

Windows 10/11 內建 Microsoft Edge，無需額外安裝。

**步驟：**

1. 在桌面空白處右鍵 → **新增** → **捷徑**
2. 位置填入：

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk https://split-flap-flight-board.web.app --edge-kiosk-type=fullscreen --no-first-run
```

3. 名稱填入「**航班看板**」→ 完成
4. 雙擊捷徑啟動

**退出方式：** `Alt + F4`

---

### Windows（進階：Assigned Access，長時間無人值守展示機）

適合展覽連續多天、展示機不需要做其他用途的場景。開機後自動進入看板，使用者無法操作其他程式。

1. 開啟 **設定** → **帳戶** → **家人與其他使用者**
2. 點選**設定 Kiosk**，新增一個專用帳戶（建議命名 `kiosk`）
3. 選擇應用程式 → 選 **Microsoft Edge**
4. 輸入網址：`https://split-flap-flight-board.web.app`
5. 重新開機後自動生效

**退出方式：** `Ctrl + Alt + Del` → 切換使用者

---

### Mac（臨時展示）

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  https://split-flap-flight-board.web.app
```

**退出方式：** `Cmd + Q`

---

## 常見狀況排除

| 狀況 | 處理方式 |
|------|---------|
| 看板顯示「暫無資料」 | 確認網路連線正常，重新整理頁面（Kiosk 模式：先 `Alt+F4` 退出，重新開啟捷徑） |
| 字體顯示異常 | 等待 5–10 秒讓字型載入完成；或重新整理 |
| 畫面比例不對 | 調整螢幕解析度為 1920×1080（16:9），或在 Chrome 設定中將縮放比例調回 100% |
| 需要更新航班資料 | 聯繫負責人更新 `public/data/flights-zh.json` 與 `flights-en.json` 並重新部署 |
