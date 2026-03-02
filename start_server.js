// ===== MoodBloom — 本機開發用 Proxy Server =====
// 功能：靜態檔案 + Nova API proxy + .env API Key 管理
// 用法：node start_server.js
// 前置：npm install dotenv （只需要裝一次）

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ===== .env 載入 =====
try { require('dotenv').config(); } catch(e) {
    console.log('⚠️  dotenv 未安裝，請執行: npm install dotenv');
    console.log('   或手動在下方 API_KEY 填入你的 key\n');
}

const API_KEY = process.env.NOVA_API_KEY || '';
const PORT = process.env.PORT || 3000;
const NOVA_API_HOST = 'api.nova.amazon.com';
const NOVA_API_PATH = '/v1/chat/completions';

// ===== Offline Demo Stub (no key required) =====
function buildStubReply(userText='') {
    const t = String(userText || '').toLowerCase();
    // very small rule-based demo replies (judge-friendly)
    if (t.includes('生日') || t.includes('birthday')) return '生日快樂。今天想怎麼對自己溫柔一點？';
    if (t.includes('失眠') || t.includes('睡') || t.includes('insomnia')) return '你不是失敗，只是神經還在警戒。要不要一起做一次慢呼吸：吸 4、停 2、呼 6。';
    if (t.includes('壓力') || t.includes('焦慮') || t.includes('stress') || t.includes('anx')) return '我聽到你很繃。先把「今天最重的一件事」說成一句話，我在這裡接住。';
    if (t.includes('難過') || t.includes('想哭') || t.includes('sad') || t.includes('depress')) return '可以哭。你不用把自己撐成一座橋。告訴我：現在最痛的是哪個畫面？';
    return '我收到你的話了。先不用解釋得很完整——你想從「感受」還是「事件」開始？';
}

function stubNovaCompletions(bodyStr='') {
    let userText = '';
    try {
        const payload = JSON.parse(bodyStr || '{}');
        const msgs = payload.messages || [];
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i] && msgs[i].role === 'user') {
                // OpenAI-style: {role, content} where content can be string or array
                const c = msgs[i].content;
                if (typeof c === 'string') userText = c;
                else if (Array.isArray(c)) {
                    const firstText = c.find(x => x && x.type === 'text' && x.text);
                    userText = firstText ? firstText.text : '';
                }
                break;
            }
        }
    } catch (e) {}
    const reply = buildStubReply(userText);
    return JSON.stringify({
        id: 'stub-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'offline-stub',
        choices: [{
            index: 0,
            message: { role: 'assistant', content: reply },
            finish_reason: 'stop'
        }]
    });
}

if (!API_KEY) {
    console.log('⚠️  未設定 NOVA_API_KEY！');
    console.log('   方法 1: 建立 .env 檔案，寫入 NOVA_API_KEY=your_key_here');
    console.log('   方法 2: 直接設環境變數 NOVA_API_KEY=your_key_here node start_server.js\n');
}

// ===== MIME Types（含 mp3）=====
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.ogg':  'audio/ogg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.md':   'text/markdown; charset=utf-8',
};

// ===== 自動偵測最新版 index =====
function findIndexFile() {
    const dir = __dirname;
    // 優先用 index.html（S3 部署用）
    if (fs.existsSync(path.join(dir, 'index.html'))) return 'index.html';
    // 其次找版本號命名的（本機開發用）
    const files = fs.readdirSync(dir).filter(f => /^index_v\d+.*\.html$/.test(f)).sort();
    if (files.length > 0) return files[files.length - 1];  // 最新版
    return 'index.html';  // fallback
}

const INDEX_FILE = findIndexFile();

// ===== Nova API Proxy =====
function proxyToNova(req, res) {
    if (!API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'NOVA_API_KEY not configured. Check .env file.' } }));
        return;
    }

    // Handle OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const options = {
            hostname: NOVA_API_HOST,
            path: NOVA_API_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(body),
            }
        };

        const proxyReq = https.request(options, proxyRes => {
            const chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
                const responseBody = Buffer.concat(chunks).toString();
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                });
                res.end(responseBody);
            });
        });

        proxyReq.on('error', err => {
            console.error('❌ Nova API error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
}

// ===== HTTP Server =====
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API proxy
    if (pathname === '/api/nova') {
        proxyToNova(req, res);
        return;
    }

    // Health check
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', hasKey: !!API_KEY, index: INDEX_FILE }));
        return;
    }

    // Static files
    let filePath = pathname === '/' ? INDEX_FILE : pathname.substring(1);
    filePath = path.join(__dirname, filePath);

    // Security: prevent path traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end(`File not found: ${pathname}`);
            } else {
                res.writeHead(500);
                res.end('Internal server error');
            }
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n🌸 MoodBloom Server v12.2`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Index: ${INDEX_FILE}`);
    console.log(`   API Key: ${API_KEY ? '✅ loaded from .env' : '❌ not set'}`);
    console.log(`   Proxy: /api/nova → ${NOVA_API_HOST}${NOVA_API_PATH}\n`);
});
