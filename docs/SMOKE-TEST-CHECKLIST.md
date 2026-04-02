# All Saints Smoke Test Checklist

Use this before any wider share, deployment change, or voice rollout.

## 1. Basic health

- [ ] Frontend loads without console-breaking errors
- [ ] Backend health check returns 200 at `/api/health`
- [ ] `/api/saints` returns the full roster
- [ ] At least one saint detail page payload resolves from `/api/saints/:id`

## 2. Core chat flow

- [ ] Select a single saint from the roster
- [ ] Ask a simple pastoral question
- [ ] Receive a response without timeout or malformed payload errors
- [ ] Switch saints and confirm prior conversation state does not break the next reply
- [ ] Refresh the app and confirm first-run state is still coherent

## 3. Study vs counsel mode

- [ ] In counsel mode, tone feels practical and conversational
- [ ] In study mode, tone feels more grounded and analytical
- [ ] Aquinas in study mode feels materially stronger than generic fallback behavior
- [ ] Mode switching does not require app refresh and does not break responses

## 4. Council mode

- [ ] Trigger a council-style question and confirm multiple saints can respond cleanly
- [ ] Confirm response payload renders without malformed-saints fallback issues
- [ ] Confirm UI labeling correctly distinguishes single vs council response mode

## 5. Voice flow

- [ ] `/api/voice/status` reports correctly for the current environment
- [ ] If ElevenLabs is configured, voice playback button appears
- [ ] Voice playback succeeds for at least two saints
- [ ] Stop / replay behavior works without overlapping audio
- [ ] Failed voice synthesis degrades gracefully with a human-readable message
- [ ] If ElevenLabs is not configured, text chat still works and voice controls stay hidden or unavailable gracefully

## 6. Environment / deployment checks

- [ ] `VITE_API_URL` behavior is correct for the target environment
- [ ] Same-origin `/api` rewrite is functioning in production if frontend is using rewrite mode
- [ ] Railway backend starts with `npm start`
- [ ] Required backend env vars are present (`ANTHROPIC_API_KEY`, `PORT`)
- [ ] Optional voice env vars are correct if voice is expected in prod
- [ ] No live secrets are present in tracked docs or tracked env files

## 7. First-shareable quality bar

- [ ] Saint roster feels intentional, not placeholder-heavy
- [ ] At least three saints feel distinct in tone and spiritual perspective
- [ ] Empty states and loading states feel calm and coherent
- [ ] Error states do not break the reverent tone of the product
- [ ] App feels safe to hand to a first outside user without explanation

## 8. Regression notes

Record anything that fails here before fixing:

- Date:
- Environment:
- What broke:
- Repro steps:
- Severity:
- Fixed in commit:
