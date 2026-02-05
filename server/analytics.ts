/**
 * All Suspects Analytics System
 * 
 * Lightweight event tracking for PMF validation.
 * Tracks key engagement metrics without external dependencies.
 * 
 * Events stored in memory + persisted to JSON file for analysis.
 */

import * as fs from 'fs'
import * as path from 'path'

// Event types we care about for PMF
export type AnalyticsEvent = {
  id: string
  sessionId: string
  userId?: string // Optional - anonymous by default
  timestamp: number
  event: EventType
  properties: Record<string, unknown>
}

export type EventType =
  | 'session_start'      // User opens the app
  | 'session_end'        // User leaves (estimated via inactivity)
  | 'mystery_select'     // User picks a mystery
  | 'game_start'         // Mystery generation complete, game begins
  | 'interrogation_start' // Started talking to a suspect
  | 'interrogation_end'  // Finished with a suspect
  | 'question_asked'     // Individual question
  | 'evidence_collected' // Found evidence
  | 'evidence_examined'  // Examined/used evidence
  | 'contradiction_found' // Detected a contradiction
  | 'accusation_attempt' // Made an accusation
  | 'game_complete'      // Solved the mystery
  | 'game_abandon'       // Left without solving
  | 'share_click'        // Clicked share button
  | 'tutorial_complete'  // Finished tutorial

// Session tracking
interface Session {
  id: string
  startTime: number
  lastActive: number
  userId?: string
  mysteryId?: string
  questionsAsked: number
  suspectsInterrogated: Set<string>
  evidenceCollected: number
  contradictionsFound: number
  accusationAttempts: number
  completed: boolean
  completedAt?: number
  solveTime?: number // ms from game_start to game_complete
}

// In-memory storage
const events: AnalyticsEvent[] = []
const sessions: Map<string, Session> = new Map()

// Persistence
const DATA_DIR = path.join(process.cwd(), 'data')
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.json')
const SESSIONS_FILE = path.join(DATA_DIR, 'analytics-sessions.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Load existing data on startup
function loadData() {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))
      events.push(...data)
      console.log(`[ANALYTICS] Loaded ${data.length} events`)
    }
  } catch (err) {
    console.error('[ANALYTICS] Failed to load events:', err)
  }

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
      for (const [id, session] of Object.entries(data)) {
        const s = session as Session
        s.suspectsInterrogated = new Set(s.suspectsInterrogated as unknown as string[])
        sessions.set(id, s)
      }
      console.log(`[ANALYTICS] Loaded ${sessions.size} sessions`)
    }
  } catch (err) {
    console.error('[ANALYTICS] Failed to load sessions:', err)
  }
}

// Save data periodically
function saveData() {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2))
    
    // Convert Sets to arrays for JSON serialization
    const sessionsObj: Record<string, unknown> = {}
    for (const [id, session] of sessions.entries()) {
      sessionsObj[id] = {
        ...session,
        suspectsInterrogated: Array.from(session.suspectsInterrogated)
      }
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsObj, null, 2))
  } catch (err) {
    console.error('[ANALYTICS] Failed to save data:', err)
  }
}

// Auto-save every 30 seconds
setInterval(saveData, 30000)

