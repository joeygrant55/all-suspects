# All Saints Deployment Guide

## Runtime Shape

- Frontend: Vercel static build from `dist/`
- Backend: Railway running `npm start`
- Frontend API access: same-origin `/api/*` rewrite to the Railway backend, or explicit `VITE_API_URL`

## Required Backend Environment Variables

```env
ANTHROPIC_API_KEY=
PORT=3001
```

## Optional Voice Environment Variables

```env
ELEVENLABS_API_KEY=
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_VOICE_ID_AQUINAS=
ELEVENLABS_VOICE_ID_AUGUSTINE=
ELEVENLABS_VOICE_ID_THERESE=
ELEVENLABS_VOICE_ID_IGNATIUS=
ELEVENLABS_VOICE_ID_FRANCIS_DE_SALES=
```

Notes:

- `ELEVENLABS_API_KEY` enables saint reply playback.
- Saint-specific voice IDs override the built-in fallback mapping.
- If voice env vars are absent, chat remains fully functional and voice controls stay unavailable.

## Frontend Environment Variables

```env
VITE_API_URL=
```

Leave `VITE_API_URL` unset if the frontend should use same-origin `/api` rewrites in production.

## Health Check

Railway should probe:

```text
/api/health
```

## Basic Verification

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/saints
curl http://localhost:3001/api/voice/status
npm run build
```

## Security

- Keep real API keys in platform dashboards or untracked local env files only.
- Do not place live credentials in `README.md`, `DEPLOY.md`, or tracked `.env` files.
