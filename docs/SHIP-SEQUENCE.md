# All Saints — Ship Sequence

Use this when you want the shortest safe path from local changes to a real shareable build.

## 1. Confirm release intent
- Decide whether this is:
  - a private friend test
  - a soft beta share
  - a real production cleanup / stability deploy
- Write the answer into `docs/KNOWN-ISSUES.md` before shipping anything outward

## 2. Sanity-check the working tree
- Scan `git status --short`
- Confirm all large deletions are intentional
- Confirm current code edits belong in the same release
- If the tree is mixed, split docs-only / infra-only / product changes before shipping

## 3. Run the local checks
- `npm run build`
- `npm run start`
- hit `/api/health`
- hit `/api/saints`
- hit `/api/voice/status`
- walk through `docs/SMOKE-TEST-CHECKLIST.md`

## 4. Re-check deploy assumptions
- `DEPLOY.md` still matches reality
- Railway env vars are current
- Vercel env vars are current
- `vercel.json` still points `/api/*` to the right Railway host
- If using `VITE_API_URL`, confirm it is intentional for this environment

## 5. Decide the share bar
- For internal deploy only: release checklist is enough
- For outside sharing: also pass `docs/FIRST-SHAREABLE-BETA.md`
- If there are rough edges, record them in `docs/KNOWN-ISSUES.md` before sending the link

## 6. Ship cleanly
- commit only the intended changes
- deploy backend if needed
- deploy frontend if needed
- verify the live site, not just local

## 7. Post-ship log
Write down:
- commit shipped
- environment shipped to
- who got the link
- what feedback is being requested
- any known caveats still open
