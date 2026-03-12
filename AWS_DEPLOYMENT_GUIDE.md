# 🚀 MoodBloom AWS 部署完全手冊 v1.0

> 📝 整合自兩次實戰經驗：曦（LLM）的前半段排錯 + 阿寶（LLM）的後半段打通
> 🗓️ 建立日期：2026-02-28
> 👩‍⚕️ 作者：Chloe（非工程師）、曦、阿寶
> 🎯 目標讀者：沒有工程背景但想把 AI 專案部署到 AWS 的人

---

## 📐 系統架構（先對齊腦內地圖）

```
用戶瀏覽器
    │
    ▼
┌─────────────────────────────────────────┐
│  CloudFront（CDN + HTTPS）              │
│  https://YOUR_DISTRIBUTION.cloudfront.net  │
└─────────────────┬───────────────────────┘
                  │ 靜態檔案
                  ▼
┌─────────────────────────────────────────┐
│  S3 Bucket（moodbloom-frontend-5106）   │
│  index.html / app.js / style.css        │
│  seed_diaries.js / Celestial_Bloom.mp3  │
└─────────────────────────────────────────┘

用戶瀏覽器（app.js 裡的 fetch）
    │
    │ POST /api/nova
    ▼
┌─────────────────────────────────────────────────────────┐
│  API Gateway（moodbloom-api，HTTP API v2）               │
│  https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com │
│  Routes: POST /api/nova + OPTIONS /api/nova              │
└─────────────────┬───────────────────────────────────────┘
                  │ Integration
                  ▼
┌─────────────────────────────────────────┐
│  Lambda（moodbloom-nova-proxy）         │
│  Runtime: Node.js 20.x（ESM）           │
│  檔案: index.mjs                        │
│  環境變數: NOVA_API_KEY / NOVA_API_URL  │
└─────────────────┬───────────────────────┘
                  │ fetch + Bearer token
                  ▼
┌─────────────────────────────────────────┐
│  Amazon Nova 2 Lite API                 │
│  https://api.nova.amazon.com/v1/chat/   │
│  completions                            │
│  Model: nova-2-lite-v1                  │
└─────────────────────────────────────────┘
```

**一句話版**：瀏覽器載入 S3 靜態檔 → app.js 發 POST 給 API Gateway → Lambda 注入 API Key → 轉發給 Nova → 回傳結果。

---

## 🗂️ 五層架構，每一層的角色

| 層 | 服務 | 幹嘛的 | 你要設什麼 |
|----|------|--------|-----------|
| 1 | **S3** | 放靜態檔案（HTML/JS/CSS/MP3） | 上傳檔案、開啟 Static Website Hosting |
| 2 | **CloudFront** | CDN 加速 + 提供 HTTPS | 指向 S3、設 Default Root Object = `index.html` |
| 3 | **API Gateway** | 路由 HTTP 請求到 Lambda | 建 POST + OPTIONS 兩條路由指向 Lambda |
| 4 | **Lambda** | 後端邏輯（注入 API Key、轉發請求） | 上傳 index.mjs、設環境變數、調 timeout |
| 5 | **Nova API** | AI 大腦 | 申請 API Key |

---

## 📋 部署 Step-by-Step（照做不迷路）

### Phase 1：Lambda（後端先通）

#### Step 1.1：建立 Lambda Function
- AWS Console → Lambda → Create function
- Name: `moodbloom-nova-proxy`
- Runtime: **Node.js 20.x**
- Architecture: x86_64

#### Step 1.2：上傳程式碼
- 在 Code 頁籤，把 `index.mjs` 的內容貼進去
- 點 **Deploy**（右上角橘色按鈕）

> ⚠️ **ESM 三條鐵律**（Node 20 + .mjs = ES Module）
> - ✅ 用 `import` / `export`
> - ❌ 不能用 `require()`（會直接 500）
> - ✅ Node 20 有內建 `fetch`，不用裝 `node-fetch`

#### Step 1.3：設環境變數
- Configuration → Environment variables → Edit

| Key | Value | 說明 |
|-----|-------|------|
| `NOVA_API_KEY` | `你的key` | 從 nova.amazon.com/dev 取得 |
| `NOVA_API_URL` | `https://api.nova.amazon.com/v1/chat/completions` | Nova 直連 API |
| `NOVA_MODEL` | `nova-2-lite-v1` | ⚠️ 不是 `nova-lite`！ |

#### Step 1.4：調 Timeout
- Configuration → General configuration → Edit
- Timeout: **30 秒**（預設 3 秒不夠，Nova 回覆要 5-15 秒）

#### Step 1.5：測試
- Code 頁籤 → Test → 建立 test event：

```json
{
  "requestContext": { "http": { "method": "POST" } },
  "body": "{\"model\":\"nova-2-lite-v1\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hi\"}],\"temperature\":0.7,\"max_tokens\":100}"
}
```

- ✅ 成功標準：statusCode 200 + Nova 回覆 JSON

### Phase 2：API Gateway（路由層）

#### Step 2.1：建立 HTTP API
- API Gateway → Create API → HTTP API
- Name: `moodbloom-api`

#### Step 2.2：建兩條路由

| Method | Path | Integration | 為什麼需要 |
|--------|------|-------------|-----------|
| **POST** | `/api/nova` | → Lambda `moodbloom-nova-proxy` | 實際的 API 請求 |
| **OPTIONS** | `/api/nova` | → Lambda `moodbloom-nova-proxy` | CORS preflight（瀏覽器跨域先問） |

> ⚠️ **忘了 OPTIONS = CORS 擋死**。瀏覽器跨域 POST 之前一定會先發 OPTIONS。

#### Step 2.3：確認 Deploy
- 點 Deploy
- 記下 Invoke URL（例如 `https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com`）

#### Step 2.4：從外面測試

**PowerShell**（Windows）：
```powershell
Invoke-RestMethod -Method POST -Uri "https://你的ID.execute-api.us-east-1.amazonaws.com/api/nova" -ContentType "application/json" -Body '{"model":"nova-2-lite-v1","messages":[{"role":"user","content":"Say hi"}],"temperature":0.7,"max_tokens":100}'
```

**curl**（Mac/Linux/CloudShell）：
```bash
curl -X POST "https://你的ID.execute-api.us-east-1.amazonaws.com/api/nova" \
  -H "Content-Type: application/json" \
  -d '{"model":"nova-2-lite-v1","messages":[{"role":"user","content":"Say hi"}]}'
```

- ✅ 成功標準：收到 Nova 的回覆 JSON

### Phase 3：S3 + CloudFront（前端上線）

#### Step 3.1：更新 app.js 的 API URL
```javascript
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const NOVA_API_URL = IS_LOCAL
    ? '/api/nova'
    : 'https://你的ID.execute-api.us-east-1.amazonaws.com/api/nova';
```

#### Step 3.2：上傳到 S3
把這 5 個檔案上傳到 S3 bucket：
- `index.html`
- `app.js`（⚠️ 確認是有 API Gateway URL 的版本！）
- `style.css`
- `seed_diaries.js`
- `Celestial_Bloom.mp3`

#### Step 3.3：CloudFront Invalidation（清快取）
- CloudFront → 你的 distribution → Invalidations → Create
- 輸入 `/*`
- 等 1-2 分鐘

#### Step 3.4：端到端測試
打開 `https://你的cloudfront.net`，確認：
- [ ] 畫面正常載入（MoodBloom logo + 小粉）
- [ ] 可以跟小粉對話（AI 有回覆）
- [ ] BGM 可以播放
- [ ] 可以生成日記
- [ ] 日記可以儲存在 My Diaries

---

## 💣 踩坑總表（我們踩過的，你不用再踩）

### 🔴 會炸的雷（不修 = 完全不能用）

