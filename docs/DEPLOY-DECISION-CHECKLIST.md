# DEPLOY-DECISION-CHECKLIST

Use this before anyone decides that All Saints is ready for a real deploy or first external share.

## 1. Repo state
- [ ] `git status` is reviewed first
- [ ] source changes are either committed coherently or intentionally left untouched
- [ ] no one is assuming docs alone mean the build is ship-ready

## 2. Build state
- [ ] local build completes cleanly
- [ ] frontend and backend URLs under test are written down
- [ ] env assumptions are checked against the current code, not memory

## 3. Smoke test discipline
- [ ] `docs/LIVE-SMOKE-TEST-PLAN.md` is used for the run order
- [ ] results are captured in `docs/SMOKE-TEST-RESULTS-TEMPLATE.md`
- [ ] any failure-path behavior is tested at least once

## 4. Production verification
- [ ] deployed frontend is confirmed live
- [ ] backend is confirmed live
- [ ] saint roster loads
- [ ] one single-saint chat works
- [ ] council mode is checked if expected live
- [ ] study mode is checked if expected live
- [ ] voice is checked if expected live

## 5. Share decision
- [ ] blocking issues are written down before sharing
- [ ] if shareable, first recipients are named explicitly
- [ ] if not shareable, the next fix owner is clear

## Current caution
As of this checkpoint, the repo still shows a large in-progress refactor and deletion sweep. Treat deploy/share as a decision that depends on source state, not just documentation completeness.
