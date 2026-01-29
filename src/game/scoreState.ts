import { create } from 'zustand'

export interface GameScore {
  totalScore: number        // 0-1000
  timeBonus: number         // Faster = more points (0-300)
  evidenceBonus: number     // More evidence = more points (0-200)
  efficiencyBonus: number   // Fewer questions = more points (0-200)
  contradictionBonus: number // Finding contradictions (0-150)
  accuracyPenalty: number   // Wrong accusations lose points (-100 each)
  hintPenalty: number       // Using hints loses points (-25 each)
  rank: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  solveTimeFormatted: string // "12m 34s"
  detective_title: string   // Fun title based on score
}

interface ScoreState {
  // Timing
  gameStartTime: number | null
  gameEndTime: number | null
  totalPlayTimeMs: number
  isPaused: boolean
  pausedAt: number | null

  // Score components
  questionsAsked: number
  evidenceFound: number
  contradictionsDiscovered: number
  roomsExplored: Set<string>
  wrongAccusations: number
  hintsUsed: number

  // Computed
  calculateScore: () => GameScore

  // Actions
  startTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  endTimer: () => void
  recordQuestion: () => void
  recordEvidenceFound: () => void
  recordContradiction: () => void
  recordRoomExplored: (roomId: string) => void
  recordWrongAccusation: () => void
  recordHintUsed: () => void
  resetScore: () => void
  getElapsedTimeMs: () => number
}

const TOTAL_EVIDENCE = 9 // Based on EVIDENCE_DATABASE

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

const getRank = (score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 900) return 'S'
  if (score >= 750) return 'A'
  if (score >= 600) return 'B'
  if (score >= 450) return 'C'
  if (score >= 300) return 'D'
  return 'F'
}

const getDetectiveTitle = (rank: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'): string => {
  const titles = {
    S: 'Master Detective',
    A: 'Senior Inspector',
    B: 'Detective',
    C: 'Junior Detective',
    D: 'Rookie',
    F: 'Suspended',
  }
  return titles[rank]
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  // Initial state
  gameStartTime: null,
  gameEndTime: null,
  totalPlayTimeMs: 0,
  isPaused: false,
  pausedAt: null,

  questionsAsked: 0,
  evidenceFound: 0,
  contradictionsDiscovered: 0,
  roomsExplored: new Set<string>(),
  wrongAccusations: 0,
  hintsUsed: 0,

  // Get elapsed time
  getElapsedTimeMs: () => {
    const state = get()
    if (!state.gameStartTime) return 0

    if (state.gameEndTime) {
      // Game ended, use end time
      return state.totalPlayTimeMs
    }

    if (state.isPaused && state.pausedAt) {
      // Currently paused, use paused time
      return state.totalPlayTimeMs
    }

    // Currently running, calculate current time
    return state.totalPlayTimeMs + (Date.now() - state.gameStartTime)
  },

  // Calculate score
  calculateScore: () => {
    const state = get()
    const elapsedMs = state.getElapsedTimeMs()
    const elapsedMinutes = elapsedMs / 60000

    // Time bonus: Full 300pts if solved in <10min, scales down to 0 at 60min
    const timeBonus = Math.max(
      0,
      Math.min(300, Math.round(300 * (1 - (elapsedMinutes - 10) / 50)))
    )

    // Evidence bonus: (evidence found / total evidence) * 200
    const evidenceBonus = Math.round((state.evidenceFound / TOTAL_EVIDENCE) * 200)

    // Efficiency: max 200pts if solved with ≤10 questions, scales down
    const efficiencyBonus = Math.max(
      0,
      Math.min(200, Math.round(200 * (1 - Math.max(0, state.questionsAsked - 10) / 40)))
    )

    // Contradiction bonus: 50pts per contradiction found (max 150)
    const contradictionBonus = Math.min(150, state.contradictionsDiscovered * 50)

    // Penalties
    const accuracyPenalty = state.wrongAccusations * -100
    const hintPenalty = state.hintsUsed * -25

    // Total score
    const totalScore = Math.max(
      0,
      Math.min(
        1000,
        1000 + timeBonus + evidenceBonus + efficiencyBonus + contradictionBonus + accuracyPenalty + hintPenalty
      )
    )

    const rank = getRank(totalScore)
    const detective_title = getDetectiveTitle(rank)
    const solveTimeFormatted = formatTime(elapsedMs)

    return {
      totalScore: Math.round(totalScore),
      timeBonus,
      evidenceBonus,
      efficiencyBonus,
      contradictionBonus,
      accuracyPenalty,
      hintPenalty,
      rank,
      solveTimeFormatted,
      detective_title,
    }
  },

  // Timer actions
  startTimer: () => {
    const now = Date.now()
    set({
      gameStartTime: now,
      gameEndTime: null,
      totalPlayTimeMs: 0,
      isPaused: false,
      pausedAt: null,
    })
  },

  pauseTimer: () => {
    const state = get()
    if (!state.gameStartTime || state.isPaused) return

    const now = Date.now()
    const elapsed = now - state.gameStartTime
    set({
      isPaused: true,
      pausedAt: now,
      totalPlayTimeMs: state.totalPlayTimeMs + elapsed,
      gameStartTime: now, // Reset start time for next resume
    })
  },

  resumeTimer: () => {
    const state = get()
    if (!state.isPaused) return

    set({
      isPaused: false,
      pausedAt: null,
      gameStartTime: Date.now(),
    })
  },

  endTimer: () => {
    const state = get()
    if (!state.gameStartTime) return

    const now = Date.now()
    const elapsed = state.isPaused ? 0 : now - state.gameStartTime
    set({
      gameEndTime: now,
      totalPlayTimeMs: state.totalPlayTimeMs + elapsed,
      isPaused: false,
    })
  },

  // Score tracking actions
  recordQuestion: () =>
    set((state) => ({ questionsAsked: state.questionsAsked + 1 })),

  recordEvidenceFound: () =>
    set((state) => ({ evidenceFound: state.evidenceFound + 1 })),

  recordContradiction: () =>
    set((state) => ({ contradictionsDiscovered: state.contradictionsDiscovered + 1 })),

  recordRoomExplored: (roomId: string) =>
    set((state) => {
      const newRooms = new Set(state.roomsExplored)
      newRooms.add(roomId)
      return { roomsExplored: newRooms }
    }),

  recordWrongAccusation: () =>
    set((state) => ({ wrongAccusations: state.wrongAccusations + 1 })),

  recordHintUsed: () =>
    set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

  resetScore: () =>
    set({
      gameStartTime: null,
      gameEndTime: null,
      totalPlayTimeMs: 0,
      isPaused: false,
      pausedAt: null,
      questionsAsked: 0,
      evidenceFound: 0,
      contradictionsDiscovered: 0,
      roomsExplored: new Set<string>(),
      wrongAccusations: 0,
      hintsUsed: 0,
    }),
}))