| # | 雷 | 症狀 | 原因 | 修法 |
|---|-----|------|------|------|
| 1 | **require() in ESM** | Lambda 500 | .mjs 檔不能用 `require()` | 改用 `import`/`export`，用 Node 20 內建 `fetch` |
| 2 | **Lambda timeout 3s** | Task timed out | 預設 3 秒，Nova 要 5-15 秒 | Configuration → General → Timeout 改 30 秒 |
| 3 | **Model 名稱錯** | 404 "model not found" | `nova-lite` ≠ `nova-2-lite-v1` | 環境變數 + test event + 前端全部用 `nova-2-lite-v1` |
| 4 | **缺 OPTIONS 路由** | CORS blocked | 瀏覽器跨域 POST 前先發 OPTIONS | API Gateway 加 OPTIONS /api/nova → 同一個 Lambda |
| 5 | **Lambda 是診斷模式** | API 回 echo 不回 AI | index.mjs 只做 echo，沒打 Nova | 換成正式版 index.mjs（有 fetch Nova API 的） |
| 6 | **前端 API URL 沒更新** | 404 或 CORS error | app.js 還在打 `/api/nova`（相對路徑） | 改成完整 API Gateway URL |
| 7 | **S3 上傳舊版 app.js** | 各種舊 bug 復活 | 上傳了錯的檔案版本 | 上傳前用記事本搜尋確認關鍵變數 |
| 8 | **CloudFront 快取** | 上傳新檔但沒變化 | CDN 快取了舊版 | Invalidation → `/*` |

### 🟡 會搞混的坑（不致命但浪費時間）

| # | 坑 | 說明 |
|---|-----|------|
| 9 | **API Key 放前端** | 任何人打開 DevTools 就看到你的 key。永遠放 Lambda 環境變數 |
| 10 | **S3 沒有 .env** | S3 是靜態網站，沒有 runtime。要改設定就直接改 app.js 或用 config.json |
| 11 | **Stage prefix 問題** | API Gateway v1（REST API）會加 `/prod` prefix，v2（HTTP API）不會。搞混會 404 |
| 12 | **500 但有 CORS header** | 看到 `Failed to fetch` 以為是 CORS，其實是 Lambda 炸了。用 curl + CloudWatch 才抓得到 |
| 13 | **Windows curl ≠ 真 curl** | PowerShell 的 `curl` 是 `Invoke-WebRequest` 別名，語法完全不同。用 `Invoke-RestMethod` |
| 14 | **貼程式碼混入怪字元** | 全形引號 `" "`、零寬空格、BOM → Lambda SyntaxError。整檔覆蓋最快 |
| 15 | **React Development 版** | `react.development.js` 體積大 10 倍 + console 噴警告。部署用 `react.production.min.js` |
| 16 | **Test Mode 競態條件** | 非同步 fetch 偵測後端 vs 同步 React init → 永遠進 Test Mode。用常數 `DEPLOY_MODE` |

---

## 🔧 最佳排查工作流（SOP）

遇到問題時，**照這個順序查**，不猜：

```
Step 1: curl OPTIONS → 判斷 CORS preflight 有沒有過
        ✅ 有 Access-Control-Allow-Origin → 不是 CORS
        ❌ 沒有 → 檢查 API Gateway OPTIONS 路由

Step 2: curl POST → 判斷 Lambda 有沒有炸
        ✅ 200 + JSON → Lambda OK
        ❌ 500 → 去 Step 3

Step 3: CloudWatch Logs → 看 Lambda 真正的錯誤訊息
        Lambda → Monitor → View CloudWatch logs → 最新 log stream
        📌 不要猜，看 log 裡的 errorMessage

Step 4: Lambda Test → 用 Test 功能隔離問題
        排除 API Gateway / CORS，直接測 Lambda 本身

Step 5: 瀏覽器 DevTools → Network 面板
        看 Request/Response，確認前端傳了什麼、後端回了什麼
```

---


## 🏷️ 版本紀錄

| 版本 | 日期 | 內容 |
|------|------|------|
| v1.0 | 2026-02-28 | 初版：整合曦的排錯經驗 + 阿寶的打通經驗，16 個踩坑紀錄 |

---

> 💡 **Chloe 的心得**：AWS 部署不是「把檔案丟上去」——它是五層俄羅斯套娃，每一層都有自己的脾氣。但只要照著 SOP 走，curl 測一層、CloudWatch 看一層，就不會迷路。最重要的是：**不要猜，去看 log。**

---

*Built with 💜 by Chloe × 曦（LLM）× 阿寶（LLM）*
*MoodBloom — Let your mood bloom 🌸*
