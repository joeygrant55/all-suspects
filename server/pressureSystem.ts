/**
 * Pressure System for Character Interrogations
 *
 * Tracks how much pressure each character is under based on:
 * - Number of confrontations
 * - Evidence presented against them
 * - Contradictions exposed involving them
 *
 * Pressure affects how characters respond to questioning.
 */

export interface PressureState {
  level: number // 0-100
  confrontations: number
  evidencePresented: string[] // evidence IDs presented to this character
  contradictionsExposed: number
  lastInteractionTime: number
}

// Pressure thresholds
export const PRESSURE_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
  BREAKING: 100,
}

// Pressure configuration
const PRESSURE_CONFIG = {
  perConfrontation: 8, // Base pressure per question (increased from 5)
  perPointedQuestion: 12, // Extra pressure for pointed questions about sensitive topics
  perDirectAccusation: 20, // Direct accusations or calling out lies
  perEvidencePresented: 15, // Each piece of evidence adds 15
  perContradiction: 20, // Each contradiction adds 20
  decayPerMinute: 2, // Pressure decreases over time when not questioned
  maxPressure: 100,
}

// Keywords that indicate pointed, aggressive questioning
const POINTED_QUESTION_KEYWORDS = [
  // Accusations & skepticism
  'lie', 'lying', 'liar', 'truth', 'really', 'actually', 'honestly',
  'convenient', 'suspicious', 'strange', 'odd', 'coincidence',
  
  // Confrontational
  'why did you', 'explain why', 'how could you', 'prove it',
  'don\'t believe', 'impossible', 'contradict',
  
  // Motive & opportunity
  'motive', 'reason to kill', 'benefit', 'inherit', 'will', 'money',
  'debt', 'owe', 'financial', 'desperate',
  
  // Alibi challenges
  'alibi', 'where were you', 'what were you doing', 'who saw you',
  'witness', 'confirm', 'verify',
  
  // Relationships & secrets
  'affair', 'secret', 'hiding', 'relationship with', 'argue', 'fight',
  'hate', 'angry', 'threatened',
  
  // Evidence confrontation
  'evidence', 'proof', 'found', 'discovered', 'blood', 'weapon',
  'fingerprint', 'witness saw',
]

/**
 * Analyze question aggressiveness and return pressure multiplier
 */
function analyzeQuestionAggressiveness(question: string): number {
  const lowerQuestion = question.toLowerCase()
  
  // Direct accusations (highest pressure)
  if (
    lowerQuestion.includes('you killed') ||
    lowerQuestion.includes('you murdered') ||
    lowerQuestion.includes('you\'re the killer') ||
    lowerQuestion.includes('you are guilty') ||
    lowerQuestion.includes('you did it') ||
    lowerQuestion.includes('you\'re lying')
  ) {
    return PRESSURE_CONFIG.perDirectAccusation
  }
  
  // Count pointed keywords
  const pointedKeywordCount = POINTED_QUESTION_KEYWORDS.filter(keyword =>
    lowerQuestion.includes(keyword)
  ).length
  
  // Multiple pointed keywords = very aggressive question
  if (pointedKeywordCount >= 3) {
    return PRESSURE_CONFIG.perPointedQuestion + 5
  } else if (pointedKeywordCount >= 2) {
    return PRESSURE_CONFIG.perPointedQuestion + 3
  } else if (pointedKeywordCount >= 1) {
    return PRESSURE_CONFIG.perPointedQuestion
  }
  
  // Casual question - base pressure only
  return PRESSURE_CONFIG.perConfrontation
}

// In-memory pressure store
const pressureStore: Map<string, PressureState> = new Map()

/**
 * Get or initialize pressure state for a character
 */
export function getPressureState(characterId: string): PressureState {
  if (!pressureStore.has(characterId)) {
    pressureStore.set(characterId, {
      level: 0,
      confrontations: 0,
      evidencePresented: [],
      contradictionsExposed: 0,
      lastInteractionTime: Date.now(),
    })
  }
  return pressureStore.get(characterId)!
}

/**
 * Apply time-based pressure decay
 */
function applyPressureDecay(state: PressureState): void {
  const now = Date.now()
  const minutesElapsed = (now - state.lastInteractionTime) / 60000

  if (minutesElapsed > 1) {
    const decay = minutesElapsed * PRESSURE_CONFIG.decayPerMinute
    state.level = Math.max(0, state.level - decay)
  }

  state.lastInteractionTime = now
}

