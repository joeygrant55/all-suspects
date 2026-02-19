# All Suspects - Deployment Guide

**Last Updated:** Feb 19, 2026

## Status
- ✅ Backend: https://all-suspects-production.up.railway.app (Railway, auto-deploys on main push)
- ✅ Frontend: https://allsuspects.slateworks.io (Vercel, auto-deploys on main push)
- ✅ Blackwood Betrayal: Live and playable (6 characters, blueprint persisted on Railway fs)
- ✅ 9 total mysteries in library

---

## Architecture Notes

### Mystery Storage
- **Hardcoded mysteries** (ashford-affair, hollywood-premiere): Stored in `mysteries/` directory, loaded client-side via registry
- **Generated mysteries** (blackwood-betrayal, etc.): Blueprint stored in `public/generated/:id/blueprint.json` on Railway filesystem
  - ⚠️ Railway filesystem is ephemeral — redeploys may wipe generated mysteries (though blueprint.json files are committed to git if added)
  - The `/api/mystery/:id/blueprint` and `/api/mystery/:id/chat` endpoints have disk fallbacks — gameplay works fine after restart
  - The legacy `/api/mystery/:id` (generic info) uses in-memory store only — returns 404 after restart (not used by frontend)

### In-memory vs Filesystem
- `server/mystery/store.ts` = in-memory GeneratedMystery store (legacy, not used for Blackwood gameplay)
- `server/agents/mysteryApi.ts` = `activeMysteries` Map + disk fallback via `loadBlueprint()` (used for all chat/gameplay)
- `activeMysteries` is rehydrated from disk on any blueprint/chat request — no action needed

---

## Environment Variables (Railway)
```
GEMINI_API_KEY=AIzaSyChdJn3-4RDWURE2ruYBgss1b8rFT4jKvg
FAL_KEY=4ecc99c9-6bd9-4bde-8040-e8c532587f34:a880cf9ed203b0633ba756aa905690c2
ELEVENLABS_API_KEY=sk_2df3c5e48a9c9dd995e59edb968202156f12e42743f2240e
PORT=3001
ANTHROPIC_API_KEY=[set in Railway dashboard]
```

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
```
