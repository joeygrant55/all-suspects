# All Suspects — Deployment Guide

**Last Updated:** Feb 20, 2026

---

## ✅ Current Status: DEPLOYED

| Service | URL | Status |
|---------|-----|--------|
| Frontend (Vercel) | https://allsuspects.slateworks.io | ✅ 200 |
| Backend (Railway) | https://all-suspects-production.up.railway.app | ✅ 200 |

Auto-deploy enabled on `main` branch for both services.

---

## Architecture Notes

### Backend (Railway)
- Node/Express API
- Mystery generation (Gemini)
- Character agent logic (pressure system, contradiction detection)
- Video generation (fal.ai → Veo 3 fallback)
- ElevenLabs TTS for voiced character intros

### Frontend (Vercel)
- Vite/React static site
- FMV UI: IntroSequence → ManorMap → RoomExploration → CharacterInterrogation
- Proxies `/api/*` to Railway backend

### Mystery Storage
- **Hardcoded mysteries** (ashford-affair, hollywood-premiere): Stored in `mysteries/` directory, loaded client-side via registry
- **Generated mysteries** (blackwood-betrayal, etc.): Blueprint stored in `public/generated/:id/blueprint.json` on Railway filesystem
  - ⚠️ Railway filesystem is ephemeral — redeploys may wipe generated mysteries (though blueprint.json files are committed to git if added)
  - The `/api/mystery/:id/blueprint` and `/api/mystery/:id/chat` endpoints have disk fallbacks — gameplay works fine after restart

### In-memory vs Filesystem
- `server/mystery/store.ts` = in-memory GeneratedMystery store (legacy, not used for Blackwood gameplay)
- `server/agents/mysteryApi.ts` = `activeMysteries` Map + disk fallback via `loadBlueprint()` (used for all chat/gameplay)
- `activeMysteries` is rehydrated from disk on any blueprint/chat request — no action needed

---

## Environment Variables

### Railway (Backend)
```
GEMINI_API_KEY=<set in Railway dashboard>
FAL_KEY=<set in Railway dashboard>
ELEVENLABS_API_KEY=<set in Railway dashboard>
ANTHROPIC_API_KEY=<set in Railway dashboard>
PORT=3001
```

### Vercel (Frontend)
- Configured via Vercel dashboard
- `vercel.json` rewrites `/api/*` → Railway backend URL

---

## Validated Features (as of Feb 20, 2026)

- ✅ Blackwood Betrayal mystery: 6 characters, blueprint loads
- ✅ Character chat works (pressure system active)
- ✅ Voiced character intros (ElevenLabs TTS)
- ✅ Accusation finale
- ✅ Room progression + suspect locking behind evidence discovery
- ✅ Accusation API (hardcoded localhost URLs fixed)
- ✅ 9 total mysteries in library
- ✅ PMF analytics: events tracked (mystery select, game start, interrogations, accusations, room visits, abandon)

---

## Deploy Steps (if needed)

### Backend (Railway)
- Auto-deploys on `git push origin main`
- No manual steps needed

### Frontend (Vercel)
- Auto-deploys on `git push origin main`
- `vercel.json` rewrites /api/* → Railway URL

---

## Testing

```bash
# Health check
curl https://all-suspects-production.up.railway.app/api/characters

# Blackwood blueprint (should return 6 characters)
curl https://all-suspects-production.up.railway.app/api/mystery/the-blackwood-betrayal/blueprint

# All mysteries
curl https://all-suspects-production.up.railway.app/api/mysteries

# Analytics summary
curl https://allsuspects.slateworks.io/api/analytics/summary
```

---

## Troubleshooting

### API calls fail (CORS)
Railway needs CORS headers. Check `server/index.ts`:
```typescript
app.use(cors())
```

### Video generation fails
- Check Railway logs for fal.ai errors
- Verify GEMINI_API_KEY is set
- Check Veo fallback logs: `[ArtPipeline] 🎬 fal.ai failed, falling back to Veo 3...`

### Railway build fails
- Check logs in Railway dashboard
- Verify Node version (should use latest LTS)

---

## Next Steps

- PMF analytics: get first 100 users (share on social, Reddit, gaming communities)
- FMV visual polish: room background images, character portraits (see FMV_MIGRATION.md)
- Analytics dashboard: https://allsuspects.slateworks.io/admin/analytics.html
