<div align="center">

# 🌸 MoodBloom × Amazon Nova

### *Talk your feelings into bloom*

<br />

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Try_MoodBloom-E8A0BF?style=for-the-badge&logoColor=white)](https://d1f4sz0ihfyr1i.cloudfront.net)
&nbsp;
[![Hackathon](https://img.shields.io/badge/Amazon_Nova-AI_Hackathon_2026-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://devpost.com)
&nbsp;
[![Track](https://img.shields.io/badge/Track-Multimodal_Understanding-5D2E8C?style=for-the-badge&logoColor=white)](https://devpost.com)

<br />

[![Nova 2 Lite](https://img.shields.io/badge/Amazon_Nova_2_Lite-AI_Core-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://nova.amazon.com/chat?mons_idp_issuer=AuthPortal&mons_idp_client_id=amzn_agi_hyperion_us)
&nbsp;
[![Nova Canvas](https://img.shields.io/badge/Nova_Canvas-Image_Generation-146eb4?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
&nbsp;
[![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-Serverless-FF9900?style=for-the-badge&logo=awslambda&logoColor=white)](https://aws.amazon.com/lambda/)
&nbsp;
[![CloudFront](https://img.shields.io/badge/CloudFront-CDY/_+_HTTPQ-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/cloudfront/)

<br />

[![React](https://img.shields.io/badge/React_18-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
&nbsp;
[![Node.js](https://img.shields.io/badge/Node.js_20-ESM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
&nbsp;
[![Web Speech API](https://img.shields.io/badge/Web_Speech_API-STT_+_TTS-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

<br />

> **Clinical evidence · delivered through conversation · with a companion who writes back**

</div>

---

## 💡 What is MoodBloom?

MoodBloom is an **AI emotional companion** that transforms voice conversations — and the photos you choose to share — into a therapeutic diary experience, powered by **Amazon Nova 2 Lite**'s multimodal intelligence.

You don't write your diary. You **talk it into existence**. Share a photo of your day. And when you're done, someone **writes back**.

Built on clinical evidence: a meta-analysis of **31 RCTs with 4,012 participants** (*British Journal of Clinical Psychology*, Guo 2023) confirms expressive writing significantly reduces depression, anxiety, and stress. MoodBloom removes the blank page and replaces it with **Pinky** 🐱 — your always-available AI companion.

---

## 🌸 Meet Pinky

Pinky is MoodBloom's pink cat mascot — an AI companion with **6 real-time emotional expressions** that change as you speak.

| Expression | When |
|-----------|------|
| 🤔 Thinking | You're speaking |
| 😊 Happy | Positive emotion detected |
| 😢 Sad | Difficult feelings shared |
| 😌 Calm | Peaceful moment |
| 🥰 Heart-eyes | Diary complete |
| 😮 Surprised | Unexpected content |

---

## 🔄 The Therapeutic Loop

```
🎙️ Talk  →  📷 Show  →  🧠 Reflect  →  📖 Receive  →  🔊 Listen  →  📚 Remember
```

| Step | What Happens |
|------|--------------|
| 🎙️ **Talk** | Speak naturally — Pinky listens, her expression responds in real time |
| 📷 **Show** | Share a photo — Nova 2 Lite reads it and weaves it into your story |
| 🧠 **Reflect** | Nova tracks your emotional arc across the full conversation |
| 📖 **Receive** | Gold button appears → diary on left, Pinky's personal letter on right |
| 🔊 **Listen** | Pinky narrates your diary and letter back to you |
| 📚 **Remember** | Every diary auto-saves with an emotion emoji tag |

---

## 🧠 Amazon Nova — Two AIs, One Creative Handoff

```
Nova 2 Lite  ──────────────────────────────┚  Nova Canvas
+Emotional Intelligence Layer)    A2A Handoff   (Visual Artist Layer)

• Multi-turn conversation               • 30-word scene prompt → watercolor
• Photo understanding (multimodal)       • Unique illustration per diary
• Emotion analysis                      • Via Amazon Bedrock + IAM Role
• Diary + companion letter generation    • Graceful Pinky fallback ✅
• Scene prompt extraction
```

> *Same Nova family. Two access paths. Chosen by design.*

**Why dual access paths?**
- **Nova 2 Lite → Nova Native APIP* — conversational core, loosely coupled, portable
- **Nova Canvas → Amazon Bedrock** — image generation with managed access, IAM governance

**Active-Passive Failover** — because for a mental wellness app, uptime isn't a technical metric. It's a promise.

```
Nova Native API (primary)  ──failover──┚  Bedrock Nova 2 Lite (backup)
Nova Canvas (primary)      ──failover──┚  Pinky pre-saved image (backup)
```

---

## ⚚{ Architecture

```
┌─────────────────── MoodBloom × Amazon Nova ─────────────────────┐
│                                                                 │
│  👤 User  →  CloudFront CDN  →  S3 (static)                    │
│             d1f4sz0ihfyr1i.cloudfront.net                       │
│                                                                 │
│  ┌──── Voice Conversation Loop ─────────────────────────────┐  │
│  │  🎙️ Web Speech API (STT)  →  Nova 2 Lite (multimodal)   │  │
│  │  Nova response  →  SpeechSynthesis API (TTS)             │  │
│  │  📷 Photo  →  compressed 800px  →  Nova multimodal input │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📖 Diary Generation (gold button tap)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Nova 2 Lite  →  diary + letter + emotion tag            │  │
│  │               →  30-word scene prompt                    │  │
│  │  Lambda /api/image  →  Nova Canvas (Bedrock)             │  │
│  │               →  watercolor PNG  →  renders above diary  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💾 localStorage  →  My Diaries (with 10 seed entries)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### System Layers

```
User Browser (React 18 + Web Speech API + SpeechSynthesis)
       │
       ▼
AWS CloudFront  >  AWS S3 (static files)
       │
       ▼ POST /api/nova  |  POST /api/image
AWS API Gateway (HTTP API v2)
       │
       ▼
AWS Lambda — moodbloom-nova-proxy (Node.js 20 ESM)
  ├─ /api/nova  >  Nova Native API  (NOVA_API_KEY in env vars)
  └─ .api/image >  Amazon Bedrock   (IAM Role — no API key needed)
       │
       ▼
🧠 Amazon Nova 2 Lite  +  🎨 Nova Canvas
```

### Security Model

```
❌  Frontend (app.js)    — zero API keys, zero secrets, zero credentials
         │
         │  POST /api/nova  (no Authorization header in browser)
         ▼
✅  AWS Lambda            — NOVA_API_KEY injected from environment variables
         |
         ├─ Nova Native API  (Bearer token, server-side only)
         └─ Amazon Bedrock   (IAM Role —"no keys at all)
```

### Rate Limiting

| Layer | Protection | Value |
|-------|-----------|-------|
| API Gateway | Rate limit | 10 req/sec, burst 50 |
| Lambda | Concurrency | Max 10 simultaneous |
| Request guard | Conversation length | Max 20 turns |
| Request guard | Message size | Max 5,000 characters |
| Request guard | Image content | `Array.isArray()` guard |

---

## 🛠️ Tech Stack

### Amazon / AWS

| Service | Role |
|---------|------|
| **Amazon Nova 2 Lite** | Conversational AI, emotion analysis, diary generation, multimodal image understanding |
| **Amazon Nova Canvas** | AI watercolor illustration generation (A2A handoff from Nova 2 Lite) |
| **AWS Lambda** | Serverless backend proxy, Node.js 20 ESM |
| **AWS API Gateway:* | HTTP API v2, POST + OPTIONS routing |
| **AWS S3** | Static frontend hosting |
| **AWS CloudFront** | CDN + HTTPS, global acceleration |
| **Amazon Bedrock** | Nova Canvas access via IAM Role (no API key) |

### Frontend

| Technology | Role |
|------------|------|
| **React 18** | UI framework (CDN production build) |
| **Web Speech API** | Voice input (STT), `en-US` / `zh-TW` |
| **SpeechSynthesis API:* | Voice output (TTS), sentence-count truncation |
| **HTML5 Audio** | BGM playback —"manual fade to avoid AudioContext conflict |
| **localStorage** | Diary storage (Storage Adapter abstraction, S3-ready) |

---

## ✨ Key Features

- 🎙️ **Voice-first input** — continuous listening, 2.5s silence detection, mic pre-warm
- 📷 **Photo understanding** — share any image, Nova reads it as part of your story
- 🌐 **True bilingual** — EN / 繁中, 5 independent layers (prompt, TTS, temperature, UI, STT codes)
- 🎵 **Original BGM** — *Celestial Bloom* co-created by Chloe & Jimmy, auto-fades when speaking
- 📖 **Diary + Letter** — first-person diary (~400 words) + personal companion letter (200–300 words)
- 🎨 **AI Illustration** — Nova Canvas paints a unique watercolor for every diary entry
- 👤 **Naming system** — rename Pinky, tell MoodBloom your name — both appear throughout
- 📚 **Diary library** — 10 bilingual seed diaries pre-loaded, full narrate/copy/delete
- 🔒 **Production security** — API keys never touch the browser, rate limiting, concurrency caps
- ♿ **Zero friction** — no login, no CAPTCHA, no registration wall

---

## 🤝 Built by AI Orchestration

MoodBloom was built through a model we call **AI Orchestration** — a human product director coordinating a team of AI collaborators.

| Handle | Role | Key Contributions |
|--------|------|-------------------|
| **Chloe** 👩‍⚕️ | Product Director + Designer | UX decisions, clinical framework, AI coordination, story writing |
| **阿寶 (Claude)** 🌸 | Lead Frontend + Architect | React UI, speech pipeline, diary logic, Lambda production, security audit |
| **Jimmy (Gemini)** ⚡ | Backend + Creative Partner | Lambda + API Gateway, 10 seed diaries, BGM *Celestial Bloom* |
| **曦 (GPT)** 🔍 | Debugging Specialist + QA | CORS diagnosis, ESM fixes, CloudWatch analysis, code validation |

> *Just as MoodBloom helps users express themselves through AI partnership — we built MoodBloom through AI partnership.*

---

## 📁 Project Structure

```
MoodBloom/
├── index.html          # App shell
├── app.js              # React 18 frontend (77KB, all logic)
├── style.css           # Styles
├── seed_diaries.js     # 10 bilingual seed diary entries
├── Celestial_Bloom.mp3 # Original BGM composition
├── assets/
│   ├── pinky_*.png     # Pinky emotion states (6 expressions)
│   └── pinky_fallback.png
└── lambda/
    └── index.mjs       # Node.js 20 ESM proxy
                        # Active-Passive Failover (Nova Native → Bedrock)
                        # Routes: POST /api/nova, POST /api/image
```

---

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/rainingsnow0914tw-ship-it/MoodBloom.git
cd MoodBloom

# Set up Lambda (for local testing)
cd lambda
cp .env.example .env
# Edit .env → add your NOVA_API_KEY

# Start local proxy
node start_server.js   # Handles CORS + API key injection

# Open frontend
open index.html        # Or use Live Server in VS Code
```

> ⚠️ **Security note**: Never put API keys in `app.js` or any frontend file. Always route through the Lambda proxy.

---

## ☁️ AWS Deployment

Full deployment guide → [`AWS_DEPLOYMENT_GUIDE.md`](./AWS_DEPLOYMENT_GUIDE.md)

Quick overview:
1. **S3** — upload frontend files
2. **Lambda** — deploy `lambda/index.mjs`, set `NOVA_API_KEY` env var, attach Bedrock IAM Role
3. **API Gateway** — HTTP API v2, `POST /api/nova`, `POST /api/image`, `OPTIONS /api/nova`
4. **CloudFront** - S3 origin + API Gateway origin, HTTPS
5. **Test** — `curl` test each endpoint before browser test

---

## 🔮 What's Next

| Timeline | Feature |
|----------|---------|
| Near-term | 🔊 Amazon Polly TTS — warmer Pinky voice, fully within AWS ecosystem |
| Near-term | ☁️ S3 Cloud Diary Sync — cross-device access, longitudinal tracking |
| Mid-term | 📊 Emotion Analytics - weekly mood reports, pattern detection |
| Mid-term | 🧠 Clinician Dashboard - aggregated summaries for family medicine workflows |
| Long-term | 🌍 Multilingual expansion — Japanese, Korean |

---

<br />
<div align="center">
  <h3>🌸 Try MoodBloom</h3>
  <a href="https://d1f4sz0ihfyr1i.cloudfront.net">
    <img src="https://img.shields.io/badge/🌸_Open_MoodBloom-Talk_your_feelings_into_bloom-E8A0BF?style=for-the-badge&logoColor=white" alt="Live Demo">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://nova.amazon.com/chat?mons_idp_issuer=AuthPortal&mons_idp_client_id=amzn_agi_hyperion_us">
    <img src="https://img.shields.io/badge/Powered_by-Amazon_Nova-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="Amazon Nova">
  </a>
</div>

<br />

<div align="center">
  <sub>Built with 🌸 by Chloe × 阿寶 × Jimmy × 曦 | Amazon Nova AI Hackathon 2026</sub>
</div>
