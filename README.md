# All Saints

A saint conversation app built with React, Vite, Express, and Anthropic. Users can select a saint, ask questions about faith and life, and receive replies in the saint's voice and perspective. If ElevenLabs is configured, saint replies can also be played back as audio.

## Stack

- Frontend: React 19 + TypeScript + Vite
- Backend: Express + `tsx`
- AI: Anthropic Claude
- Voice: ElevenLabs text-to-speech for saint replies

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

Frontend runs on `http://localhost:5173`. Backend runs on `http://localhost:3001`.

## Environment Variables

Required:

```env
ANTHROPIC_API_KEY=
```

Optional:

```env
VITE_API_URL=http://localhost:3001
ELEVENLABS_API_KEY=
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_VOICE_ID_AQUINAS=
ELEVENLABS_VOICE_ID_AUGUSTINE=
ELEVENLABS_VOICE_ID_THERESE=
ELEVENLABS_VOICE_ID_IGNATIUS=
ELEVENLABS_VOICE_ID_FRANCIS_DE_SALES=
```

If `ELEVENLABS_API_KEY` is unset, the app keeps the existing text chat flow and hides voice playback controls gracefully.

## Scripts

```bash
npm run dev        # Frontend only
npm run server     # Backend only
npm run dev:all    # Frontend + backend
npm run build      # Frontend production build
npm run start      # Production backend entry
```

## API Surface

- `GET /api/health`
- `GET /api/saints`
- `GET /api/saints/:id`
- `POST /api/ask`
- `POST /api/chat`
- `GET /api/voice/status`
- `POST /api/voice`

## Deployment Notes

- Vercel frontend can use same-origin `/api` rewrites to the Railway backend.
- Railway health checks should target `/api/health`.
- Do not commit real secrets into docs or tracked env files.

## Operational Docs

- `DEPLOY.md` — deployment shape, env vars, and verification steps
- `docs/SMOKE-TEST-CHECKLIST.md` — pre-share smoke test flow
- `docs/FIRST-SHAREABLE-BETA.md` — quality gate before outside sharing
- `docs/KNOWN-ISSUES.md` — active risk log and share notes before sending it out
- `docs/RELEASE-CHECKLIST.md` — final pre-deploy / pre-share release pass
- `docs/SHIP-SEQUENCE.md` — shortest safe path from local changes to a real shareable build
- `docs/REPO-STATE-HANDOFF.md` — snapshot of the current working-tree refactor risk before deploy/share decisions
