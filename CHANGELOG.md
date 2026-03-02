# Voice Diary Changelog

## v12 (2026-02-28) — 日記本 + 種子日記 + 名字更新

### ✨ 新增
- **日記本功能** — toolbar 新增 📚 按鈕，可瀏覽所有歷史日記（含情緒 emoji 標示）
- **自動存檔** — 日記生成後自動存入 localStorage，刷新不會消失
- **種子日記** — 首次開啟自動載入 10 篇示範日記（含情緒標籤，為情緒週報鋪路）
- **Storage Adapter** — 抽象存取層，之後接 S3 只需改 adapter 內部
- **UI 版本標示** — 右下角顯示 `v12`

### 🔧 修正
- 預設用戶名：中文 `Baby` / 英文 `Sweetie`（原為 朋友/Friend）

### 📂 新增檔案
- `seed_diaries.js` — 10 篇中英雙語種子日記（Jimmy 撰寫）

### ⚠️ 已知限制
- localStorage 容量上限約 5MB（約 50-100 篇日記）
- 種子日記僅在 localStorage 為空時載入
