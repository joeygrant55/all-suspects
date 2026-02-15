# All Suspects — Retention Hook Spec

## Problem
Zero repeat users. People play once (maybe), then bounce. No reason to come back.

## Proposed: Daily Mystery Challenge

### How it works
- **One mystery per day**, same for everyone (seeded by date)
- **Leaderboard** — ranked by score (already have 0-1000 scoring + S/A/B/C/D/F ranks)
- **Streak counter** — "🔥 5-day streak" badge on profile
- **Share card** — post-solve image with score, rank, and solve time (think Wordle green squares)

### Why this works
- **Wordle proved it** — one puzzle/day creates FOMO + daily habit
- **Social sharing** is the growth loop (share card → friends try it → they share)
- **Competition** drives repeat play (beat your friends' score)
- **Low dev effort** — scoring system already exists, just need seed + leaderboard + share card

### Implementation (3 Spark tasks)

**Task 1: Daily Mystery Seed**
- Hash today's date → deterministic mystery config
- Show "Daily Challenge" badge on the mystery card
- Lock to 1 attempt per day (localStorage + server validation)
- Files: `src/game/dailyChallenge.ts` (new), `src/components/UI/MysterySelect.tsx` (add daily card)

**Task 2: Leaderboard**
- Server endpoint: `POST /api/daily/submit` (score, time, rank)
- Server endpoint: `GET /api/daily/leaderboard?date=YYYY-MM-DD`
- Simple display: top 20 scores, your rank highlighted
- Files: `server/dailyRoutes.ts` (new), `src/components/UI/Leaderboard.tsx` (new)

**Task 3: Share Card**
- Post-victory screen gets "Share Result" button
- Generates text like:
  ```
  🔍 All Suspects — Daily Mystery #42
  ⭐ Score: 847 (Rank A)
  ⏱️ Solved in 8m 23s
  🔥 3-day streak
  allsuspects.slateworks.io
  ```
- Copy to clipboard (works everywhere) + native share API on mobile
- Files: `src/components/UI/ShareCard.tsx` (new), `src/components/UI/VictoryScreen.tsx` (add button)

### What NOT to build (yet)
- User accounts / auth (localStorage is fine for MVP)
- Historical leaderboards (just today's)
- Achievements system (complexity creep)
- Push notifications (need users first)

### Success metric
- D1 retention > 30% (come back next day)
- Share rate > 10% of completions
