const { useState, useRef, useEffect, useCallback } = React;

// ╔══════════════════════════════════════════════════════════╗
// ║  🔑 API CONFIGURATION                                    ║
// ║  API Key 由後端管理（.env / Lambda env），前端不存 key     ║
// ║  所有請求走 /api/nova → 後端 proxy 轉發到 Nova API        ║
// ╚══════════════════════════════════════════════════════════╝
// 自動偵測環境：本機預設走 /api/nova（由 start_server.js 提供）
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 可選：在 index.html 透過 window.MOODBLOOM_CONFIG 設定 apiUrl（例如你的 API Gateway URL）
// Example:
//   window.MOODBLOOM_CONFIG = { apiUrl: 'https://YOUR_API_ID.execute-api.REGION.amazonaws.com/api/nova' }
const CONFIG_API_URL = window.MOODBLOOM_CONFIG && window.MOODBLOOM_CONFIG.apiUrl;

// 預設永遠用相對路徑，確保 repo clone 下來就能跑（沒有 key 也能 Offline Demo）
const NOVA_API_URL = (CONFIG_API_URL && String(CONFIG_API_URL).trim()) ? CONFIG_API_URL : '/api/nova';
const NOVA_MODEL = 'nova-2-lite-v1';

// ⚠️ 語音辨識需要 HTTPS 或 localhost，file:// 不支援
if (window.location.protocol === 'file:') {
    console.warn('⚠️ Voice recognition requires HTTPS or localhost. Running from file:// may block microphone access.');
}

// 自動偵測模式：預設 Live Mode（AWS 部署後 /api/nova 一定存在）
// 只有在完全沒有後端時才 fallback 到 Test Mode
// 偵測方式：第一次 callNovaAPI 失敗時自動切換
const DEPLOY_MODE = 'live';  // 'live' = AWS/proxy, 'test' = 離線測試

// ===== 小粉表情系統 =====
// 如果有自訂圖片，把檔案放在同一資料夾並取消註解
// If you have custom Pinky images, place them in same folder and uncomment
        const PINKY_IMAGES = {
    happy: 'assets/xiafen_happy.png',
    thinking: 'assets/xiafen_thinking.png',
    sad: 'assets/xiafen_sad.png',
    love: 'assets/xiafen_love.png',
    surprise: 'assets/xiafen_surprise.png',
    sleepy: 'assets/xiafen_sleepy.png'
};
const PINKY_EMOJI = {
    happy: '😺', thinking: '🤔', sad: '😿',
    love: '😻', surprise: '🎉', sleepy: '😴'
};
const usePinkyImages = Object.keys(PINKY_IMAGES).length > 0;

// ===== 測試模式固定對話 =====
const TEST_CONVERSATIONS = {
    'zh-TW': [
        { user: '今天是我的生日', ai: '生日快樂！今天有什麼特別的慶祝嗎？' },
        { user: '朋友帶我去吃大餐', ai: '真棒！是去什麼樣的餐廳呢？' },
        { user: '一家很漂亮的花園餐廳', ai: '聽起來好浪漫！有什麼讓你印象深刻的嗎？' },
        { user: '他們還點了草莓蛋糕給我', ai: '太貼心了！想把這美好的一天記錄下來嗎？' },
    ],
    'en': [
        { user: "Today is my birthday", ai: "Happy birthday! Any special celebration today?" },
        { user: "Friends took me to dinner", ai: "That's wonderful! What kind of restaurant?" },
        { user: "A beautiful garden restaurant", ai: "Sounds lovely! Anything memorable?" },
        { user: "They ordered strawberry cake for me", ai: "So sweet! Want to record this beautiful day?" },
    ]
};

const TEST_DIARY = {
    'zh-TW': {
        diary: `今天是我的生日，一個讓我感到無比幸福的日子。

我的好朋友們帶我去了一家很漂亮的花園餐廳慶祝。那裡的環境真的很美，讓整個用餐體驗都變得特別起來。更讓我感動的是，他們還特別為我點了草莓蛋糕。

看著眼前的蛋糕和身邊的朋友們，我心裡湧起一股暖流。這些都是一直陪伴我的好朋友，他們用這樣的方式為我慶生，讓我感受到滿滿的愛。

我真的覺得自己很幸運，能擁有這樣一群真心待我的朋友。這份情誼是我最珍貴的寶藏。

今天的生日，因為有他們，變得格外溫暖而難忘。`,
        letter: `親愛的朋友，

讀著你的生日日記，我也感受到了那份溫暖和幸福。

花園餐廳、草莓蛋糕、還有好朋友——這些組成了一個多麼美好的生日啊！能被這樣珍惜和愛著，真的是很幸福的事。

願你們的友誼永遠甜蜜溫暖。

生日快樂！

小粉`
    },
    'en': {
        diary: `Today is my birthday, a day filled with happiness.

My good friends took me to a beautiful garden restaurant to celebrate. The atmosphere was wonderful, making the whole experience special. What touched me even more was that they ordered a strawberry cake for me.

Looking at the cake and my friends around me, warmth filled my heart. These are friends who have always been there for me, celebrating my birthday in such a thoughtful way.

I truly feel lucky to have such genuine friends. This friendship is my most precious treasure.

Today's birthday, because of them, became exceptionally warm and unforgettable.`,
        letter: `Dear friend,

Reading your birthday diary, I can feel that warmth and happiness too.

A garden restaurant, strawberry cake, and good friends—what a beautiful birthday! Being cherished like this is truly a blessing.

May your friendship stay sweet and warm forever.

Happy Birthday!

Pinky`
    }
};

const TRANSLATIONS = {
    en: {
        greeting: (userName, aiName) => `Hi ${userName}! How was your day?`,
        placeholder: "Type or tap mic...",
        listening: "Listening...",
        generating: "Writing diary... ✨",
        myDiary: "📖 My Diary",
        aiLetter: (aiName) => `💕 From ${aiName}`,
        copied: "✅ Copied!",
        error: "Error: ",
        viewDiary: "✨ Diary Ready! Tap to Write",
        viewDiaryDone: "✨ Diary Done! Tap to View",
        save: "Save",
        testMode: "TEST",
        novaMode: "NOVA",
        newDiary: "New Diary",
        enterHint: "Press Enter to send ↵"
    },
    'zh-TW': {
        greeting: (userName, aiName) => `嗨 ${userName}！今天過得如何？`,
        placeholder: "輸入或按麥克風...",
        listening: "聆聽中...",
        generating: "正在寫日記... ✨",
        myDiary: "📖 我的日記",
        aiLetter: (aiName) => `💕 ${aiName}的回信`,
        copied: "✅ 已複製！",
        error: "出錯：",
        viewDiary: "✨ 可以寫日記了！",
        viewDiaryDone: "✨ 日記寫好了，點我查看",
        save: "儲存",
        testMode: "測試",
        novaMode: "NOVA",
        newDiary: "新日記",
        enterHint: "按 Enter 送出 ↵"
    }
};

