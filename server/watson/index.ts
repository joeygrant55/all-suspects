/**
 * Watson Investigation Assistant
 * Export all Watson modules
 */

// Main agent
export { WatsonAgent, getWatson, resetWatson } from './watsonAgent'

// Statement tracking
export {
  trackStatement,
  getAllStatements,
  getStatementsByCharacter,
  getStatementsByTopic,
  getStatementsAboutEntity,
  getCharacterProfile,
  getAllCharacterProfiles,
  getStatementById,
  clearStatementTracker,
  exportTrackerData,
} from './statementTracker'

export type { TrackedStatement, Claim, EmotionalState, CharacterProfile } from './statementTracker'

// Contradiction detection
export {
  findPotentialContradictions,
  analyzeForContradiction,
  checkStatementForContradictions,
  getAllContradictions,
  getContradictionsByCharacter,
  getContradictionsByType,
  getContradictionsBySeverity,
  getContradictionPatterns,
  getContradictionSummary,
  clearContradictions,
  exportContradictionData,
} from './contradictionFinder'

export type { WatsonContradiction, ContradictionPattern } from './contradictionFinder'

// Theory evaluation
export {
  evaluateTheory,
  quickEvaluateTheory,
  getEvaluatedTheories,
  getTheoryEvaluation,
  clearTheoryEvaluations,
} from './theoryEvaluator'

export type { PlayerTheory, TheoryEvaluation } from './theoryEvaluator'

// Suggestion engine
export {
  generateSuggestions,
  extractTimelineEvents,
  getTimelineEvents,
  addTimelineEvent,
  generateObservations,
  clearSuggestions,
  getAllSuggestions,
  markSuggestionSeen,
} from './suggestionEngine'

// Types
export type {
  Statement,
  Contradiction,
  Theory,
  Suggestion,
  WatsonAnalysis,
  TimelineEvent,
  InvestigationState,
  InvestigationSummary,
  AnalyzeRequest,
  AnalyzeResponse,
  EvaluateTheoryRequest,
  EvaluateTheoryResponse,
  SuggestionsResponse,
  SuspectSummaryResponse,
} from './types'

export { CHARACTER_NAMES, CHARACTER_IDS } from './types'
