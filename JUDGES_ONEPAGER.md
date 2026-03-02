# MoodBloom — Judge One‑Pager

## Problem
Many people *feel something heavy*, but can’t find the words fast enough to ask for help.

## Solution (Demo)
MoodBloom turns **voice → journaling → a kind reply**, in a loop that feels safe and lightweight.

- 🎤 **Fast voice input** (browser speech recognition)
- 📝 **Auto-structured journaling**
- 💬 **Companion replies** (Nova live mode / Offline demo stub)
- 🐾 **Mascot UI (“小粉”) + ambient BGM** to reduce friction

## Why it’s valuable
1. **UX insight**: the “write back” moment is the hook — it makes journaling feel like a relationship, not a task.
2. **Engineering hygiene**: secrets stay server-side; repo is reproducible without keys.
3. **Scalable roadmap**:
   - Amazon Polly (higher quality TTS)
   - Emotion analytics (signals, trends)
   - Clinician dashboard (optional, consented escalation)

## How to run
- Offline demo (no key): `npm install && npm run start`
- Live (optional): set `NOVA_API_KEY` in `.env`

## What’s intentionally not included
- Any API keys or private diary data (see `SECURITY.md`)