// Load data on module init
loadData()

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Track an event
export function trackEvent(
  sessionId: string,
  event: EventType,
  properties: Record<string, unknown> = {},
  userId?: string
): AnalyticsEvent {
  const analyticsEvent: AnalyticsEvent = {
    id: generateId(),
    sessionId,
    userId,
    timestamp: Date.now(),
    event,
    properties
  }

  events.push(analyticsEvent)
  
  // Update session
  let session = sessions.get(sessionId)
  if (!session) {
    session = {
      id: sessionId,
      startTime: Date.now(),
      lastActive: Date.now(),
      userId,
      questionsAsked: 0,
      suspectsInterrogated: new Set(),
      evidenceCollected: 0,
      contradictionsFound: 0,
      accusationAttempts: 0,
      completed: false
    }
    sessions.set(sessionId, session)
  }

  session.lastActive = Date.now()

  // Update session stats based on event type
  switch (event) {
    case 'game_start':
      session.mysteryId = properties.mysteryId as string
      break
    case 'question_asked':
      session.questionsAsked++
      break
    case 'interrogation_start':
      session.suspectsInterrogated.add(properties.characterId as string)
      break
    case 'evidence_collected':
      session.evidenceCollected++
      break
    case 'contradiction_found':
      session.contradictionsFound++
      break
    case 'accusation_attempt':
      session.accusationAttempts++
      break
    case 'game_complete':
      session.completed = true
      session.completedAt = Date.now()
      session.solveTime = session.completedAt - session.startTime
      break
  }

  console.log(`[ANALYTICS] ${event} | session=${sessionId.slice(0, 8)}... | ${JSON.stringify(properties)}`)
  
  return analyticsEvent
}

// Get or create session
export function getOrCreateSession(sessionId?: string, userId?: string): string {
  if (sessionId && sessions.has(sessionId)) {
    return sessionId
  }

  const newSessionId = sessionId || generateId()
  sessions.set(newSessionId, {
    id: newSessionId,
    startTime: Date.now(),
    lastActive: Date.now(),
    userId,
    questionsAsked: 0,
    suspectsInterrogated: new Set(),
    evidenceCollected: 0,
    contradictionsFound: 0,
    accusationAttempts: 0,
    completed: false
  })

  trackEvent(newSessionId, 'session_start', {}, userId)
  return newSessionId
}

// Get session
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId)
}

// ============================================================
// METRICS & ANALYTICS QUERIES
// ============================================================

export interface DailyMetrics {
  date: string
  sessions: number
  uniqueUsers: number
  gamesStarted: number
  gamesCompleted: number
  completionRate: number
  avgQuestionsPerSession: number
  avgSuspectsInterrogated: number
  avgSessionDurationMs: number
  totalQuestions: number
  totalContradictions: number
  totalAccusations: number
}

export interface RetentionMetrics {
  d1: number // % returned day 1
  d7: number // % returned day 7
  d30: number // % returned day 30
  cohortSize: number
}

export interface EngagementMetrics {
  avgSessionDuration: number
  avgQuestionsPerGame: number
  avgSuspectsPerGame: number
  completionRate: number
  avgSolveTimeMs: number
  abandonmentRate: number
}

// Get daily metrics
export function getDailyMetrics(daysBack: number = 30): DailyMetrics[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const metrics: DailyMetrics[] = []

  for (let i = 0; i < daysBack; i++) {
    const dayStart = now - (i + 1) * dayMs
    const dayEnd = now - i * dayMs
    const dateStr = new Date(dayStart).toISOString().split('T')[0]

    // Filter events for this day
    const dayEvents = events.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd)
    const daySessions = Array.from(sessions.values()).filter(
      s => s.startTime >= dayStart && s.startTime < dayEnd
    )

    const uniqueUsers = new Set(dayEvents.map(e => e.userId || e.sessionId))
    const gamesStarted = dayEvents.filter(e => e.event === 'game_start').length
    const gamesCompleted = dayEvents.filter(e => e.event === 'game_complete').length
    const questions = dayEvents.filter(e => e.event === 'question_asked').length
    const contradictions = dayEvents.filter(e => e.event === 'contradiction_found').length
    const accusations = dayEvents.filter(e => e.event === 'accusation_attempt').length

    const avgQuestions = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + s.questionsAsked, 0) / daySessions.length
      : 0

    const avgSuspects = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + s.suspectsInterrogated.size, 0) / daySessions.length
      : 0

    const avgDuration = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + (s.lastActive - s.startTime), 0) / daySessions.length
      : 0

    metrics.push({
      date: dateStr,
      sessions: daySessions.length,
      uniqueUsers: uniqueUsers.size,
      gamesStarted,
      gamesCompleted,
      completionRate: gamesStarted > 0 ? (gamesCompleted / gamesStarted) * 100 : 0,
      avgQuestionsPerSession: Math.round(avgQuestions * 10) / 10,
      avgSuspectsInterrogated: Math.round(avgSuspects * 10) / 10,
      avgSessionDurationMs: Math.round(avgDuration),
      totalQuestions: questions,
      totalContradictions: contradictions,
      totalAccusations: accusations
    })
  }

  return metrics.reverse() // Oldest first
}

