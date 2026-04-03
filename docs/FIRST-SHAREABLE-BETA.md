# All Saints — First Shareable Beta Gate

Use this as the final pre-share pass before sending All Saints to anyone outside the immediate build loop.

## Product bar

The app should feel:
- reverent, not gimmicky
- coherent on first load
- distinct across saints, not same-voice with swapped names
- stable enough that a first user does not need live hand-holding

## Must-pass gates

### 1. Live reliability
- [ ] Production site loads cleanly
- [ ] `/api/health` returns healthy from the live backend
- [ ] Live saint roster loads without blanks, retries, or hanging UI
- [ ] Frontend rewrite is pointing at the correct Railway backend

### 2. Conversation quality
- [ ] At least 3 saints feel meaningfully distinct in tone and framing
- [ ] Single-saint conversations return cleanly without timeout or malformed payloads
- [ ] Council-mode responses render correctly and feel intentional
- [ ] Study mode feels more structured than counsel mode

### 3. Voice quality
- [ ] Voice status reflects reality in the target environment
- [ ] If voice is enabled, playback works on multiple saints
- [ ] If voice is disabled or broken, the app degrades cleanly into text-only use

### 4. Trust / polish
- [ ] Empty states are calm and understandable
- [ ] Error states do not break tone
- [ ] No obvious placeholder copy leaks into the user path
- [ ] No dead-end buttons or broken links in the first-run path

### 5. Operator readiness
- [ ] `docs/SMOKE-TEST-CHECKLIST.md` has been run recently
- [ ] `DEPLOY.md` still matches the live deployment shape
- [ ] Known issues are written down before sharing
- [ ] Share target is explicit: private friend test, soft beta, or broader public preview

## Known blockers to watch

- Railway/Vercel environment drift
- stale API rewrite target
- voice availability mismatch between local and production
- saint tone collapse when prompts or routing regress

## Share recommendation

Only share when the answer to this is yes:

> Would a thoughtful first user understand what this is, trust it enough to keep using it for a few minutes, and avoid hitting a credibility-breaking issue right away?