// ===== 自動日期 =====
function getFormattedDate(lang) {
    const now = new Date();
    if (lang === 'zh-TW') {
        return `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${['日','一','二','三','四','五','六'][now.getDay()]}`;
    }
    return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== Nova 2 Lite API 呼叫（OpenAI 相容格式）=====
// v12.1: 前端不帶 Authorization header，由後端 proxy 注入 API Key
async function callNovaAPI(messages, temperature = 0.8, maxTokens = 1024) {
    const response = await fetch(NOVA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: NOVA_MODEL,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
        })
    });
    let data;
    try {
        data = await response.json();
    } catch(e) {
        const text = await response.text().catch(() => 'no response body');
        throw new Error(`API 回應格式錯誤 (${response.status}): ${text.substring(0, 200)}`);
    }
    if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data).substring(0, 200)}`);
    }
    return data.choices?.[0]?.message?.content || '';
}

// ===== 瀏覽器內建 TTS（Phase 1 替代 Nova Sonic / ElevenLabs）=====
// ===== v12.1: 背景音樂控制 =====
// 設計：純 <audio> 元素，不創建 AudioContext，避免跟 SpeechRecognition 搶資源
const BGM_BASE_VOL = 0.15;   // 正常播放音量（淡淡的）
const BGM_MIN_VOL  = 0.02;   // 說話時淡出到幾乎聽不到
let _bgmFadeTimer = null;

function getBgm() { return document.getElementById('bgm'); }

function fadeBgmTo(target, duration = 600) {
    const audio = getBgm();
    if (!audio) return;
    clearInterval(_bgmFadeTimer);
    const start = audio.volume;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) { audio.volume = target; return; }
    const steps = Math.max(1, Math.floor(duration / 50));
    let i = 0;
    _bgmFadeTimer = setInterval(() => {
        i++;
        audio.volume = Math.min(1, Math.max(0, start + diff * (i / steps)));
        if (i >= steps) { clearInterval(_bgmFadeTimer); _bgmFadeTimer = null; }
    }, 50);
}

function speakWithBrowserTTS(text, lang, onEnd) {
    if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel(); // 停止之前的
    // v12.1: 用句子數量截斷而非字元數，解決英文只念一句的問題
    // 對話回覆念前 3 句就好（太長會不自然）
    const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]?/g) || [text];
    const maxSentences = 3;
    const truncated = sentences.slice(0, maxSentences).join('').trim();
    const utterance = new SpeechSynthesisUtterance(truncated);
    utterance.lang = lang === 'zh-TW' ? 'zh-TW' : 'en-US';
    utterance.rate = 1.1;
    utterance.pitch = 1.1; // 稍高一點，更可愛
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utterance);
}

// v11: 朗讀長文（日記/回信用，不截斷）
// 瀏覽器 TTS 對長文有限制，拆成句子逐句唸
let _ttsAborted = false;  // 全域中斷旗標
function speakLongText(text, lang, onEnd) {
    if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    _ttsAborted = false;
    
    // 用句號、問號、驚嘆號拆句
    const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]?/g) || [text];
    let index = 0;
    
    const speakNext = () => {
        if (_ttsAborted || index >= sentences.length) {
            if (onEnd) onEnd();
            return;
        }
        const sentence = sentences[index].trim();
        if (!sentence) { index++; speakNext(); return; }
        
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = lang === 'zh-TW' ? 'zh-TW' : 'en-US';
        utterance.rate = 1.0;   // 日記用正常語速
        utterance.pitch = 1.1;
        utterance.onend = () => { if (!_ttsAborted) { index++; speakNext(); } };
        utterance.onerror = () => { if (!_ttsAborted) { index++; speakNext(); } };
        window.speechSynthesis.speak(utterance);
    };
    speakNext();
}
function stopLongText() {
    _ttsAborted = true;
    window.speechSynthesis?.cancel();
}

// ===== v12: Storage Adapter =====
// 抽象層：目前用 localStorage，之後換 S3 只需改這裡
// 為情感分析 + 情緒週報預留 emotion 欄位
const DIARY_STORAGE_KEY = 'voicediary_entries';

const DiaryStorage = {
    load() {
        try {
            const raw = localStorage.getItem(DIARY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('📚 日記讀取失敗:', e);
            return [];
        }
    },
    save(entry) {
        try {
            const entries = this.load();
            entries.unshift(entry);
            localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
            return entries;
        } catch (e) {
            console.warn('📚 日記存檔失敗:', e);
            return this.load();
        }
    },
    delete(id) {
        try {
            const entries = this.load().filter(e => e.id !== id);
            localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
            return entries;
        } catch (e) {
            console.warn('📚 日記刪除失敗:', e);
            return this.load();
        }
    },
    // 種子日記載入：確保 10 篇 seed 永遠存在，缺的才補入
    // v12.1: 從「空才載入」改為「缺才補入」（merge 邏輯）
    ensureSeeds(lang) {
        if (typeof SEED_DIARIES === 'undefined') return this.load();
        const entries = this.load();
        const existingIds = new Set(entries.map(e => e.id));
        let added = 0;
        SEED_DIARIES.forEach(s => {
            if (!existingIds.has(s.id)) {
                entries.push({
                    id: s.id,
                    date: s.date,
                    formattedDate: s.formattedDate[lang] || s.formattedDate['en'],
                    lang: lang,
                    diary: s.diary[lang] || s.diary['en'],
                    letter: s.letter[lang] || s.letter['en'],
                    imageUrl: null,
                    userName: s.userName[lang] || s.userName['en'],
                    aiName: s.aiName[lang] || s.aiName['en'],
                    emotion: s.emotion || null
                });
                added++;
            }
        });
        if (added > 0) {
            // 按日期排序：新的在前
            entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
            console.log(`📚 補入 ${added} 篇種子日記（共 ${entries.length} 篇）`);
        }
        return entries;
    }
};

const MIN_TURNS_FOR_DIARY_CHECK = 3;

function MoodBloom() {
    const [testMode, setTestMode] = useState(DEPLOY_MODE === 'test');  // AWS: live by default
    const [testStep, setTestStep] = useState(0);
    const [lang, setLang] = useState('en');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showAiNameInput, setShowAiNameInput] = useState(false);
    const [showUserNameInput, setShowUserNameInput] = useState(false);
    const [aiName, setAiName] = useState('Pinky');
    const [userName, setUserName] = useState('Sweetie');
    const [tempName, setTempName] = useState('');
    const t = TRANSLATIONS[lang];
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [catEmotion, setCatEmotion] = useState('happy');
    const [generatedDiary, setGeneratedDiary] = useState(null);
    const [aiReverseDiary, setAiReverseDiary] = useState(null);
    const [diaryImageUrl, setDiaryImageUrl] = useState(null); // v6: 日記配圖 URL
    const [showDiaryModal, setShowDiaryModal] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [diaryReady, setDiaryReady] = useState(false);
    const [isTypewriting, setIsTypewriting] = useState(false);
    const [turnCount, setTurnCount] = useState(0);
    // Nova API 的完整 messages 格式（保留上下文）
    const [novaMessages, setNovaMessages] = useState([]);
    
    // v9: 圖片上傳相關 state
    const [pendingImage, setPendingImage] = useState(null);  // { base64, mimeType, previewUrl }
    const imageInputRef = useRef(null);  // 隱藏的 file input
    
    // v11: 日記朗讀 state — 'none' | 'diary' | 'letter'
    const [readingTarget, setReadingTarget] = useState('none');
    
    // v12: 日記本（歷史日記列表）
    const [showDiaryHistory, setShowDiaryHistory] = useState(false);
    const [diaryEntries, setDiaryEntries] = useState(() => DiaryStorage.ensureSeeds('en'));
    const [viewingEntry, setViewingEntry] = useState(null);
    
    // v11: 切換朗讀（按一次開始，再按停止）
    const toggleReadAloud = (target, text) => {
        if (readingTarget === target) {
            // 正在唸這個，停止
            stopLongText();
            setReadingTarget('none');
        } else {
            // 開始唸新的（會自動停掉之前的）
            stopLongText();
            setReadingTarget(target);
            speakLongText(text, lang, () => setReadingTarget('none'));
        }
    };
    
    const chatAreaRef = useRef(null);
    const recognitionRef = useRef(null);
    // silenceTimerRef 已被 autoSendRef 取代（見連續聆聯模式）
    const typewriterRef = useRef(null);
    const inputRef = useRef(null);

    // ===== v9: 圖片處理函式 =====
    // 點相機按鈕 → 觸發隱藏的 file input
    const handleCameraClick = () => {
        if (imageInputRef.current) imageInputRef.current.click();
    };

    // 選完圖片後：讀取 + 壓縮 + 存到 state
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // 限制檔案大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert(lang === 'zh-TW' ? '圖片太大了（上限 10MB）' : 'Image too large (max 10MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            // 壓縮圖片：縮到最大 800px，降低 base64 大小
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let { width, height } = img;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                
                const mimeType = file.type || 'image/jpeg';
                const quality = mimeType === 'image/png' ? 1.0 : 0.8;
                const dataUrl = canvas.toDataURL(mimeType, quality);
                const base64 = dataUrl.split(',')[1];
                
                setPendingImage({
                    base64,
                    mimeType,
                    previewUrl: dataUrl  // 用壓縮後的預覽
                });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        
        // 重設 input，讓同一張圖可以再選一次
        e.target.value = '';
    };

    // 清除待送圖片
    const clearPendingImage = () => setPendingImage(null);

    // ===== 打字機效果 =====
    const typewriterEffect = useCallback((text, onComplete) => {
        setIsTypewriting(true);
        setInputText('');
        let index = 0;
        const speed = 50;
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        typewriterRef.current = setInterval(() => {
            if (index < text.length) {
                setInputText(text.substring(0, index + 1));
                index++;
            } else {
                clearInterval(typewriterRef.current);
                typewriterRef.current = null;
                setIsTypewriting(false);
                if (onComplete) onComplete();
            }
        }, speed);
    }, []);

    // ===== 重置 =====
    const resetConversation = () => {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        window.speechSynthesis?.cancel();
        setMessages([{ role: 'ai', content: t.greeting(userName, aiName) }]);
        setConversationHistory([]);
        setNovaMessages([]);
        setGeneratedDiary(null);
        setAiReverseDiary(null);
        setTestStep(0);
        setTurnCount(0);
        setCatEmotion('happy');
        setDiaryReady(false);
        setIsTypewriting(false);
        setInputText('');
        setIsSpeaking(false);
    };

    // ===== 語言切換 =====
    useEffect(() => {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        window.speechSynthesis?.cancel();
        const localAiName = lang === 'zh-TW' ? '小粉' : 'Pinky';
        const localUserName = lang === 'zh-TW' ? 'Baby' : 'Sweetie';
        setAiName(localAiName);
        setUserName(localUserName);
        setMessages([{ role: 'ai', content: TRANSLATIONS[lang].greeting(localUserName, localAiName) }]);
        setTestStep(0); setTurnCount(0);
        setGeneratedDiary(null); setAiReverseDiary(null);
        setConversationHistory([]); setNovaMessages([]);
        setDiaryReady(false); setIsTypewriting(false);
        setInputText(''); setIsSpeaking(false);
    }, [lang]);

    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'ai') {
            setMessages([{ role: 'ai', content: t.greeting(userName, aiName) }]);
        }
    }, [userName, aiName]);

    // ===== Test Mode 自動打字機 =====
    useEffect(() => {
        if (testMode && !isLoading && !isTypewriting && testStep < TEST_CONVERSATIONS[lang].length && !generatedDiary) {
            const timer = setTimeout(() => {
                const nextText = TEST_CONVERSATIONS[lang][testStep].user;
                typewriterEffect(nextText);
            }, testStep === 0 ? 1200 : 800);
            return () => clearTimeout(timer);
        }
    }, [testMode, testStep, isLoading, isTypewriting, lang, generatedDiary, typewriterEffect]);

    // ===== 語音辨識（連續聆聽模式）=====
    // 設計：按一次麥克風開始 → 持續聆聽 → 說完一句自動送出 → 繼續聽下一句
    // AI 說話時自動暫停辨識（避免收到 AI 的聲音），說完自動恢復
    // 再按一次麥克風才會關閉
    // v12.1: + mic warm-up + 啟動延遲偵測 + debug log
    const voiceModeRef = useRef(false);      // 語音模式是否開啟（使用者意圖）
    const autoSendRef = useRef(null);         // 自動送出計時器
    const pendingTextRef = useRef('');         // 暫存已辨識的文字
    const micWarmedUpRef = useRef(false);     // v12.1: mic 是否已預熱
    const retryCountRef = useRef(0);          // v12.1: 啟動重試計數

    // v12.1 debug: 在畫面右下角顯示 SR 事件 log（疊在版本號上方）
    const [srDebugLog, setSrDebugLog] = useState([]);
    const [srDebugExpanded, setSrDebugExpanded] = useState(false);  // 預設收起
    const [bgmPlaying, setBgmPlaying] = useState(false);           // v12.1: BGM 開關狀態
    const srLog = (msg) => {
        const ts = new Date().toLocaleTimeString('en', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits:3});
        const line = `${ts} ${msg}`;
        console.log(`🎙️ SR: ${line}`);
        setSrDebugLog(prev => [...prev.slice(-8), line]);  // 保留最近 9 條
    };

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SR();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = lang === 'zh-TW' ? 'zh-TW' : 'en-US';

            // 收到辨識結果（v11 修正：只讀最新結果）
            recognitionRef.current.onresult = (event) => {
                clearTimeout(autoSendRef.current);
                let finalT = '', interimT = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const tr = event.results[i][0].transcript;
                    if (event.results[i].isFinal) finalT += tr; else interimT += tr;
                }
                if (finalT) {
                    const existing = pendingTextRef.current;
                    const updated = existing + finalT;
                    setInputText(updated + interimT);
                    pendingTextRef.current = updated;
                    srLog(`final: "${finalT.substring(0,30)}..."`);
                } else {
                    setInputText(pendingTextRef.current + interimT);
                }
                if (finalT.trim()) {
                    autoSendRef.current = setTimeout(() => {
                        if (pendingTextRef.current.trim() && voiceModeRef.current) {
                            document.dispatchEvent(new CustomEvent('voiceAutoSend'));
                        }
                    }, 2500);
                }
            };

            // v12.1: 細分 SR 生命週期事件 + 啟動延遲偵測
            recognitionRef.current.onstart = () => {
                srLog('onstart');
                setStatusMessage(lang === 'zh-TW' ? '🎤 啟動中...' : '🎤 Starting...');
                // 800ms 內沒收到 onaudiostart → stop + 300ms + retry 一次
                retryCountRef.current = 0;
                recognitionRef.current._warmupTimer = setTimeout(() => {
                    if (voiceModeRef.current && retryCountRef.current === 0) {
                        srLog('⚠️ 800ms no audio → retry');
                        retryCountRef.current = 1;
                        try { recognitionRef.current.stop(); } catch(e) {}
                        setTimeout(() => {
                            if (voiceModeRef.current && recognitionRef.current) {
                                try { recognitionRef.current.start(); srLog('retry start'); } catch(e) { srLog('retry fail: ' + e.message); }
                            }
                        }, 300);
                    }
                }, 800);
            };

            recognitionRef.current.onaudiostart = () => {
                srLog('onaudiostart ✓');
                clearTimeout(recognitionRef.current._warmupTimer);
                setStatusMessage(lang === 'zh-TW' ? '🎤 可以說話了！' : '🎤 Speak now!');
            };

            recognitionRef.current.onspeechstart = () => {
                srLog('onspeechstart 🗣️');
                setStatusMessage(lang === 'zh-TW' ? '🎤 聆聽中...' : '🎤 Listening...');
                fadeBgmTo(BGM_MIN_VOL, 500);  // 說話時淡出音樂
            };

            recognitionRef.current.onspeechend = () => {
                srLog('onspeechend');
                fadeBgmTo(BGM_BASE_VOL, 900);  // 說完淡回
            };
            recognitionRef.current.onaudioend = () => { srLog('onaudioend'); };

            // 辨識結束：語音模式開著就自動重啟（連續聆聽核心）
            recognitionRef.current.onend = () => {
                srLog('onend');
                clearTimeout(recognitionRef.current._warmupTimer);
                if (voiceModeRef.current) {
                    setTimeout(() => {
                        if (voiceModeRef.current && recognitionRef.current) {
                            try { recognitionRef.current.start(); } catch(e) { srLog('restart fail: ' + e.message); }
                        }
                    }, 300);
                } else {
                    setStatusMessage(''); setIsRecording(false);
                }
            };

            recognitionRef.current.onerror = (e) => {
                srLog(`onerror: ${e.error}`);
                clearTimeout(recognitionRef.current._warmupTimer);
                if (e.error === 'not-allowed') {
                    setStatusMessage('🔒 請允許麥克風權限');
                    setTimeout(() => setStatusMessage(''), 3000);
                    voiceModeRef.current = false; setIsRecording(false);
                } else if (e.error === 'no-speech' || e.error === 'aborted') {
                    // 正常情況，onend 會自動重啟
                } else {
                    setStatusMessage('⚠️ ' + e.error);
                    setTimeout(() => setStatusMessage(''), 3000);
                }
            };
        }
        return () => { voiceModeRef.current = false; if (recognitionRef.current) { clearTimeout(recognitionRef.current._warmupTimer); recognitionRef.current.stop(); } };
    }, [lang]);

    // 語音自動送出事件監聽
    useEffect(() => {
        const handleAutoSend = () => {
            const text = pendingTextRef.current.trim();
            if (text) {
                setInputText(text);
                pendingTextRef.current = '';
                setTimeout(() => {
                    const btn = document.querySelector('.send-btn');
                    if (btn && !btn.disabled) btn.click();
                }, 100);
            }
        };
        document.addEventListener('voiceAutoSend', handleAutoSend);
        return () => document.removeEventListener('voiceAutoSend', handleAutoSend);
    }, [messages, lang, isLoading]);

    useEffect(() => {
        if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }, [messages, generatedDiary, diaryReady]);

    // AI 說話時暫停辨識，說完自動恢復
    useEffect(() => {
        if (isSpeaking && recognitionRef.current && voiceModeRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            setStatusMessage('🔊 小粉說話中...');
        }
        // v12.1: AI 說話時也淡出 BGM
        if (isSpeaking) { fadeBgmTo(BGM_MIN_VOL, 400); }
        else if (bgmPlaying) { fadeBgmTo(BGM_BASE_VOL, 800); }

        if (!isSpeaking && voiceModeRef.current && !isLoading) {
            setTimeout(() => {
                if (voiceModeRef.current && recognitionRef.current) {
                    try {
                        recognitionRef.current.start();
                        setIsRecording(true);
                    } catch(e) {}
                }
            }, 500);
        }
    }, [isSpeaking, isLoading]);

    const stopRecording = () => {
        voiceModeRef.current = false;
        clearTimeout(autoSendRef.current);
        clearTimeout(recognitionRef.current?._warmupTimer);
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} }
        setIsRecording(false); setCatEmotion('happy'); setStatusMessage(''); pendingTextRef.current = '';
        srLog('stopped by user');
    };

    // v12.1: mic warm-up → 預先取得麥克風權限，減少首次啟動延遲
    const warmUpMic = async () => {
        if (micWarmedUpRef.current) return;
        try {
            srLog('mic warm-up...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            micWarmedUpRef.current = true;
            srLog('mic warm-up ✓');
        } catch (e) {
            srLog('mic warm-up fail: ' + e.message);
        }
    };

    const toggleRecording = async () => {
        if (isSpeaking || isTypewriting) return;
        if (isRecording || voiceModeRef.current) { stopRecording(); return; }
        if (recognitionRef.current) {
            await warmUpMic();
            voiceModeRef.current = true;
            recognitionRef.current.lang = lang === 'zh-TW' ? 'zh-TW' : 'en-US';
            setIsRecording(true); setCatEmotion('thinking'); setInputText(''); pendingTextRef.current = '';
            recognitionRef.current.start();
        }
    };

    // ===== 語音播放（瀏覽器 TTS）=====
    const speakText = (text) => {
        if (isRecording) stopRecording();
        setIsSpeaking(true);
        speakWithBrowserTTS(text, lang, () => setIsSpeaking(false));
    };

    // ================================================================
    //                       sendMessage 主邏輯
    // ================================================================
    const sendMessage = async () => {
        // v9: 允許只有圖片沒有文字（預設提示詞）
        const hasImage = !!pendingImage;
        if (!inputText.trim() && !hasImage) return;
        if (isLoading || isTypewriting) return;
        
        const userMessage = inputText.trim() || (hasImage 
            ? (lang === 'zh-TW' ? '幫我看看這張照片' : 'What do you see in this photo?')
            : '');
        const currentImage = pendingImage;  // 抓住當前圖片
        
        setInputText(''); setIsLoading(true); setCatEmotion('thinking');
        setPendingImage(null);  // 清除預覽

        // v9: messages 裡存圖片 previewUrl 給對話氣泡顯示用
        const userMsgObj = hasImage 
            ? { role: 'user', content: userMessage, imageUrl: currentImage.previewUrl }
            : { role: 'user', content: userMessage };
        
        const newMessages = [...messages, userMsgObj];
        setMessages(newMessages);
        const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
        setConversationHistory(newHistory);
        const newTurnCount = turnCount + 1;
        setTurnCount(newTurnCount);

        // 手動觸發日記
        const diaryKeywords = ['生成日記', '寫日記', '整理日記', '記錄', '日記', 'write diary', 'diary'];
        if (diaryKeywords.some(k => userMessage.toLowerCase().includes(k))) {
            await generateDiary();
            return;
        }

        // ========================
        //       TEST MODE
        // ========================
        if (testMode) {
            if (testStep >= TEST_CONVERSATIONS[lang].length) {
                await generateDiary();
                return;
            }
            const currentStep = testStep;
            setTimeout(() => {
                const response = TEST_CONVERSATIONS[lang][currentStep].ai;
                setMessages([...newMessages, { role: 'ai', content: response }]);
                setConversationHistory([...newHistory, { role: 'ai', content: response }]);
                setCatEmotion('happy');
                setTestStep(currentStep + 1);
                speakText(response);
                setIsLoading(false);
                if (currentStep + 1 >= TEST_CONVERSATIONS[lang].length) {
                    setTimeout(() => generateDiary(), 2000);
                }
            }, 600);
            return;
        }

        // ========================
        //    LIVE MODE (Nova 2 Lite)
        // ========================
        try {
            const promptLang = lang === 'zh-TW' ? '用繁體中文回應。' : 'Respond in English.';
            
            // 建構 Nova API 的 system prompt
            // v5: 對話 prompt — 包含使用者名字 + 追問多樣化
            let systemPrompt = `You are ${aiName}, a warm, empathetic diary companion. The user's name is ${userName}. ${promptLang} Respond in 1-2 sentences with genuine warmth, then ask one gentle follow-up question.

