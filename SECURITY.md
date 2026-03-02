# Security Notes (Demo Repo)

This repository is intentionally published as a **safe, reproducible demo**.

## What is NOT included
- No API keys, tokens, or secrets
- No production `.env`
- No private datasets / real user diaries

## How to run in Live mode (optional)
1. Copy `.env.example` → `.env`
2. Put your `NOVA_API_KEY` in `.env`
3. `npm install`
4. `npm run start`

If you don't configure a key, the app will automatically run in **Offline Demo mode** with mocked responses.
