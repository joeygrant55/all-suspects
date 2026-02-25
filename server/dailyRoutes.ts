/**
 * Daily Challenge Leaderboard Routes
 *
 * POST /api/daily/submit  — Submit a score for today's daily challenge
 * GET  /api/daily/leaderboard?date=YYYY-MM-DD — Fetch top 20 scores
 *
 * In-memory storage (Railway restarts daily anyway; upgrade to DB when we have users).
 * Anonymous submissions — no auth needed, just a nickname.
 */

import { Router } from 'express'

const router = Router()

interface LeaderboardEntry {
  id: string
  date: string
  nickname: string
  score: number
  rank: string
  solveTime: string
  solveTimeMs: number
  submittedAt: number
  dayNumber: number
}

// In-memory leaderboard: date → sorted entries[]
const leaderboard: Map<string, LeaderboardEntry[]> = new Map()

// Max 200 entries per day (enough for MVP, easy to cap)
const MAX_ENTRIES_PER_DAY = 200

// Sanitize nickname
function sanitizeNickname(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9 _\-\.]/g, '')
    .trim()
    .slice(0, 20) || 'Anonymous'
}

// Parse "Xm Ys" → ms for sorting
function parseTimeToMs(timeStr: string): number {
  if (!timeStr) return 999999999
  const minMatch = timeStr.match(/(\d+)m/)
  const secMatch = timeStr.match(/(\d+)s/)
  const mins = minMatch ? parseInt(minMatch[1]) : 0
  const secs = secMatch ? parseInt(secMatch[1]) : 0
  return (mins * 60 + secs) * 1000
}

// Sort leaderboard: by score desc, then time asc (faster wins ties)
function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.solveTimeMs - b.solveTimeMs
  })
}

/**
 * POST /api/daily/submit
 * Body: { date, dayNumber, nickname, score, rank, solveTime }
 */
router.post('/submit', (req, res) => {
  const { date, dayNumber, nickname, score, rank, solveTime } = req.body

  // Validate
  if (!date || typeof score !== 'number' || !rank) {
    return res.status(400).json({ error: 'Missing required fields: date, score, rank' })
  }

  // Basic sanity: score 0–1000
  if (score < 0 || score > 1000) {
    return res.status(400).json({ error: 'Score out of range' })
  }

  const cleanNickname = sanitizeNickname(nickname || 'Anonymous')
  const solveTimeMs = parseTimeToMs(solveTime || '')

  const entry: LeaderboardEntry = {
    id: `${date}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    nickname: cleanNickname,
    score,
    rank,
    solveTime: solveTime || '??',
    solveTimeMs,
    submittedAt: Date.now(),
    dayNumber: typeof dayNumber === 'number' ? dayNumber : 1,
  }

  // Get or create today's list
  if (!leaderboard.has(date)) {
    leaderboard.set(date, [])
  }
  const dayEntries = leaderboard.get(date)!

  // Cap at max entries (drop lowest score/slowest)
  dayEntries.push(entry)
  const sorted = sortEntries(dayEntries)
  if (sorted.length > MAX_ENTRIES_PER_DAY) {
    sorted.splice(MAX_ENTRIES_PER_DAY)
  }
  leaderboard.set(date, sorted)

  // Find player's rank position
  const position = sorted.findIndex(e => e.id === entry.id) + 1

  console.log(`[DAILY] Submitted: ${cleanNickname} — ${score} pts (${rank}) in ${solveTime} | Day #${entry.dayNumber} | Rank #${position}`)

  res.json({
    success: true,
    entryId: entry.id,
    position,
    totalEntries: sorted.length,
  })
})

/**
 * GET /api/daily/leaderboard?date=YYYY-MM-DD
 * Returns top 20 entries for the given date.
 * If no date param, returns today's (UTC).
 */
router.get('/leaderboard', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)

  const entries = leaderboard.get(date) || []
  const top20 = entries.slice(0, 20)

  res.json({
    date,
    entries: top20.map((e, i) => ({
      position: i + 1,
      nickname: e.nickname,
      score: e.score,
      rank: e.rank,
      solveTime: e.solveTime,
      dayNumber: e.dayNumber,
    })),
    totalEntries: entries.length,
  })
})

export default router
