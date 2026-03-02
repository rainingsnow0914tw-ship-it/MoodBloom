# MoodBloom — “a voice… and a companion who writes back”

[![NOVA](https://img.shields.io/badge/NOVA-8A2BE2?style=for-the-badge&logo=amazonaws&logoColor=white)]([請在這裡貼上你的_NOVA_實際連結](https://nova.amazon.com/chat?mons_idp_issuer=AuthPortal&mons_idp_client_id=amzn_agi_hyperion_us))

[![AWS Console](https://img.shields.io/badge/AWS_Console-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white)](https://console.aws.amazon.com/)

A hackathon demo that turns **speech → reflection → supportive reply**, with a gentle UI and an “always-responding” companion.

## What judges should look at
- **Experience design**: fast voice input, low-friction journaling, and a comforting feedback loop  
- **Safety & reproducibility**: this repo contains **no secrets**; it runs offline with mocked responses  
- **Roadmap**: Amazon Polly · Emotion Analytics · Clinician Dashboard

## Run it locally (Offline Demo mode — no key needed)
```bash
npm install
npm run start
# open http://localhost:3000
```

## Run it locally (Live mode — optional)
1. Copy `.env.example` → `.env`
2. Fill in `NOVA_API_KEY`
3. Start:
```bash
npm run start
```

## Files
- `index.html`, `style.css`, `app.js` — front-end UI
- `start_server.js` — local dev server + `/api/nova` proxy + offline stub
- `docs/architecture.md` — high-level architecture
- `PROJECT_STORY_*.md` — story / narrative for judges

## Notes
This repo is published as a **judge-friendly demo package**. See `SECURITY.md` and `LICENSE`.
