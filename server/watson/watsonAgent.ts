/**
 * Watson Agent
 * Main investigation assistant that coordinates tracking, contradiction detection,
 * theory evaluation, and suggestions.
 *
 * Design Principles:
 * 1. Assist, don't solve - Watson observes and organizes, never reveals the killer
 * 2. Socratic guidance - Ask questions, don't give answers
 * 3. Period appropriate - 1920s vocabulary and manners
 * 4. Respectful of player - Never condescending, treats player as lead detective
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  trackStatement,
  getAllStatements,
  getStatementsByCharacter,
  getAllCharacterProfiles,
  clearStatementTracker,
  CharacterProfile,
  TrackedStatement,
} from './statementTracker'
import {
  checkStatementForContradictions,
  getAllContradictions,
  getContradictionsByCharacter,
  getContradictionSummary,
  clearContradictions,
  WatsonContradiction,
} from './contradictionFinder'
import {
  evaluateTheory,
  quickEvaluateTheory,
  getEvaluatedTheories,
  clearTheoryEvaluations,
  PlayerTheory,
  TheoryEvaluation,
} from './theoryEvaluator'
import {
  generateSuggestions,
  extractTimelineEvents,
  getTimelineEvents,
  generateObservations,
  clearSuggestions,
} from './suggestionEngine'
import {
  WatsonAnalysis,
  Suggestion,
  TimelineEvent,
  SuspectSummaryResponse,
  InvestigationSummary,
  CHARACTER_NAMES,
} from './types'

// Watson system prompt for personality
const WATSON_SYSTEM_PROMPT = `You are Watson, a sharp-minded detective's assistant in a 1920s murder mystery.

Your role is to ASSIST the lead detective (the player), not to SOLVE the case yourself.

Your capabilities:
- Track and organize all statements from suspects
- Notice contradictions and inconsistencies
- Maintain a timeline of events
- Evaluate theories against evidence
- Suggest productive lines of inquiry

Your limitations (IMPORTANT):
- NEVER directly reveal who the killer is
- NEVER say "X is definitely lying" - say "X's statement conflicts with Y's"
- NEVER solve the case - only organize information
- Frame insights as observations, not conclusions

Personality:
- Observant and methodical ("I've noted that...")
- Respectful of the detective's intelligence
- Occasionally dry wit
- 1920s vocabulary (but not cartoonishly so)
- Humble ("Perhaps worth considering..." not "You should...")`

/**
 * Watson Agent class - singleton instance
 */
export class WatsonAgent {
  private anthropic: Anthropic
  private conversationHistory: Anthropic.MessageParam[] = []

  constructor() {
    this.anthropic = new Anthropic()
  }

  /**
   * Process a new statement from an interrogation
   * This is the main entry point called after each character response
   */
  async processStatement(
    characterId: string,
    characterName: string,
    statement: string,
    context: { question: string; pressure: number }
  ): Promise<WatsonAnalysis> {
    // Track the statement with enhanced analysis
    const trackedStatement = trackStatement(characterId, context.question, statement)

    // Check for contradictions with existing statements
    const newContradictions = await checkStatementForContradictions(
      this.anthropic,
      trackedStatement
    )

    // Extract timeline events
    const allStatements = getAllStatements()
    const timelineUpdates = extractTimelineEvents(allStatements)

    // Generate suggestions based on current state
    const suggestions = await this.generateContextualSuggestions(trackedStatement)

    // Generate observations
    const observations = await this.generateObservations(trackedStatement, newContradictions)

    // Update conversation history for context
    this.conversationHistory.push({
      role: 'user',
      content: `${characterName} was asked: "${context.question}"\nThey responded: "${statement.slice(0, 500)}..."`,
    })

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    return {
      newContradictions: newContradictions.map((c) => this.convertToContradiction(c)),
      observations,
      suggestions,
      timelineUpdates,
    }
  }

