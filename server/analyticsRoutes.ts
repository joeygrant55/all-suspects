/**
 * Analytics API Routes
 * 
 * Endpoints for tracking events and viewing metrics.
 */

import { Router } from 'express'
import {
  trackEvent,
  getOrCreateSession,
  getSession,
  getSummaryStats,
  getDailyMetrics,
  getEngagementMetrics,
  exportAnalytics,
  clearAnalytics,
  EventType
} from './analytics'

const router = Router()

/**
 * POST /api/analytics/session
 * Create or retrieve a session ID
 */
router.post('/session', (req, res) => {
  const { sessionId, userId } = req.body
  const id = getOrCreateSession(sessionId, userId)
  res.json({ sessionId: id })
})

/**
 * POST /api/analytics/track
 * Track an analytics event
 * 
 * Body: { sessionId, event, properties?, userId? }
 */
router.post('/track', (req, res) => {
  const { sessionId, event, properties, userId } = req.body

  if (!sessionId || !event) {
    return res.status(400).json({ error: 'Missing sessionId or event' })
  }

  // Validate event type
  const validEvents: EventType[] = [
    'session_start', 'session_end', 'mystery_select', 'game_start',
    'interrogation_start', 'interrogation_end', 'question_asked',
    'evidence_collected', 'evidence_examined', 'contradiction_found',
    'accusation_attempt', 'game_complete', 'game_abandon', 'share_click',
    'tutorial_complete'
  ]

  if (!validEvents.includes(event)) {
    return res.status(400).json({ error: `Invalid event type: ${event}` })
  }

  const tracked = trackEvent(sessionId, event, properties || {}, userId)
  res.json({ success: true, eventId: tracked.id })
})

/**
 * POST /api/analytics/batch
 * Track multiple events at once (for offline/batched sends)
 */
router.post('/batch', (req, res) => {
  const { events } = req.body

  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'events must be an array' })
  }

  const tracked = events.map(e => {
    try {
      return trackEvent(e.sessionId, e.event, e.properties || {}, e.userId)
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  res.json({ success: true, tracked: tracked.length })
})

/**
 * GET /api/analytics/session/:id
 * Get session details
 */
router.get('/session/:id', (req, res) => {
  const session = getSession(req.params.id)
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  res.json({
    ...session,
    suspectsInterrogated: Array.from(session.suspectsInterrogated),
    durationMs: session.lastActive - session.startTime,
    durationFormatted: formatDuration(session.lastActive - session.startTime)
  })
})

/**
 * GET /api/analytics/summary
 * Get summary stats (for dashboard)
 */
router.get('/summary', (_req, res) => {
  const stats = getSummaryStats()
  res.json(stats)
})

/**
 * GET /api/analytics/daily
 * Get daily metrics
 * Query: ?days=30
 */
router.get('/daily', (req, res) => {
  const days = parseInt(req.query.days as string) || 30
  const metrics = getDailyMetrics(days)
  res.json({ metrics })
})

/**
 * GET /api/analytics/engagement
 * Get engagement metrics
 */
router.get('/engagement', (_req, res) => {
  const metrics = getEngagementMetrics()
  res.json(metrics)
})

/**
 * GET /api/analytics/export
 * Export all analytics data (admin)
 */
router.get('/export', (_req, res) => {
  const data = exportAnalytics()
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="all-suspects-analytics.json"')
  res.json(data)
})

/**
 * POST /api/analytics/clear
 * Clear all analytics (admin/testing)
 */
router.post('/clear', (req, res) => {
  const { confirm } = req.body
  
  if (confirm !== 'DELETE_ALL_ANALYTICS') {
    return res.status(400).json({ 
      error: 'Must confirm deletion',
      hint: 'Send { "confirm": "DELETE_ALL_ANALYTICS" }'
    })
  }

  clearAnalytics()
  res.json({ success: true, message: 'Analytics cleared' })
})

// Helper: format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export default router
