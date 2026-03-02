# Architecture (High-level)

```mermaid
flowchart LR
  U[User] -->|Voice / Text| FE[Front-end (index.html + app.js)]
  FE -->|POST /api/nova| BE[Proxy / Lambda Adapter]
  BE -->|Live: Nova API| NOVA[Amazon Nova (nova-2-lite)]
  BE -->|Offline: Stub| STUB[Mock Responder]
  FE --> UI[Emotion UI + Pinky Mascot]
  FE --> BGM[Ambient BGM (local)]
```

**Key idea:** The repo is published as a *safe demo*:
- Front-end never stores secrets
- Backend reads secrets from env (optional)
- Without secrets, it still runs in Offline Demo mode (mocked)
