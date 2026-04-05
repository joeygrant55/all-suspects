# Repo State Handoff

_Last updated: 2026-04-05_

## Why this exists
This repo currently has a large in-progress working-tree cleanup/refactor underway. Before anyone tries to deploy, smoke test, or stack more changes on top, they should look at the repo state first.

## Current working-tree reality
Uncommitted changes are present across:
- `package.json`
- `package-lock.json`
- `server/agents/orchestrator.ts`
- `server/agents/studyMode.ts`
- `server/index.ts`
- `src/types/saintChat.ts`
- untracked `artifacts/`

There is also a very large deletion sweep removing old mystery-game assets and supporting code, including:
- `public/generated/*`
- `public/audio/*`
- `public/portraits/*`
- `public/rooms/*`
- `public/ui/*`
- `public/evidence/*`
- `server/mystery/*`
- `server/watson/*`
- `server/voice/*`
- `shared/*`
- `scripts/generate-era-images.mjs`
- `src/hooks/*`
- `src/lib/analytics.ts`

## What this probably means
The repo appears to be moving from legacy mystery-game scaffolding toward a tighter All Saints shape. That is probably the right direction, but it also means:
- deploy assumptions may have changed
- docs may now be ahead of code
- smoke-test expectations should be re-run after the refactor settles
- no one should assume the current working tree is ready to ship just because docs are complete

## Safe next step before shipping
1. Get the source cleanup/refactor into a coherent commit or branch state
2. Rebuild locally
3. Run the smoke-test checklist again from top to bottom
4. Verify Railway + Vercel env assumptions still match the current code
5. Only then decide whether it is ready for first serious external sharing

## Operator note
Recent docs added in this repo are intentionally code-light and safe to keep:
- `docs/SMOKE-TEST-CHECKLIST.md`
- `docs/FIRST-SHAREABLE-BETA.md`
- `docs/KNOWN-ISSUES.md`
- `docs/RELEASE-CHECKLIST.md`
- `docs/SHIP-SEQUENCE.md`

Those docs are useful, but they do not override the actual repo state. The working tree is the source of truth for launch readiness.