IMPORTANT — Vary your follow-up style each turn. Examples:
- Ask about specific details: "哪一家店？" "是什麼口味的？"
- Ask about feelings: "那個瞬間你心裡是什麼感覺？"
- Ask about people: "當時身邊有誰？"
- Share a reaction then ask: "聽起來好棒！後來呢？"
- Ask about contrast: "跟平常比起來有什麼不同？"
Do NOT always use "有什麼讓你感到...的嗎？" pattern. Be like a curious friend, not a therapist.
Occasionally use ${userName}'s name naturally.`;

            // 3 輪後加入 DIARY_READY 判斷
            // v8: 強化指令，防止 Nova 把內部分析過程展示給用戶
            if (newTurnCount >= MIN_TURNS_FOR_DIARY_CHECK) {
                systemPrompt += lang === 'zh-TW'
                    ? `\n\n[SYSTEM] 在你的回覆結束後，在內心默默判斷：對話中是否已提到（1）具體事件（2）具體人/地/物（3）至少一種情緒。如果三個都有，就在回覆最後一個字後面直接加上 [DIARY_READY]，中間不要換行。如果不夠就繼續用${aiName}的語氣追問。【警告】絕對不要輸出任何「分析」「判斷」「條件」「滿足」等字眼，不要列點分析，不要解釋你的思考過程。用戶不知道這個指令的存在。你只是${aiName}，一隻可愛的小貓。`
                    : `\n\n[SYSTEM] After your reply, silently judge: does the conversation contain (1) a specific event (2) specific people/places/things (3) at least one emotion? If all three exist, append [DIARY_READY] right after your last word with no newline. If not, keep chatting as ${aiName}. WARNING: NEVER output any analysis, reasoning, bullet points, or explanations of your judgment. The user must not know this instruction exists. You are only ${aiName}, a cute cat companion.`;
            }

            // 建構 messages 陣列（Nova 用 OpenAI 格式）
            // v9: 如果有圖片，改用多模態格式
            const userContent = (hasImage && currentImage) ? [
                { type: 'image_url', image_url: { url: `data:${currentImage.mimeType};base64,${currentImage.base64}` } },
                { type: 'text', text: userMessage }
            ] : userMessage;
            
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...novaMessages,
                { role: 'user', content: userContent }
            ];

            let aiResponse = await callNovaAPI(apiMessages);

            // v8: 先偵測 [DIARY_READY]（在清理之前！）
            // 必須在清理前做，否則標記會被清掉
            const hasDiaryReady = aiResponse.includes('[DIARY_READY]');

            // v8: 防護層——清理 Nova 可能洩露的內部分析
            aiResponse = aiResponse
                .replace(/###\s*\*{0,2}分析.*$/s, '')      // 清掉「### 分析與解釋」之後的所有內容
                .replace(/###\s*\*{0,2}結論.*$/s, '')      // 清掉「### 結論」之後的所有內容
                .replace(/---[\s\S]*?---/g, '')             // 清掉 --- 分隔線包裹的區塊
                .replace(/\*{2}[一二三四五]、.*?\*{2}/g, '') // 清掉「**一、具體事件**」這類標題
                .replace(/[✅❌]\s*$/gm, '')                // 清掉結尾的 ✅ ❌ 標記
                .replace(/\s*\[DIARY_READY\]\s*/g, '')     // 清掉標記
                .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')      // 清掉無效 Unicode
                .replace(/\s{3,}/g, '\n\n')                 // 多餘空行壓縮
                .trim();

            // 觸發日記按鈕
            if (hasDiaryReady) {
                setDiaryReady(true);
                setCatEmotion('surprise');
                setTimeout(() => setCatEmotion('happy'), 2000);
            }

            // 更新 Nova messages 歷史
            const updatedNovaMessages = [
                ...novaMessages,
                { role: 'user', content: userMessage },
                { role: 'assistant', content: aiResponse }
            ];
            setNovaMessages(updatedNovaMessages);

            setMessages([...newMessages, { role: 'ai', content: aiResponse }]);
            setConversationHistory([...newHistory, { role: 'ai', content: aiResponse }]);
            setCatEmotion('happy');
            speakText(aiResponse);
        } catch (error) {
            setMessages([...newMessages, { role: 'ai', content: t.error + error.message }]);
            setCatEmotion('sad');
        }
        setIsLoading(false);
    };

    // ================================================================
    //                       日記生成（Nova 2 Lite）
    // ================================================================
    const generateDiary = async () => {
        setIsLoading(true); setCatEmotion('thinking');
        setMessages(prev => [...prev, { role: 'ai', content: t.generating }]);

        if (testMode) {
            setTimeout(() => {
                setGeneratedDiary(TEST_DIARY[lang].diary);
                setAiReverseDiary(TEST_DIARY[lang].letter);
                setCatEmotion('love');
                setDiaryReady(false);
                setIsLoading(false);
            }, 1200);
            return;
        }

        try {
            // 只提取使用者說的內容作為日記素材（不含 AI 回覆）
            const userWords = conversationHistory
                .filter(m => m.role === 'user')
                .map(m => m.content)
                .join('\n');
            const diaryLang = lang === 'zh-TW' ? '用繁體中文寫' : 'Write in English';
            
            // ===== 用 Nova 生成日記 =====
            // 重點：只餵使用者說的話，避免 AI 把自己的問句也寫進日記
            // v4.1: 加入使用者名字、強化不編造指令、修正標題格式
            const todayDate = new Date().toLocaleDateString(lang === 'zh-TW' ? 'zh-TW' : 'en-US', 
                { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            const diaryPrompt = lang === 'zh-TW'
                ? `你是一位專業的日記代筆人。使用者名叫「${userName}」。今天是 ${todayDate}。
請根據以下「使用者親口說的話」，為他們寫一篇約300-400字的日記。

【最重要的規則——不要編造】
- 使用者只說了：買東西、吃好吃的、草莓。那日記就只能寫這些。
- 絕對不要加入使用者沒說過的場景描述（例如：陽光明媚、走在街道上、坐在陽台上）
- 絕對不要編造使用者的行為細節（例如：挑選零食、把東西放好）
- 如果使用者的素材很少，就寫短一點（200字也可以），不要用廢話湊字數

【其他規則】
1. 第一人稱「我」的視角——你就是${userName}，寫內心獨白
2. 不要出現「朋友問我」「她說」——這是日記，不是對話記錄
3. 把零散的話語整理成溫暖的敘述，但不要過度修飾
4. 語氣自然真誠，像寫給未來的自己看
5. 開頭直接用日期開始，例如：「${todayDate}」然後換行寫正文
6. 不要加「###」或任何 markdown 標記`
                : `You are a professional diary ghostwriter. The user's name is "${userName}". Today is ${todayDate}.
Based on the user's own words below, write a diary entry in first person.

=== GOLDEN RULE ===
You are a ghostwriter, not a novelist. Your job is to take the user's raw fragments and weave them into a coherent, warm diary entry — but you must STAY WITHIN what they told you.

WHAT YOU CAN DO:
- Connect their fragments into flowing sentences and paragraphs
- Add transitional phrases ("After that...", "By the time I...")
- Express how events LIKELY felt based on what they said (e.g., if they said "felt tired" you can write "exhaustion weighed on me")
- Add a brief, natural closing thought that summarizes the mood of the day

WHAT YOU MUST NOT DO:
- Invent events, plans, or actions the user never mentioned
- Add sensory details they didn't describe (weather, smells, sounds)
- Put future plans in their mouth ("I'll try to..." — unless they said it)
- Add philosophical reflections or life lessons they didn't express
- Pad with filler if material is sparse — a 100-word diary is perfectly fine

OTHER RULES:
1. First person "I" perspective — you ARE ${userName}
2. No "my friend asked me" or "she said" — diary, not transcript
3. Start with today's date: "${todayDate}" then the entry
4. No markdown headers like ### or **`;

            let diary = await callNovaAPI([
                { role: 'system', content: `${diaryPrompt}` },
                { role: 'user', content: `使用者說的話 / User's own words:\n${userWords}\n\n請根據以上內容寫日記 / Write the diary based on above:` }
            ], 0.6, 2048);  // v12.1: temperature 0.6 — 平衡溫度與約束
            // v5: 程式端清理 — 移除 Nova 可能加入的 markdown 標記
            diary = diary.replace(/^#{1,4}\s*.{0,20}\n*/gm, '')  // 移除 ### 標題行
                        .replace(/\*\*/g, '')                     // 移除 ** 粗體
                        .replace(/^\s*---\s*$/gm, '')             // 移除分隔線
                        .trim();
            setGeneratedDiary(diary);
            
            // ===== 用 Nova 生成小粉回信 =====
            // v7: 回信大幅升級——從「簡短紙條」變成「溫暖長信」
            // 核心理念：使用者花了很多時間聊心裡話，回信要配得上這份信任
            const letterPrompt = lang === 'zh-TW'
                ? `你是${aiName}，一隻溫暖的粉色小貓，也是${userName}最信任的朋友。你剛剛陪${userName}聊了一段天，現在要根據日記寫一封溫暖的回信。

【最重要的原則】
${userName}花了很多時間跟你說心裡話，你的回信要配得上這份信任。不要敷衍，要讓${userName}感覺到被認真對待、被理解、被珍惜。

【字數】200-300字。跟日記長度匹配，不要太短。

【開頭】用「親愛的 ${userName}：」

【內容結構】（每段 2-3 句）
1. 回應日記中最讓你印象深刻的一件事，說說你的感受（例如：「聽你說...的時候，我能感覺到你...」）
2. 挑出${userName}說過的一句話或一個想法，用你自己的話延伸它、昇華它（例如：他說「人心不變」→ 你可以說「能說出這種話的人，一定有一顆很溫柔的心」）
3. 表達你對${userName}的珍惜和支持（例如：「能陪你聊天是我最開心的事」「不管什麼時候，我都在」）
4. 溫暖的收尾祝福（例如：「今天好好休息，你值得被好好對待」）

【語氣】
- 像閨蜜寫的暖心長信，不是制式的「加油」
- 可以表達你自己的情感（開心、心疼、感動、佩服）
- 用「我」來表達感受：「我好開心」「我有點心疼」「我覺得你好棒」

【結尾】用「永遠支持你的，\n${aiName}」結束

【禁止】
- 不要用「讀到」「看到你的日記」——你是跟${userName}聊天的人
- 不要只說「加油」就結束
- 不要泛泛而談，要提到日記裡的具體細節`
                : `You are ${aiName}, a warm pink cat companion and ${userName}'s most trusted friend. Write a heartfelt letter responding to their diary.

MOST IMPORTANT: ${userName} shared their heart with you. Your letter must honor that trust. Make them feel truly seen, understood, and cherished.

LENGTH: 200-300 words. Match the diary's length. Never too short.

START WITH: "Dear ${userName},"

STRUCTURE (2-3 sentences each):
1. Respond to the most memorable thing from the diary with YOUR feelings ("When you told me about... I could feel...")
2. Pick one quote or thought from ${userName} and elevate it in your own words
3. Express how much you treasure ${userName} ("Being here for you means everything to me")
4. Warm closing wish ("Rest well tonight, you deserve it")

TONE: Like a best friend's heartfelt letter. Express YOUR emotions (happy, touched, proud, a little worried). Use "I feel..." and "I think you're amazing because..."

END WITH: "Always here for you,\n${aiName}"

BANNED: Never use "reading your diary" or "from your words". Never end with just "hang in there". Be specific, reference real details.`;

            const letter = await callNovaAPI([
                { role: 'system', content: letterPrompt },
                { role: 'user', content: `日記 / Diary:\n${diary}\n\n請寫回信 / Write the letter:` }
            ], 0.8, 1024);  // v7: 從 512 增到 1024，讓回信有足夠空間寫長
            // v8: 清理回信中的無效 Unicode（修復 ��� 亂碼）
            const cleanLetter = letter.replace(/[\uFFFD\uFFFE\uFFFF]/g, '').trim();
            setAiReverseDiary(cleanLetter);

            // ===== v6: 用 Nova 萃取畫面 → Pollinations 生成配圖 =====
            // 流程：日記 → Nova 提取一句英文場景描述 → Pollinations 免費生圖
            try {
                const imagePromptText = await callNovaAPI([
                    { role: 'system', content: `You are an image prompt generator. Read the diary below and describe ONE warm, cozy scene from it in a single English sentence (max 30 words). Style: soft watercolor illustration, warm pastel colors, gentle lighting, Studio Ghibli inspired. Do NOT include any text or words in the image. Do NOT include any people's faces clearly. Focus on objects, scenery, food, animals, or atmospheric mood.` },
                    { role: 'user', content: `Diary:\n${diary}\n\nWrite ONE image prompt:` }
                ], 0.9, 100);
                
                // 組合 Pollinations URL（免費，無需 API key，直接用 img src）
                const cleanPrompt = imagePromptText
                    .replace(/["\n\r]/g, ' ')  // 移除引號和換行
                    .replace(/^(image prompt:|prompt:)/i, '')  // 移除可能的前綴
                    .trim()
                    .substring(0, 200);  // 限制長度避免 URL 過長
                const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=400&nologo=true`;
                setDiaryImageUrl(pollinationsUrl);
                console.log('🎨 配圖 prompt:', cleanPrompt);
            } catch (imgError) {
                // 配圖失敗不影響日記，靜默忽略
                console.warn('配圖生成失敗（不影響日記）:', imgError.message);
                setDiaryImageUrl(null);
            }

            setCatEmotion('love');
            setDiaryReady(false);
            
            // v12: 自動存檔到 localStorage
            const newEntry = {
                id: `diary_${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                formattedDate: getFormattedDate(lang),
                lang: lang,
                diary: diary,
                letter: cleanLetter,
                imageUrl: diaryImageUrl || null,
                userName: userName,
                aiName: aiName,
                emotion: null  // 預留：之後由情感分析填入
            };
            const updated = DiaryStorage.save(newEntry);
            setDiaryEntries(updated);
            console.log('📚 日記已自動存檔:', newEntry.id);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: t.error + error.message }]);
            setCatEmotion('sad');
        }
        setIsLoading(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setStatusMessage(t.copied);
        setTimeout(() => setStatusMessage(''), 2000);
    };

    const closeAllMenus = () => { setShowLangMenu(false); setShowAiNameInput(false); setShowUserNameInput(false); };

    const toolbarItems = [
        { id: 'lang', icon: 'M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z', tip: 'Language' },
        { id: 'voice', icon: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z', tip: bgmPlaying ? '🔊 BGM On' : '🔇 BGM Off' },
        // v8: 手動寫日記按鈕——用戶隨時可以按，不需要等 AI 自動觸發
        { id: 'diary', icon: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z', tip: lang === 'zh-TW' ? '寫日記 📖' : 'Write Diary 📖' },
        { id: 'gallery', icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z', tip: 'Gallery (Soon)' },
        { id: 'history', icon: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z', tip: lang === 'zh-TW' ? '日記本 📚' : 'My Diaries 📚' },
        { id: 'aiName', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z', tip: 'AI Name' },
        { id: 'userName', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', tip: 'Your Name' },
        { id: 'reset', emoji: '🧹', tip: 'New Diary' },
    ];

    const getPlaceholder = () => {
        if (isRecording) return t.listening;
        if (isTypewriting) return '';
        if (testMode && inputText && !isLoading) return t.enterHint;
        return t.placeholder;
    };

    // ===== 小粉顯示元件 =====
    const PinkyMascot = () => (
        <div className="cat-mascot">
            {usePinkyImages && PINKY_IMAGES[catEmotion] ? (
                <img src={PINKY_IMAGES[catEmotion]} alt={`Pinky ${catEmotion}`} />
            ) : (
                <span className="emoji-fallback">{PINKY_EMOJI[catEmotion] || '😺'}</span>
            )}
        </div>
    );

    return (
        <div className="app-container">
            <div className="header">
                <div className="logo">MoodBloom</div>
                {/* badge removed */}
                {statusMessage && <div className="status-bar">{statusMessage}</div>}
            </div>
            <div className="version-tag">v12.2</div>
            {/* v12.1: SR debug log — collapsible, top-right */}
            {srDebugLog.length > 0 && (
                <React.Fragment>
                    <div className="sr-debug-toggle" onClick={() => setSrDebugExpanded(prev => !prev)}>
                        {srDebugExpanded ? '✕' : '🐞'}
                    </div>
                    {srDebugExpanded && (
                        <div className="sr-debug-log">
                            {srDebugLog.slice(-3).map((line, i) => <div key={i}>{line}</div>)}
                        </div>
                    )}
                </React.Fragment>
            )}
            
            <div className="toolbar">
                {toolbarItems.map((item) => (
                    <div key={item.id} 
                        className={`tool-btn ${(item.id === 'lang' && showLangMenu) || (item.id === 'aiName' && showAiNameInput) || (item.id === 'userName' && showUserNameInput) || (item.id === 'voice' && bgmPlaying) ? 'active' : ''}`}
                        onClick={() => {
                            if (item.id === 'lang') { closeAllMenus(); setShowLangMenu(!showLangMenu); }
                            // v12.1: BGM 開關
                            else if (item.id === 'voice') {
                                const bgm = getBgm();
                                if (bgm) {
                                    if (bgmPlaying) {
                                        fadeBgmTo(0, 500);
                                        setTimeout(() => { bgm.pause(); }, 550);
                                        setBgmPlaying(false);
                                    } else {
                                        bgm.volume = 0;
                                        bgm.play().then(() => {
                                            fadeBgmTo(BGM_BASE_VOL, 500);
                                            setBgmPlaying(true);
                                        }).catch(() => {});
                                    }
                                }
                            }
                            // v8: 手動寫日記按鈕 — 至少聊 2 輪才能觸發
                            else if (item.id === 'diary') {
                                if (messages.length < 4) {
                                    alert(lang === 'zh-TW' ? '再多聊幾句，讓小粉更了解你今天的故事吧！🐱' : 'Chat a bit more so I can write a better diary for you! 🐱');
                                } else if (generatedDiary) {
                                    setShowDiaryModal(true);
                                } else {
                                    setDiaryReady(true);
                                    generateDiary();
                                }
                            }
                            else if (item.id === 'aiName') { closeAllMenus(); setShowAiNameInput(!showAiNameInput); setTempName(aiName); }
                            else if (item.id === 'userName') { closeAllMenus(); setShowUserNameInput(!showUserNameInput); setTempName(userName); }
                            else if (item.id === 'history') { closeAllMenus(); setDiaryEntries(DiaryStorage.load()); setShowDiaryHistory(true); }
                            else if (item.id === 'reset') { resetConversation(); }
                        }}>
                        {item.emoji ? <span className="emoji">{item.emoji}</span> : <svg viewBox="0 0 24 24"><path d={item.icon}/></svg>}
                        <span className="tooltip">{item.tip}</span>
                        
                        {item.id === 'lang' && (
                            <div className={`dropdown-menu ${showLangMenu ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                                <div className={`dropdown-item ${lang === 'en' ? 'active' : ''}`} onClick={() => { setLang('en'); setShowLangMenu(false); }}>English</div>
                                <div className={`dropdown-item ${lang === 'zh-TW' ? 'active' : ''}`} onClick={() => { setLang('zh-TW'); setShowLangMenu(false); }}>繁體中文</div>
                            </div>
                        )}
                        
                        {item.id === 'aiName' && (
                            <div className={`dropdown-menu name-input-popup ${showAiNameInput ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                                <label>AI Name</label>
                                <input value={tempName} onChange={e => setTempName(e.target.value)} 
                                    onKeyPress={e => { if (e.key === 'Enter' && tempName.trim()) { setAiName(tempName.trim()); setShowAiNameInput(false); }}} />
                                <button onClick={() => { if (tempName.trim()) setAiName(tempName.trim()); setShowAiNameInput(false); }}>{t.save}</button>
                            </div>
                        )}
                        
                        {item.id === 'userName' && (
                            <div className={`dropdown-menu name-input-popup ${showUserNameInput ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
                                <label>Your Name</label>
                                <input value={tempName} onChange={e => setTempName(e.target.value)}
                                    onKeyPress={e => { if (e.key === 'Enter' && tempName.trim()) { setUserName(tempName.trim()); setShowUserNameInput(false); }}} />
                                <button onClick={() => { if (tempName.trim()) setUserName(tempName.trim()); setShowUserNameInput(false); }}>{t.save}</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <PinkyMascot />
            
            <div className="chat-area" ref={chatAreaRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        {msg.imageUrl && <img src={msg.imageUrl} className="chat-image" alt="uploaded" />}
                        {msg.content}
                    </div>
                ))}
                {isLoading && <div className="message ai"><div className="loading"><span></span><span></span><span></span></div></div>}
                
                {diaryReady && !generatedDiary && (
                    <button className="diary-ready-btn" onClick={() => generateDiary()}>
                        {t.viewDiary}
                    </button>
                )}
                
                {generatedDiary && !showDiaryModal && (
                    <button className="diary-ready-btn" onClick={() => setShowDiaryModal(true)}>
                        {t.viewDiaryDone}
                    </button>
                )}
            </div>
            
            {showDiaryModal && (
                <div className="diary-modal" onClick={() => { setShowDiaryModal(false); stopLongText(); setReadingTarget('none'); }}>
                    <div className="diary-book" onClick={e => e.stopPropagation()}>
                        <div className="diary-header">
                            <h2>✦ · ✦ · ✦</h2>
                            <button className="diary-close" onClick={() => { setShowDiaryModal(false); stopLongText(); setReadingTarget('none'); }}>×</button>
                        </div>
                        <div className="diary-date">{getFormattedDate(lang)}</div>
                        {generatedDiary && (
                            <div style={{
                                textAlign: 'center', 
                                padding: '10px 20px 15px',
                                borderBottom: '1px solid #e8ddd0',
                                marginBottom: '15px',
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* v7: 配圖區域 — Pollinations 成功則顯示 AI 配圖，失敗則用小粉隨機表情 fallback */}
                                {diaryImageUrl ? (
                                    <React.Fragment>
                                        <div className="diary-img-loading" style={{
                                            color: '#b8a89a',
                                            fontSize: '0.9rem',
                                            padding: '30px 0'
                                        }}>🎨 {lang === 'zh-TW' ? '正在為你的日記畫一幅畫...' : 'Painting an illustration for your diary...'}</div>
                                        <img 
                                            src={diaryImageUrl} 
                                            alt="Diary illustration"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '280px',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                objectFit: 'cover',
                                                display: 'none'
                                            }}
                                            onLoad={(e) => { 
                                                e.target.style.display = 'block';
                                                const loading = e.target.parentNode.querySelector('.diary-img-loading');
                                                if (loading) loading.style.display = 'none';
                                                const fallback = e.target.parentNode.querySelector('.diary-img-fallback');
                                                if (fallback) fallback.style.display = 'none';
                                            }}
                                            onError={(e) => { 
                                                e.target.style.display = 'none';
                                                const loading = e.target.parentNode.querySelector('.diary-img-loading');
                                                if (loading) loading.style.display = 'none';
                                                const fallback = e.target.parentNode.querySelector('.diary-img-fallback');
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                        {/* Pinky fallback — 配圖失敗時顯示 */}
                                        <div className="diary-img-fallback" style={{
                                            display: 'none',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <img 
                                                src={PINKY_IMAGES[['happy','love','surprise'][Math.floor(Math.random()*3)]]} 
                                                alt="Pinky"
                                                style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                                            />
                                            <div style={{ fontSize: '0.8rem', color: '#e8a0bf', fontStyle: 'italic' }}>
                                                {lang === 'zh-TW' ? `${aiName} 陪你寫日記 💕` : `${aiName} is here for you 💕`}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <img 
                                            src={PINKY_IMAGES[['happy','love','surprise'][Math.floor(Math.random()*3)]]} 
                                            alt="Pinky"
                                            style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                                        />
                                        <div style={{ fontSize: '0.8rem', color: '#e8a0bf', fontStyle: 'italic' }}>
                                            {lang === 'zh-TW' ? `${aiName} 陪你寫日記 💕` : `${aiName} is here for you 💕`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="diary-content">
                            <div className="diary-page">
                                <h3>
                                    {t.myDiary}
                                    <button 
                                        className={`read-aloud-btn ${readingTarget === 'diary' ? 'reading' : ''}`}
                                        onClick={() => toggleReadAloud('diary', generatedDiary)}
                                        title={lang === 'zh-TW' ? '朗讀日記' : 'Read diary aloud'}
                                    >
                                        {readingTarget === 'diary' ? '⏹️' : '🔊'}
                                    </button>
                                </h3>
                                <p>{generatedDiary}</p>
                                <button className="copy-btn" onClick={() => copyToClipboard(generatedDiary)}>📋</button>
                            </div>
                            <div className="diary-page">
                                <h3 className="ai-title">
                                    {t.aiLetter(aiName)}
                                    <button 
                                        className={`read-aloud-btn ${readingTarget === 'letter' ? 'reading' : ''}`}
                                        onClick={() => toggleReadAloud('letter', aiReverseDiary)}
                                        title={lang === 'zh-TW' ? '朗讀回信' : 'Read letter aloud'}
                                    >
                                        {readingTarget === 'letter' ? '⏹️' : '🔊'}
                                    </button>
                                </h3>
                                <p>{aiReverseDiary}</p>
                                <button className="copy-btn" onClick={() => copyToClipboard(aiReverseDiary)}>📋</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* v12: 日記本——歷史日記列表 */}
            {showDiaryHistory && !viewingEntry && (
                <div className="diary-modal" onClick={() => setShowDiaryHistory(false)}>
                    <div className="diary-history-panel" onClick={e => e.stopPropagation()}>
                        <div className="diary-header">
                            <h2>{lang === 'zh-TW' ? '📚 我的日記本' : '📚 My Diaries'}</h2>
                            <button className="diary-close" onClick={() => setShowDiaryHistory(false)}>×</button>
                        </div>
                        <div className="diary-history-count">
                            {diaryEntries.length > 0 && (
                                <span>{lang === 'zh-TW' ? `共 ${diaryEntries.length} 篇日記` : `${diaryEntries.length} entries`}</span>
                            )}
                        </div>
                        <div className="diary-history-list">
                            {diaryEntries.length === 0 ? (
                                <div className="diary-history-empty">
                                    <span style={{fontSize: '3rem'}}>📖</span>
                                    <p>{lang === 'zh-TW' ? '還沒有日記喔～\n跟小粉聊聊天，寫下第一篇吧！' : 'No diaries yet~\nChat with Pinky and write your first one!'}</p>
                                </div>
                            ) : (
                                diaryEntries.map((entry) => (
                                    <div key={entry.id} className="diary-history-item" onClick={() => setViewingEntry(entry)}>
                                        <div className="diary-history-item-header">
                                            <span className="diary-history-item-date">{entry.formattedDate}</span>
                                            {entry.emotion && <span className="diary-history-item-emotion">{
                                                {frustrated:'😤', excited:'🎉', depressed:'😔', anxious:'😰', tired:'😴', 
                                                 'self-doubt':'🥺', peaceful:'☀️', lonely:'🌙', sick:'🤒', hopeful:'✨'}[entry.emotion] || '📝'
                                            }</span>}
                                        </div>
                                        <div className="diary-history-item-preview">
                                            {entry.diary.substring(0, 80).replace(/\n/g, ' ')}...
                                        </div>
                                        <button className="diary-history-item-delete" onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(lang === 'zh-TW' ? '確定要刪除這篇日記嗎？' : 'Delete this diary?')) {
                                                const updated = DiaryStorage.delete(entry.id);
                                                setDiaryEntries(updated);
                                            }
                                        }}>🗑️</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* v12: 查看歷史日記詳情 */}
            {viewingEntry && (
                <div className="diary-modal" onClick={() => { setViewingEntry(null); stopLongText(); setReadingTarget('none'); }}>
                    <div className="diary-book" onClick={e => e.stopPropagation()}>
                        <div className="diary-header">
                            <button className="diary-back-btn" onClick={() => { setViewingEntry(null); stopLongText(); setReadingTarget('none'); }}>
                                ← {lang === 'zh-TW' ? '返回日記本' : 'Back'}
                            </button>
                            <button className="diary-close" onClick={() => { setViewingEntry(null); setShowDiaryHistory(false); stopLongText(); setReadingTarget('none'); }}>×</button>
                        </div>
                        <div className="diary-date">{viewingEntry.formattedDate}</div>
                        <div className="diary-content">
                            <div className="diary-page">
                                <h3>
                                    {lang === 'zh-TW' ? '📖 我的日記' : '📖 My Diary'}
                                    <button 
                                        className={`read-aloud-btn ${readingTarget === 'diary' ? 'reading' : ''}`}
                                        onClick={() => toggleReadAloud('diary', viewingEntry.diary)}
                                    >
                                        {readingTarget === 'diary' ? '⏹️' : '🔊'}
                                    </button>
                                </h3>
                                <p>{viewingEntry.diary}</p>
                                <button className="copy-btn" onClick={() => copyToClipboard(viewingEntry.diary)}>📋</button>
                            </div>
                            <div className="diary-page">
                                <h3 className="ai-title">
                                    💕 {viewingEntry.aiName || (lang === 'zh-TW' ? '小粉' : 'Pinky')}{lang === 'zh-TW' ? '的回信' : "'s Letter"}
                                    <button 
                                        className={`read-aloud-btn ${readingTarget === 'letter' ? 'reading' : ''}`}
                                        onClick={() => toggleReadAloud('letter', viewingEntry.letter)}
                                    >
                                        {readingTarget === 'letter' ? '⏹️' : '🔊'}
                                    </button>
                                </h3>
                                <p>{viewingEntry.letter}</p>
                                <button className="copy-btn" onClick={() => copyToClipboard(viewingEntry.letter)}>📋</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* v9: 圖片預覽列 */}
            {pendingImage && (
                <div className="image-preview-bar">
                    <div className="image-preview-thumb">
                        <img src={pendingImage.previewUrl} alt="preview" />
                        <button className="image-preview-remove" onClick={clearPendingImage}>×</button>
                    </div>
                    <span className="image-preview-label">
                        {lang === 'zh-TW' ? '📷 準備送出' : '📷 Ready to send'}
                    </span>
                </div>
            )}
            
            <div className="input-area">
                {/* v9: 隱藏的 file input */}
                <input 
                    ref={imageInputRef}
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    style={{display: 'none'}}
                    onChange={handleImageSelect}
                />
                {/* v9: 相機按鈕 */}
                <button className="camera-btn" onClick={handleCameraClick} disabled={isLoading || isSpeaking || isTypewriting}>
                    <svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                </button>
                <div className="input-container">
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder={getPlaceholder()}
                        className={isTypewriting ? 'typewriter-active' : ''}
                        value={inputText} 
                        onChange={(e) => { if (!isTypewriting) setInputText(e.target.value); }}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
                        disabled={isLoading || isSpeaking} 
                    />
                </div>
                <button className={`mic-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording} disabled={isLoading || isSpeaking || isTypewriting}>
                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                </button>
                <button className="send-btn" onClick={sendMessage} disabled={isLoading || (!inputText.trim() && !pendingImage) || isTypewriting}>
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
            </div>
        </div>
    );
}
ReactDOM.render(<MoodBloom />, document.getElementById('root'));