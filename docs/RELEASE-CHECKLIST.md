# All Saints — Release Checklist

Use this before any real deployment, wider share, or manual production cut.

## 1. Working tree sanity
- [ ] Confirm what is intentionally changing in this release
- [ ] Confirm large file deletions / generated-asset removals are intentional
- [ ] Confirm no unrelated local experiments are being bundled into the deploy
- [ ] Confirm `artifacts/` contents are either ignored, preserved intentionally, or excluded from the release

## 2. Backend sanity
- [ ] `npm run build` passes
- [ ] `npm start` boots locally
- [ ] `/api/health` returns 200
- [ ] `/api/saints` returns expected live roster
- [ ] `/api/voice/status` reflects expected voice availability

## 3. Frontend sanity
- [ ] App loads cleanly in local preview
- [ ] Saint roster renders without empty / broken cards
- [ ] Single-saint conversation works
- [ ] Council mode works if included in this release
- [ ] Study mode works if included in this release
- [ ] No dead buttons or obvious placeholder states on first run

## 4. Environment sanity
- [ ] Railway env vars are current
- [ ] Vercel env vars are current
- [ ] `vercel.json` rewrite target matches the live Railway backend
- [ ] `VITE_API_URL` behavior is intentional for the target environment
- [ ] Voice env vars are either valid or intentionally absent

## 5. Operator docs sanity
- [ ] `DEPLOY.md` still matches reality
- [ ] `docs/SMOKE-TEST-CHECKLIST.md` is still current
- [ ] `docs/FIRST-SHAREABLE-BETA.md` still reflects the real quality bar
- [ ] `docs/KNOWN-ISSUES.md` is updated before sharing

## 6. Share / deploy decision
- [ ] This build is safe for private testing
- [ ] This build is safe for broader sharing
- [ ] Known caveats are written down before the link leaves the room

## Release log
- Date:
- Commit:
- Environment:
- Shared/deployed by:
- Notes:
