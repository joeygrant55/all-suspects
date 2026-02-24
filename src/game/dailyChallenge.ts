/**
 * Daily Challenge System
 *
 * One mystery per day, same for all players.
 * - Day number seeded from epoch (days since 2026-02-24 launch)
 * - 1 attempt per day tracked in localStorage
 * - Share card text for post-solve sharing
 */

const LAUNCH_DATE = new Date('2026-02-24T00:00:00Z')
const DAILY_MYSTERY_ID = 'ashford-affair' // Only hardcoded mystery for now
const STORAGE_KEY = 'allsuspects_daily'

export interface DailyChallengeState {
  dayNumber: number         // Day 1, 2, 3...
  dateString: string        // "2026-02-24"
  mysteryId: string
  attempted: boolean        // Has user started today's challenge
  completed: boolean        // Has user finished (win or loss)
  score?: number
  rank?: string
  solveTime?: string
  streak: number            // Consecutive days completed
}

interface StoredDailyData {
  date: string
  completed: boolean
  score?: number
  rank?: string
  solveTime?: string
  streak: number
  lastCompletedDate?: string
}

/** Returns the UTC date string for "today" (YYYY-MM-DD) */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns which day number this is (Day 1 = Feb 24, 2026) */
export function getDayNumber(dateStr?: string): number {
  const target = dateStr ? new Date(dateStr + 'T00:00:00Z') : new Date(getTodayUTC() + 'T00:00:00Z')
  const diffMs = target.getTime() - LAUNCH_DATE.getTime()
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

/** Load stored daily data from localStorage */
function loadStoredData(): StoredDailyData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredDailyData
  } catch {
    return null
  }
}

/** Save daily data to localStorage */
function saveStoredData(data: StoredDailyData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
}

/** Get the full daily challenge state for today */
export function getDailyChallengeState(): DailyChallengeState {
  const today = getTodayUTC()
  const dayNumber = getDayNumber(today)
  const stored = loadStoredData()

  // No stored data or stored data is from a previous day
  if (!stored || stored.date !== today) {
    return {
      dayNumber,
      dateString: today,
      mysteryId: DAILY_MYSTERY_ID,
      attempted: false,
      completed: false,
      streak: stored?.lastCompletedDate ? computeStreakOnNewDay(stored) : 0,
    }
  }

  return {
    dayNumber,
    dateString: today,
    mysteryId: DAILY_MYSTERY_ID,
    attempted: true,
    completed: stored.completed,
    score: stored.score,
    rank: stored.rank,
    solveTime: stored.solveTime,
    streak: stored.streak,
  }
}

/** Mark that the user has started today's challenge */
export function markDailyChallengeAttempted(): void {
  const today = getTodayUTC()
  const existing = loadStoredData()

  // Don't overwrite a completed run
  if (existing?.date === today && existing.completed) return

  saveStoredData({
    date: today,
    completed: false,
    streak: existing?.streak ?? 0,
    lastCompletedDate: existing?.lastCompletedDate,
  })
}

/** Mark today's daily challenge as complete with the final score */
export function markDailyChallengeComplete(score: number, rank: string, solveTime: string): void {
  const today = getTodayUTC()
  const existing = loadStoredData()

  // Compute updated streak
  const yesterday = getYesterdayUTC()
  const prevStreak = existing?.streak ?? 0
  const lastCompleted = existing?.lastCompletedDate

  let newStreak: number
  if (lastCompleted === yesterday || lastCompleted === today) {
    // Completed yesterday (or already today) → extend/maintain streak
    newStreak = lastCompleted === today ? prevStreak : prevStreak + 1
  } else {
    // Streak broken
    newStreak = 1
  }

  saveStoredData({
    date: today,
    completed: true,
    score,
    rank,
    solveTime,
    streak: newStreak,
    lastCompletedDate: today,
  })
}

/** Check if today's daily challenge is already completed */
export function isDailyCompleted(): boolean {
  const stored = loadStoredData()
  return stored?.date === getTodayUTC() && stored.completed === true
}

/** Generate the share text for a completed daily challenge */
export function buildShareText(
  dayNumber: number,
  score: number,
  rank: string,
  solveTime: string,
  streak: number
): string {
  const streakLine = streak >= 2 ? `\n🔥 ${streak}-day streak` : ''
  return `🔍 All Suspects — Daily Mystery #${dayNumber}
⭐ Rank: ${rank} — ${score}/1000 pts
⏱️ Solved in ${solveTime}${streakLine}
allsuspects.slateworks.io`
}

// --- Helpers ---

function getYesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function computeStreakOnNewDay(stored: StoredDailyData): number {
  const yesterday = getYesterdayUTC()
  if (stored.lastCompletedDate === yesterday) {
    return stored.streak
  }
  return 0
}