  /**
   * Convert internal contradiction format to API format
   */
  private convertToContradiction(c: WatsonContradiction): WatsonAnalysis['newContradictions'][0] {
    return {
      id: c.id,
      type: c.type === 'direct' || c.type === 'logical' || c.type === 'timeline' ? c.type : 'direct',
      severity: c.severity === 'critical' ? 'critical' : c.severity,
      statement1: {
        id: c.statement1.id,
        characterId: c.statement1.characterId,
        characterName: c.statement1.characterName,
        content: c.statement1.content,
        claim: c.statement1.claims[0] || { type: 'observation', subject: 'unknown', value: '' },
      },
      statement2: {
        id: c.statement2.id,
        characterId: c.statement2.characterId,
        characterName: c.statement2.characterName,
        content: c.statement2.content,
        claim: c.statement2.claims[0] || { type: 'observation', subject: 'unknown', value: '' },
      },
      explanation: c.explanation,
      suggestedFollowUp: c.suggestedQuestions,
      resolved: false,
    }
  }

  /**
   * Generate contextual suggestions based on the new statement
   */
  private async generateContextualSuggestions(statement: TrackedStatement): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []

    // If statement was evasive, suggest follow-up
    if (statement.isEvasive) {
      suggestions.push({
        id: `sugg-evasive-${statement.id}`,
        type: 'follow_up',
        priority: 'high',
        text: `${statement.characterName} seemed evasive. Press further on this topic.`,
        reasoning: 'Evasive responses often indicate hidden information.',
        targetCharacter: statement.characterId,
      })
    }

    // If emotional intensity is high, note it
    if (statement.emotionalState.intensity > 0.7) {
      suggestions.push({
        id: `sugg-emotional-${statement.id}`,
        type: 'follow_up',
        priority: 'medium',
        text: `${statement.characterName} showed strong ${statement.emotionalState.primary} emotions.`,
        reasoning: 'Strong emotional reactions may reveal deeper involvement.',
        targetCharacter: statement.characterId,
      })
    }

    // Get more general suggestions
    const generalSuggestions = await generateSuggestions(this.anthropic)
    suggestions.push(...generalSuggestions)

