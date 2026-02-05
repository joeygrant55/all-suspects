# All Suspects: PMF Analytics Implementation

## Overview

This document outlines the analytics system built to track Product-Market Fit signals for All Suspects.

## What's Been Built

### Server-Side (`server/analytics.ts`)
- Event tracking with in-memory + JSON persistence
- Session management (30-minute inactivity timeout)
- Key metrics calculations:
  - Daily metrics (sessions, completions, questions, etc.)
  - Engagement metrics (avg duration, completion rate, etc.)
  - Summary stats for dashboards

### API Routes (`server/analyticsRoutes.ts`)
```
POST /api/analytics/session     - Create/get session ID
POST /api/analytics/track       - Track single event
POST /api/analytics/batch       - Track multiple events (for batched sends)
GET  /api/analytics/session/:id - Get session details
GET  /api/analytics/summary     - Dashboard summary stats
GET  /api/analytics/daily       - Daily metrics (default 30 days)
GET  /api/analytics/engagement  - Engagement metrics
GET  /api/analytics/export      - Export all data as JSON
POST /api/analytics/clear       - Clear all data (requires confirmation)
```

### Client-Side (`src/lib/analytics.ts`)
- Automatic session management
- Batched event sending (every 5 seconds)
- Beacon API for reliable send on page close
- Convenience methods:
  - `analytics.gameStarted(mysteryId)`
  - `analytics.questionAsked(characterId)`
  - `analytics.contradictionFound(char1, char2)`
  - `analytics.accusationMade(accusedId, isCorrect)`
  - `analytics.gameCompleted(isCorrect, accusedId, stats)`
  - etc.

### Dashboard (`public/admin/analytics.html`)
- Real-time metrics display
- PMF target tracking (100 users, 30% completion, 3+ suspects)
- Daily breakdown table
- Auto-refresh every 30 seconds

## Events Tracked

| Event | Trigger | Properties |
|-------|---------|------------|
| `session_start` | App opens | - |
| `mystery_select` | User picks mystery | `mysteryId` |
| `game_start` | Mystery loaded | `mysteryId` |
| `interrogation_start` | Starts talking to suspect | `characterId` |
| `interrogation_end` | Leaves interrogation | `characterId`, `questionsAsked` |
| `question_asked` | Each question | `characterId`, `questionType` |
| `evidence_collected` | Finds evidence | `evidenceId`, `evidenceType` |
| `contradiction_found` | Detects contradiction | `character1Id`, `character2Id` |
| `accusation_attempt` | Makes accusation | `accusedId`, `isCorrect`, `attemptNumber` |
| `game_complete` | Solves mystery | `isCorrect`, `solveTimeMs`, stats |
| `game_abandon` | Leaves without solving | `playTimeMs`, `lastScreen` |

## PMF Targets

Per our discussion, signals that indicate Product-Market Fit:

| Metric | Target | Why |
|--------|--------|-----|
| Users | 100+ | Meaningful sample size |
| D1 Retention | 30%+ | Coming back next day = hooked |
| Completion Rate | 60%+ | Game is satisfying, not frustrating |
| Avg Suspects Interrogated | 3+ | Deep engagement, not surface play |
| Avg Session Duration | 10+ min | People are spending real time |

## Remaining Work (JOEY)

### 1. Wire Up Client Tracking
The `analytics` module is ready but needs to be called from key components:

**TitleScreen.tsx** - when mystery is selected:
```typescript
import analytics from '../lib/analytics'
// In mystery select handler:
analytics.mysterySelected(mysteryId, mysteryTitle)
```

**Game state hooks** - when game starts:
```typescript
// After mystery generation completes:
analytics.gameStarted(mysteryId)
```

**InterrogationModal.tsx** - tracking questions:
```typescript
// On entering interrogation:
analytics.interrogationStarted(characterId, characterName)

// On each question:
analytics.questionAsked(characterId)

// On exit:
analytics.interrogationEnded(characterId, questionsAsked)
```

**Evidence collection** - in state handlers:
```typescript
// When evidence is added:
analytics.evidenceCollected(evidenceId, evidenceType)
```

**AccusationModal.tsx** - tracking accusations:
```typescript
// On accusation:
analytics.accusationMade(accusedId, isCorrect, attemptNumber)

// On correct accusation:
analytics.gameCompleted(true, accusedId, {
  questionsAsked,
  suspectsInterrogated,
  evidenceCollected,
  contradictionsFound,
  accusationAttempts
})
```

### 2. Deploy to Railway
The backend code is ready. Just needs:
```bash
git add server/analytics.ts server/analyticsRoutes.ts
git commit -m "feat: add PMF analytics tracking"
git push
```

Railway will auto-deploy.

### 3. Get First Users
Distribution plan to hit 100 users:
- [ ] Share link on social
- [ ] Post in gaming communities
- [ ] Friends & family beta
- [ ] Reddit (r/webgames, r/detectivegames, etc.)
- [ ] Discord gaming servers

## Dashboard Access

Once deployed:
- **Analytics Dashboard**: `https://allsuspects.slateworks.io/admin/analytics.html`
- **Raw API**: `https://allsuspects.slateworks.io/api/analytics/summary`

## Data Storage

Currently using JSON file persistence (`data/analytics-events.json`, `data/analytics-sessions.json`).

For production scale (1000+ users), consider:
- PostgreSQL (Railway has it)
- Convex (already using for other projects)
- PostHog (free tier, great for product analytics)

---

*Created: Feb 5, 2026 - Deep Dive 3 (05:00)*
*Status: Built, ready for integration*
