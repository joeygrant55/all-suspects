/**
 * Watson Types
 * Shared TypeScript interfaces for the Watson investigation assistant
 */

// ============================================================
// STATEMENT TYPES
// ============================================================

export interface Statement {
  id: string
  characterId: string
  characterName: string
  content: string
  topic: string
  timestamp: Date

  // Extracted claims
  claims: Claim[]

  // Analysis
  confidence: 'certain' | 'hedging' | 'nervous'
  pressureLevel: number
  questionAsked: string
}

export interface Claim {
  type: 'location' | 'time' | 'action' | 'observation' | 'relationship'
  subject: string
  value: string
  timeReference?: string
  locationReference?: string
}

// ============================================================
// CONTRADICTION TYPES
// ============================================================

export interface Contradiction {
  id: string
  type: 'direct' | 'logical' | 'timeline'
  severity: 'minor' | 'significant' | 'critical'

  statement1: {
    id: string
    characterId: string
    characterName: string
    content: string
    claim: Claim
  }

  statement2: {
    id: string
    characterId: string
    characterName: string
    content: string
    claim: Claim
  }

  explanation: string
  suggestedFollowUp: string[]

  resolved: boolean
  resolution?: string
}

// ============================================================
// THEORY TYPES
// ============================================================

export interface Theory {
  id: string

  accused: {
    characterId: string
    characterName: string
  }

  motive: string
  method: string
  opportunity: string

  supportingEvidence: string[]
  supportingStatements: string[]

  holes: string[]

  strength: number // 0-100
  evaluation?: TheoryEvaluation
}

export interface TheoryEvaluation {
  strength: number
  verdict: 'weak' | 'plausible' | 'strong' | 'compelling'

  supports: string[] // Evidence/statements that support
  contradicts: string[] // Evidence/statements that contradict
  missing: string[] // What would strengthen the theory

  watsonComment: string // In-character observation
}

// ============================================================
// SUGGESTION TYPES
// ============================================================

export interface Suggestion {
  id: string
  type: 'follow_up' | 'new_line' | 'evidence' | 'comparison'
  priority: 'low' | 'medium' | 'high'

  text: string
  reasoning: string

  targetCharacter?: string
  relatedContradiction?: string
  relatedEvidence?: string
}

// ============================================================
// ANALYSIS TYPES
// ============================================================

export interface WatsonAnalysis {
  newContradictions: Contradiction[]
  observations: string[]
  suggestions: Suggestion[]
  timelineUpdates: TimelineEvent[]
}

export interface TimelineEvent {
  time: string
  location: string
  description: string
  sources: string[] // Statement IDs that mention this
  confirmed: boolean // Multiple sources agree
  disputed: boolean // Sources disagree
}

// ============================================================
// INVESTIGATION STATE
// ============================================================

export interface InvestigationState {
  statements: Map<string, Statement>
  contradictions: Map<string, Contradiction>
  timeline: TimelineEvent[]
  theories: Map<string, Theory>
  suggestions: Suggestion[]
}

export interface InvestigationSummary {
  totalStatements: number
  statementsPerCharacter: Record<string, number>
  contradictionCount: number
  unresolvedContradictions: number
  timelineEvents: number
  confirmedEvents: number
  disputedEvents: number
  activeTheories: number
}

// ============================================================
// API TYPES
// ============================================================

export interface AnalyzeRequest {
  characterId: string
  characterName: string
  statement: string
  question: string
  pressure: number
}

export interface AnalyzeResponse {
  success: boolean
  analysis: WatsonAnalysis
  error?: string
}

export interface EvaluateTheoryRequest {
  accused: {
    characterId: string
    characterName: string
  }
  motive: string
  method: string
  opportunity: string
  supportingEvidence?: string[]
  supportingStatements?: string[]
}

export interface EvaluateTheoryResponse {
  success: boolean
  evaluation: TheoryEvaluation
  error?: string
}

export interface SuggestionsResponse {
  suggestions: Suggestion[]
  observations?: string[]
}

export interface SuspectSummaryResponse {
  characterId: string
  characterName: string
  statementsCount: number
  contradictionsInvolved: number
  summary: string
  keyStatements: {
    id: string
    content: string
    topic: string
  }[]
  emotionalPattern: string
  cooperationLevel: number
}

// ============================================================
// CHARACTER MAPPING
// ============================================================

export const CHARACTER_NAMES: Record<string, string> = {
  victoria: 'Victoria Ashford',
  thomas: 'Thomas Ashford',
  eleanor: 'Eleanor Crane',
  marcus: 'Dr. Marcus Webb',
  lillian: 'Lillian Moore',
  james: 'James',
}

export const CHARACTER_IDS = Object.keys(CHARACTER_NAMES) as readonly string[]