    return suggestions.slice(0, 5)
  }

  /**
   * Generate observations about the new statement
   */
  private async generateObservations(
    statement: TrackedStatement,
    newContradictions: WatsonContradiction[]
  ): Promise<string[]> {
    const observations: string[] = []

    // Immediate observations about the statement
    if (statement.confidence < 0.5) {
      observations.push(
        `I note ${statement.characterName} seemed uncertain in their response - hedging, perhaps?`
      )
    }

    if (newContradictions.length > 0) {
      observations.push(
        `Most interesting - this statement appears to conflict with previous testimony.`
      )
    }

    // Get AI-generated observations
    const aiObservations = await generateObservations(this.anthropic)
    observations.push(...aiObservations)

    return observations.slice(0, 3)
  }

  /**
   * Evaluate a player's theory
   */
  async evaluateTheory(theory: {
    accusedId: string
    accusedName: string
    motive: string
    method: string
    opportunity: string
    supportingEvidence?: string[]
    supportingStatements?: string[]
  }): Promise<TheoryEvaluation> {
    const playerTheory: PlayerTheory = {
      id: `theory-${Date.now()}`,
      suspect: theory.accusedId,
      motive: theory.motive,
      opportunity: theory.opportunity,
      method: theory.method,
      evidence: theory.supportingEvidence || [],
      submittedAt: Date.now(),
    }

    return evaluateTheory(this.anthropic, playerTheory)
  }

  /**
   * Quick theory evaluation (no AI, for real-time feedback)
   */
  quickEvaluateTheory(theory: {
    accusedId: string
    motive: string
    opportunity: string
  }): { score: number; grade: string; verdict: string } {
    const playerTheory: PlayerTheory = {
      id: `theory-quick-${Date.now()}`,
      suspect: theory.accusedId,
      motive: theory.motive,
      opportunity: theory.opportunity,
      evidence: [],
      submittedAt: Date.now(),
    }

    return quickEvaluateTheory(playerTheory)
  }

  /**
   * Get suggestions when player seems stuck
   */
  async getSuggestions(): Promise<Suggestion[]> {
    return generateSuggestions(this.anthropic)
  }

  /**
   * Get all detected contradictions
   */
  getContradictions(): WatsonContradiction[] {
    return getAllContradictions()
  }

  /**
   * Get contradictions for specific character
   */
  getContradictionsFor(characterId: string): WatsonContradiction[] {
    return getContradictionsByCharacter(characterId)
  }

  /**
   * Get the investigation timeline
   */
  getTimeline(): TimelineEvent[] {
    return getTimelineEvents()
  }

  /**
   * Get summary of a specific suspect
   */
  async getSuspectSummary(characterId: string): Promise<SuspectSummaryResponse> {
    const statements = getStatementsByCharacter(characterId)
    const contradictions = getContradictionsByCharacter(characterId)
    const profile = getAllCharacterProfiles().find((p) => p.characterId === characterId)

    const characterName = CHARACTER_NAMES[characterId] || characterId

    // Generate AI summary if we have statements
    let summary = `${characterName} has not been questioned yet.`
    if (statements.length > 0) {
      summary = await this.generateSuspectSummary(characterId, statements, contradictions, profile)
    }

    return {
      characterId,
      characterName,
      statementsCount: statements.length,
      contradictionsInvolved: contradictions.length,
      summary,
      keyStatements: statements.slice(-3).map((s) => ({
        id: s.id,
        content: s.content.slice(0, 150) + (s.content.length > 150 ? '...' : ''),
        topic: s.topic,
      })),
      emotionalPattern: profile?.emotionalTrend || 'unknown',
      cooperationLevel: profile?.cooperationLevel || 0.5,
    }
  }

  /**
   * Generate AI summary for suspect
   */
  private async generateSuspectSummary(
    characterId: string,
    statements: TrackedStatement[],
    contradictions: WatsonContradiction[],
    profile?: CharacterProfile
  ): Promise<string> {
    const prompt = `You are Watson. Summarize what we know about ${CHARACTER_NAMES[characterId] || characterId}:

STATEMENTS (${statements.length}):
${statements.map((s) => `- Topic: ${s.topic}, Content: "${s.content.slice(0, 100)}..."`).join('\n')}

CONTRADICTIONS INVOLVING THEM: ${contradictions.length}
${contradictions.map((c) => `- ${c.explanation}`).join('\n')}

EMOTIONAL TREND: ${profile?.emotionalTrend || 'Unknown'}
COOPERATION LEVEL: ${profile ? (profile.cooperationLevel * 100).toFixed(0) + '%' : 'Unknown'}

Write a brief, objective summary (2-3 sentences) in Watson's voice. No accusations, only observations.`

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: WATSON_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })

      return response.content[0].type === 'text'
        ? response.content[0].text
        : 'Unable to generate summary at this time.'
    } catch {
      return `${CHARACTER_NAMES[characterId]} has provided ${statements.length} statement(s) and is involved in ${contradictions.length} contradiction(s).`
    }
  }

  /**
   * Get investigation summary
   */
  getInvestigationSummary(): InvestigationSummary {
    const statements = getAllStatements()
    const contradictionSummary = getContradictionSummary()
    const timeline = getTimelineEvents()
    const theories = getEvaluatedTheories()

    const statementsPerCharacter: Record<string, number> = {}
    statements.forEach((s) => {
      statementsPerCharacter[s.characterId] = (statementsPerCharacter[s.characterId] || 0) + 1
    })

    return {
      totalStatements: statements.length,
      statementsPerCharacter,
      contradictionCount: contradictionSummary.total,
      unresolvedContradictions: contradictionSummary.total, // All unresolved for now
      timelineEvents: timeline.length,
      confirmedEvents: timeline.filter((e) => e.confirmed).length,
      disputedEvents: timeline.filter((e) => e.disputed).length,
      activeTheories: theories.length,
    }
  }

  /**
   * Get all statements
   */
  getAllStatements(): TrackedStatement[] {
    return getAllStatements()
  }

  /**
   * Get all character profiles
   */
  getCharacterProfiles(): CharacterProfile[] {
    return getAllCharacterProfiles()
  }

  /**
   * Reset Watson for a new game
   */
  reset(): void {
    clearStatementTracker()
    clearContradictions()
    clearTheoryEvaluations()
    clearSuggestions()
    this.conversationHistory = []
    console.log('[WATSON] Reset complete - ready for new investigation')
  }
}

// Singleton instance
let instance: WatsonAgent | null = null

/**
 * Get the Watson agent instance
 */
export function getWatson(): WatsonAgent {
  if (!instance) {
    instance = new WatsonAgent()
    console.log('[WATSON] Agent initialized - ready to assist')
  }
  return instance
}

/**
 * Reset Watson and create fresh instance
 */
export function resetWatson(): void {
  if (instance) {
    instance.reset()
  }
  instance = null
}
