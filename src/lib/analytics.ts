/**
 * All Suspects Client Analytics
 * 
 * Lightweight analytics tracking for the game client.
 * Automatically handles session management and batched sends.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const STORAGE_KEY = 'all-suspects-session'
const BATCH_INTERVAL = 5000 // 5 seconds

type EventType =
  | 'session_start'
  | 'session_end'
  | 'mystery_select'
  | 'game_start'
  | 'interrogation_start'
  | 'interrogation_end'
  | 'question_asked'
  | 'evidence_collected'
  | 'evidence_examined'
  | 'contradiction_found'
  | 'accusation_attempt'
  | 'game_complete'
  | 'game_abandon'
  | 'share_click'
  | 'tutorial_complete'

interface QueuedEvent {
  sessionId: string
  event: EventType
  properties: Record<string, unknown>
  timestamp: number
}

class Analytics {
  private sessionId: string | null = null
  private eventQueue: QueuedEvent[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private gameStartTime: number | null = null

  constructor() {
    // Initialize session
    this.initSession()
    
    // Set up batched sending
    this.startBatchTimer()
    
    // Track page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush())
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush()
        }
      })
    }
  }

  private initSession(): void {
    // Check for existing session
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // Session expires after 30 minutes of inactivity
        if (Date.now() - data.lastActive < 30 * 60 * 1000) {
          this.sessionId = data.sessionId
          data.lastActive = Date.now()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
          return
        }
      }
    } catch (e) {
      console.warn('[Analytics] Failed to load session:', e)
    }

    // Create new session
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId: this.sessionId,
      lastActive: Date.now()
    }))
    
    // Track session start
    this.track('session_start')
  }

  private startBatchTimer(): void {
    if (this.flushTimer) return
    
    this.flushTimer = setInterval(() => {
      this.flush()
    }, BATCH_INTERVAL)
  }

  private updateLastActive(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        data.lastActive = Date.now()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Track an analytics event
   */
  track(event: EventType, properties: Record<string, unknown> = {}): void {
    if (!this.sessionId) {
      console.warn('[Analytics] No session - skipping event:', event)
      return
    }

    this.eventQueue.push({
      sessionId: this.sessionId,
      event,
      properties,
      timestamp: Date.now()
    })

    this.updateLastActive()

    // Immediately flush important events
    const importantEvents: EventType[] = ['game_complete', 'game_abandon', 'accusation_attempt']
    if (importantEvents.includes(event)) {
      this.flush()
    }
  }

  /**
   * Flush queued events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon && document.visibilityState === 'hidden') {
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' })
        navigator.sendBeacon(`${API_BASE}/analytics/batch`, blob)
      } else {
        await fetch(`${API_BASE}/analytics/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        })
      }
    } catch (e) {
      console.warn('[Analytics] Failed to flush events:', e)
      // Re-queue events on failure
      this.eventQueue.unshift(...events)
    }
  }

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Track mystery selection
   */
  mysterySelected(mysteryId: string, mysteryTitle?: string): void {
    this.track('mystery_select', { mysteryId, mysteryTitle })
  }

  /**
   * Track game start
   */
  gameStarted(mysteryId: string, options?: Record<string, unknown>): void {
    this.gameStartTime = Date.now()
    this.track('game_start', { mysteryId, ...options })
  }

  /**
   * Track interrogation start
   */
  interrogationStarted(characterId: string, characterName?: string): void {
    this.track('interrogation_start', { characterId, characterName })
  }

  /**
   * Track interrogation end
   */
  interrogationEnded(characterId: string, questionsAsked: number): void {
    this.track('interrogation_end', { characterId, questionsAsked })
  }

  /**
   * Track a question asked
   */
  questionAsked(characterId: string, questionType?: string): void {
    this.track('question_asked', { characterId, questionType })
  }

  /**
   * Track evidence collected
   */
  evidenceCollected(evidenceId: string, evidenceType?: string): void {
    this.track('evidence_collected', { evidenceId, evidenceType })
  }

  /**
   * Track evidence examined
   */
  evidenceExamined(evidenceId: string): void {
    this.track('evidence_examined', { evidenceId })
  }

  /**
   * Track contradiction found
   */
  contradictionFound(character1Id: string, character2Id: string, severity?: string): void {
    this.track('contradiction_found', { character1Id, character2Id, severity })
  }

  /**
   * Track accusation attempt
   */
  accusationMade(accusedId: string, isCorrect: boolean, attemptNumber: number): void {
    this.track('accusation_attempt', { 
      accusedId, 
      isCorrect, 
      attemptNumber,
      timeToAccusationMs: this.gameStartTime ? Date.now() - this.gameStartTime : null
    })
  }

  /**
   * Track game completion
   */
  gameCompleted(
    isCorrect: boolean, 
    accusedId: string, 
    stats?: { 
      questionsAsked?: number
      suspectsInterrogated?: number
      evidenceCollected?: number
      contradictionsFound?: number
      accusationAttempts?: number 
    }
  ): void {
    const solveTimeMs = this.gameStartTime ? Date.now() - this.gameStartTime : null
    this.track('game_complete', {
      isCorrect,
      accusedId,
      solveTimeMs,
      solveTimeFormatted: solveTimeMs ? this.formatDuration(solveTimeMs) : null,
      ...stats
    })
    this.gameStartTime = null
  }

  /**
   * Track game abandonment
   */
  gameAbandoned(stats?: { 
    questionsAsked?: number
    lastScreen?: string
    lastCharacter?: string
  }): void {
    const playTimeMs = this.gameStartTime ? Date.now() - this.gameStartTime : null
    this.track('game_abandon', {
      playTimeMs,
      ...stats
    })
    this.gameStartTime = null
  }

  /**
   * Track share click
   */
  shareClicked(shareType: 'link' | 'twitter' | 'facebook' | 'copy'): void {
    this.track('share_click', { shareType })
  }

  /**
   * Track tutorial completion
   */
  tutorialCompleted(): void {
    this.track('tutorial_complete')
  }

  // Helper
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }
}

// Singleton instance
export const analytics = new Analytics()

// Default export
export default analytics
