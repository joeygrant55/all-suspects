# Live Smoke Test Plan

Use this before running a real All Saints smoke test so the pass is disciplined and comparable across builds.

## Before you start
- Confirm which frontend URL and backend environment you are testing
- Note the branch / commit if known
- Decide whether voice is expected to be enabled for this pass
- Have `docs/SMOKE-TEST-RESULTS-TEMPLATE.md` open before clicking around

## Suggested test order
1. Homepage first load
2. Saint roster load
3. One standard chat with a single saint
4. Council mode pass
5. Study mode pass
6. Voice status and playback check
7. Mobile-width sanity check
8. One intentional bad-input / failure-path check

## Suggested prompts
### Standard chat
- Ask one practical life question
- Ask one theological question
- Check whether tone feels reverent, coherent, and actually helpful

### Council mode
- Ask a question that benefits from multiple voices
- Confirm the UI makes it clear who is speaking
- Check whether answers feel complementary rather than repetitive

### Study mode
- Use Aquinas first
- Ask about virtue, happiness, conscience, law, truth, evil, soul, or education
- Check whether the response distinguishes direct source grounding from inference

## What to watch closely
- Slow first load
- Empty or failed saint roster
- Broken API responses
- Missing assets or layout glitches
- Anything that makes the app feel gimmicky instead of credible
- Any disconnect between what the docs say is live and what the product actually does

## After the pass
- Fill in `docs/SMOKE-TEST-RESULTS-TEMPLATE.md`
- If the build is shareable, capture feedback with `docs/SHARE-FEEDBACK-TEMPLATE.md`
- If it is not shareable, write the blocking issues down before context gets lost