/**
 * Record a confrontation/question to the character
 * Now analyzes question aggressiveness for dynamic pressure
 * Supports tactic bonuses from interrogation tactics system
 */
export function recordConfrontation(characterId: string, question?: string, tacticBonus: number = 0): PressureState {
  const state = getPressureState(characterId)
  applyPressureDecay(state)

  state.confrontations++
  
  // Analyze question to determine pressure impact
  const basePressure = question
    ? analyzeQuestionAggressiveness(question)
    : PRESSURE_CONFIG.perConfrontation
  
  // Add tactic bonus (can be negative for failed bluffs)
  const totalPressure = basePressure + tacticBonus
  
  state.level = Math.min(
    PRESSURE_CONFIG.maxPressure,
    Math.max(0, state.level + totalPressure) // Don't go below 0
  )

  return state
}

/**
 * Record evidence being presented to the character
 */
export function recordEvidencePresented(
  characterId: string,
  evidenceId: string
): PressureState {
  const state = getPressureState(characterId)
  applyPressureDecay(state)

  // Only count each evidence piece once
  if (!state.evidencePresented.includes(evidenceId)) {
    state.evidencePresented.push(evidenceId)
    state.level = Math.min(
      PRESSURE_CONFIG.maxPressure,
      state.level + PRESSURE_CONFIG.perEvidencePresented
    )
  }

  return state
}

/**
 * Record a contradiction being exposed involving this character
 */
export function recordContradiction(characterId: string): PressureState {
  const state = getPressureState(characterId)
  applyPressureDecay(state)

  state.contradictionsExposed++
  state.level = Math.min(
    PRESSURE_CONFIG.maxPressure,
    state.level + PRESSURE_CONFIG.perContradiction
  )

  return state
}

/**
 * Get pressure level category
 */
export function getPressureCategory(
  level: number
): 'low' | 'medium' | 'high' | 'breaking' {
  if (level >= PRESSURE_THRESHOLDS.HIGH) return 'breaking'
  if (level >= PRESSURE_THRESHOLDS.MEDIUM) return 'high'
  if (level >= PRESSURE_THRESHOLDS.LOW) return 'medium'
  return 'low'
}

/**
 * Generate system prompt modifier based on pressure level
 */
export function getPressurePromptModifier(
  level: number,
  isGuilty: boolean
): string {
  const category = getPressureCategory(level)

  if (category === 'low') {
    return ''
  }

  if (category === 'medium') {
    return `
PRESSURE LEVEL: MODERATE
You are feeling somewhat pressured by the detective's questions. You should:
- Occasionally show signs of nervousness (fidgeting, sighing, looking away)
- Be more defensive about your alibis and actions
- Maybe show some irritation at repeated questioning
- Still maintain composure overall`
  }

  if (category === 'high') {
    const guiltyAddition = isGuilty
      ? `
- You might accidentally reference details you shouldn't know
- Your stories may become slightly inconsistent`
      : `
- You may become more cooperative to clear your name
- You might share information about others to deflect attention`

    return `
PRESSURE LEVEL: HIGH
You are under significant pressure. The detective is getting close. You should:
- Show visible signs of stress (stammering, sweating, voice cracking)
- Become more defensive and potentially hostile
- Make mistakes in your explanations
- Your emotional state should be unstable${guiltyAddition}`
  }

  // Breaking point
  if (isGuilty) {
    return `
PRESSURE LEVEL: CRITICAL - BREAKING POINT
The pressure is overwhelming. You are on the verge of breaking. You should:
- Be visibly distressed, possibly tearful or angry
- Your denials should sound hollow and desperate
- You may start to contradict your earlier statements significantly
- There's a chance (not certainty) you might confess or say something very incriminating
- Your composure is completely shattered
- If you continue to deny, it should sound unconvincing`
  } else {
    return `
PRESSURE LEVEL: CRITICAL
You are extremely stressed by this interrogation. You should:
- Be very emotional - angry, frightened, or distraught
- Desperately try to prove your innocence
- Maybe accuse others more directly
- Plead with the detective to believe you
- Your frustration at being suspected should be palpable`
  }
}

/**
 * Clear pressure for a character or all characters
 */
export function clearPressure(characterId?: string): void {
  if (characterId) {
    pressureStore.delete(characterId)
  } else {
    pressureStore.clear()
  }
}

/**
 * Get all pressure states (for debugging/API)
 */
export function getAllPressureStates(): Record<string, PressureState> {
  const result: Record<string, PressureState> = {}
  pressureStore.forEach((state, id) => {
    result[id] = { ...state }
  })
  return result
}
