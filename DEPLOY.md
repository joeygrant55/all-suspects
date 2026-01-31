# All Suspects - Deployment Guide

**Last Updated:** Jan 30, 2026, 21:51 EST

## Status
- ✅ Veo 3 fallback code committed & pushed
- ✅ GitHub repo: `joeygrant55/all-suspects`
- 🚧 Need to deploy Railway + Vercel

---

## Step 1: Railway (Backend API)

### Via Web UI
1. Go to: https://railway.app/new
2. Click: **"Deploy from GitHub repo"**
3. Select: `joeygrant55/all-suspects`
4. Branch: `main`

### Environment Variables
Add these in Railway's "Variables" tab:
```
GEMINI_API_KEY=AIzaSyChdJn3-4RDWURE2ruYBgss1b8rFT4jKvg
FAL_KEY=4ecc99c9-6bd9-4bde-8040-e8c532587f34:a880cf9ed203b0633ba756aa905690c2
ELEVENLABS_API_KEY=sk_2df3c5e48a9c9dd995e59edb968202156f12e42743f2240e
PORT=3001
```

### Settings
- **Start Command:** `npm start`
- **Health Check Path:** `/api/characters`
- **Auto-Deploy:** Enabled (on `main` branch)

### After Deploy
1. Copy your Railway URL (e.g., `xxx.up.railway.app`)
2. Test: `https://YOUR_RAILWAY_URL/api/characters`

---

## Step 2: Update vercel.json

Replace `YOUR_RAILWAY_URL_HERE` in `vercel.json` with your Railway URL:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR_RAILWAY_URL/api/:path*" }
  ]
}
```

Then commit and push:
```bash
cd ~/Desktop/Slateworks.io/all-suspects
git add vercel.json
git commit -m "Update Railway URL in vercel.json"
git push origin main
```

---

## Step 3: Vercel (Frontend)

### Via Web UI
1. Go to: https://vercel.com/new
2. Click: **"Import Project"**
3. Select: `joeygrant55/all-suspects`
4. Framework: **Vite**

### Build Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Deploy
Click "Deploy" - Vercel will automatically use `vercel.json` config

### After Deploy
Your app will be live at: `https://all-suspects.vercel.app`

---

## Verification

### Backend (Railway)
```bash
curl https://YOUR_RAILWAY_URL/api/characters
# Should return array of characters
```

### Frontend (Vercel)
1. Visit: `https://all-suspects.vercel.app`
2. Click "BEGIN INVESTIGATION"
3. Mystery generation should work
4. Check browser console - API calls should go to Railway

---

## Environment Summary

**Backend (Railway):**
- API endpoints for mystery generation
- Video generation with fal.ai → Veo 3 fallback
- Character agent logic

**Frontend (Vercel):**
- Vite static site
- React UI
- Proxies `/api/*` to Railway backend

---

## Troubleshooting

### Railway build fails
- Check logs in Railway dashboard
- Verify Node version (should use latest LTS)
- Ensure all dependencies in package.json

### Vercel build fails
- Check TypeScript errors (might need to add `tsc --noEmit` skip)
- Verify vercel.json has correct Railway URL

### API calls fail (CORS)
Railway needs CORS headers. Check `server/index.ts`:
```typescript
app.use(cors())
```

### Video generation fails
- Check Railway logs for fal.ai errors
- Verify GEMINI_API_KEY is set
- Check Veo fallback logs: `[ArtPipeline] 🎬 fal.ai failed, falling back to Veo 3...`

---

## Next Steps After Deploy
1. Top up fal.ai credits tomorrow
2. Test full mystery generation flow
3. Monitor Railway logs for Veo fallback usage
4. Update DNS if using custom domain