// Get overall engagement metrics
export function getEngagementMetrics(): EngagementMetrics {
  const allSessions = Array.from(sessions.values())
  
  if (allSessions.length === 0) {
    return {
      avgSessionDuration: 0,
      avgQuestionsPerGame: 0,
      avgSuspectsPerGame: 0,
      completionRate: 0,
      avgSolveTimeMs: 0,
      abandonmentRate: 0
    }
  }

  const completedSessions = allSessions.filter(s => s.completed)
  const abandonedSessions = allSessions.filter(s => !s.completed && s.questionsAsked > 0)

  const avgDuration = allSessions.reduce((sum, s) => sum + (s.lastActive - s.startTime), 0) / allSessions.length
  const avgQuestions = allSessions.reduce((sum, s) => sum + s.questionsAsked, 0) / allSessions.length
  const avgSuspects = allSessions.reduce((sum, s) => sum + s.suspectsInterrogated.size, 0) / allSessions.length
  const avgSolveTime = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.solveTime || 0), 0) / completedSessions.length
    : 0

  return {
    avgSessionDuration: Math.round(avgDuration / 1000), // seconds
    avgQuestionsPerGame: Math.round(avgQuestions * 10) / 10,
    avgSuspectsPerGame: Math.round(avgSuspects * 10) / 10,
    completionRate: Math.round((completedSessions.length / allSessions.length) * 100),
    avgSolveTimeMs: Math.round(avgSolveTime),
    abandonmentRate: Math.round((abandonedSessions.length / allSessions.length) * 100)
  }
}

// Get summary stats
export function getSummaryStats() {
  const allSessions = Array.from(sessions.values())
  const completedSessions = allSessions.filter(s => s.completed)
  
  // Last 24 hours
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const recentSessions = allSessions.filter(s => s.startTime > dayAgo)
  const recentCompleted = completedSessions.filter(s => s.startTime > dayAgo)

  // Last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklySessions = allSessions.filter(s => s.startTime > weekAgo)
  const weeklyCompleted = completedSessions.filter(s => s.startTime > weekAgo)

  return {
    allTime: {
      totalSessions: allSessions.length,
      completedGames: completedSessions.length,
      totalQuestions: events.filter(e => e.event === 'question_asked').length,
      totalContradictions: events.filter(e => e.event === 'contradiction_found').length
    },
    last24Hours: {
      sessions: recentSessions.length,
      completed: recentCompleted.length,
      completionRate: recentSessions.length > 0 
        ? Math.round((recentCompleted.length / recentSessions.length) * 100) 
        : 0
    },
    last7Days: {
      sessions: weeklySessions.length,
      completed: weeklyCompleted.length,
      completionRate: weeklySessions.length > 0
        ? Math.round((weeklyCompleted.length / weeklySessions.length) * 100)
        : 0
    },
    engagement: getEngagementMetrics()
  }
}

// Get raw data for export
export function exportAnalytics() {
  return {
    events,
    sessions: Array.from(sessions.entries()).map(([id, s]) => ({
      ...s,
      suspectsInterrogated: Array.from(s.suspectsInterrogated)
    })),
    exportedAt: new Date().toISOString()
  }
}

// Clear analytics (for testing)
export function clearAnalytics() {
  events.length = 0
  sessions.clear()
  try {
    if (fs.existsSync(EVENTS_FILE)) fs.unlinkSync(EVENTS_FILE)
    if (fs.existsSync(SESSIONS_FILE)) fs.unlinkSync(SESSIONS_FILE)
  } catch (err) {
    console.error('[ANALYTICS] Failed to clear files:', err)
  }
}

console.log('[ANALYTICS] Module initialized')
