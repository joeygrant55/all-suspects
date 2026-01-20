/**
 * Watson Theory Evaluator
 * Evaluates player theories about the case using evidence and Claude analysis
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAllStatements, TrackedStatement, getAllCharacterProfiles, CharacterProfile } from './statementTracker'
import { getAllContradictions, WatsonContradiction, getContradictionPatterns } from './contradictionFinder'

export interface PlayerTheory {
  id: string
  suspect: string // Character ID of accused
  motive: string
  opportunity: string // How they had opportunity
  method?: string // How they did it
  evidence: string[] // Statement IDs that support this
  submittedAt: number
}

export interface TheoryEvaluation {
  theoryId: string
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  verdict: 'compelling' | 'plausible' | 'weak' | 'flawed' | 'dismissed'
  analysis: {
    motiveStrength: number // 0-10
    opportunityStrength: number // 0-10
    evidenceStrength: number // 0-10
    consistencyScore: number // 0-10
    contradictionImpact: number // -10 to +10 (negative if contradictions hurt theory)
  }
  supportingEvidence: {
    statementId: string
    relevance: string
    strength: 'strong' | 'moderate' | 'weak'
  }[]
  weaknesses: string[]
  strengths: string[]
  followUpQuestions: string[]
  watsonNotes: string // Watson's detective commentary
  evaluatedAt: number
}

// Store evaluated theories
const evaluatedTheories: Map<string, TheoryEvaluation> = new Map()

// Known case facts (The Ashford Affair)
const CASE_FACTS = {
  victim: 'Edmund Ashford',
  deathTime: '11:47 PM',
  deathLocation: 'study',
  method: 'poisoned champagne followed by blunt force',
  actualKiller: 'thomas',
  keyEvents: [
    { time: '11:15 PM', event: 'Thomas seen arguing with Edmund' },
    { time: '11:32 PM', event: 'Grandfather clock stopped (someone in hallway)' },
    { time: '11:47 PM', event: 'Edmund found dead by James' },
  ],
  motives: {
    victoria: 'Unhappy marriage, possible affair',
    thomas: 'About to be disinherited, financial desperation',
    eleanor: 'Knows family secrets, possible blackmail material',
    marcus: 'Medical debts, supplies medication',
    lillian: 'Old flame, unresolved feelings',
    james: 'Years of loyal service, possibly underpaid',
  },
}

/**
 * Calculate motive strength for a character
 */
function calculateMotiveStrength(characterId: string, proposedMotive: string): number {
  const knownMotive = CASE_FACTS.motives[characterId as keyof typeof CASE_FACTS.motives]
  if (!knownMotive) return 3

  const proposedLower = proposedMotive.toLowerCase()
  const knownLower = knownMotive.toLowerCase()

  // Check for keyword overlap
  let score = 5

  if (characterId === 'thomas') {
    // Thomas has the strongest motive
    if (proposedLower.includes('disinherit') || proposedLower.includes('inheritance') || proposedLower.includes('money')) {
      score = 9
    } else if (proposedLower.includes('argue') || proposedLower.includes('fight') || proposedLower.includes('angry')) {
      score = 7
    }
  } else if (characterId === 'victoria') {
    if (proposedLower.includes('affair') || proposedLower.includes('marriage') || proposedLower.includes('unhappy')) {
      score = 6
    }
  } else if (characterId === 'marcus') {
    if (proposedLower.includes('debt') || proposedLower.includes('money') || proposedLower.includes('medicine')) {
      score = 5
    }
  } else if (characterId === 'eleanor') {
    if (proposedLower.includes('secret') || proposedLower.includes('blackmail')) {
      score = 5
    }
  }

  return Math.min(10, score)
}

/**
 * Calculate opportunity strength
 */
function calculateOpportunityStrength(
  characterId: string,
  proposedOpportunity: string,
  statements: TrackedStatement[]
): number {
  let score = 5

  const charStatements = statements.filter((s) => s.characterId === characterId)
  const proposedLower = proposedOpportunity.toLowerCase()

  // Check if their stated alibi conflicts with the opportunity
  let alibiConflict = false
  charStatements.forEach((s) => {
    const contentLower = s.content.toLowerCase()

    // Check for alibi claims around the death time
    if (s.topic === 'whereabouts' || s.topic === 'timeline') {
      // If they claim to be elsewhere during key time
      if (contentLower.includes('11:') || contentLower.includes('midnight') || contentLower.includes('evening')) {
        if (contentLower.includes('study') || contentLower.includes('hallway')) {
          score += 2 // They admit being near crime scene
        } else {
          alibiConflict = true
          score -= 1
        }
      }
    }
  })

  // Special handling for actual killer
  if (characterId === 'thomas') {
    if (proposedLower.includes('argue') || proposedLower.includes('study') || proposedLower.includes('11:15')) {
      score = 9
    }
  }

  // Check if key locations are mentioned
  if (proposedLower.includes('study') || proposedLower.includes('hallway')) {
    score += 1
  }

  // Check if timing is mentioned
  if (proposedLower.includes('11:') || proposedLower.includes('midnight') || proposedLower.includes('before')) {
    score += 1
  }

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate evidence strength
 */
function calculateEvidenceStrength(
  characterId: string,
  evidenceIds: string[],
  statements: TrackedStatement[],
  contradictions: WatsonContradiction[]
): { score: number; supportingEvidence: TheoryEvaluation['supportingEvidence'] } {
  let score = 0
  const supportingEvidence: TheoryEvaluation['supportingEvidence'] = []

  // Get statements used as evidence
  const evidenceStatements = evidenceIds
    .map((id) => statements.find((s) => s.id === id))
    .filter((s): s is TrackedStatement => s !== undefined)

  evidenceStatements.forEach((statement) => {
    let relevance = ''
    let strength: 'strong' | 'moderate' | 'weak' = 'weak'

    // Check if statement mentions the suspect
    if (statement.entities.people.some((p) => p.toLowerCase().includes(characterId))) {
      relevance = 'Directly mentions suspect'
      strength = 'moderate'
      score += 2
    }

    // Check if statement is about timeline/whereabouts
    if (statement.topic === 'timeline' || statement.topic === 'whereabouts') {
      relevance = relevance || 'Relates to timeline/location'
      strength = 'moderate'
      score += 1.5
    }

    // Check if statement is evasive
    if (statement.isEvasive && statement.characterId === characterId) {
      relevance = 'Suspect was evasive when questioned'
      strength = 'strong'
      score += 3
    }

    // Check emotional state
    if (statement.characterId === characterId && statement.emotionalState.primary === 'nervous') {
      relevance = relevance || 'Suspect showed nervous behavior'
      strength = strength === 'weak' ? 'moderate' : strength
      score += 1
    }

    if (relevance) {
      supportingEvidence.push({
        statementId: statement.id,
        relevance,
        strength,
      })
    }
  })

  // Check contradictions involving suspect
  const suspectContradictions = contradictions.filter((c) => c.affectedCharacters.includes(characterId))

  suspectContradictions.forEach((contradiction) => {
    supportingEvidence.push({
      statementId: contradiction.statement1.id,
      relevance: `Caught in contradiction: ${contradiction.explanation}`,
      strength: contradiction.severity === 'critical' || contradiction.severity === 'major' ? 'strong' : 'moderate',
    })
    score += contradiction.severity === 'critical' ? 4 : contradiction.severity === 'major' ? 3 : 2
  })

  // Normalize to 0-10
  const normalizedScore = Math.min(10, score)

  return { score: normalizedScore, supportingEvidence }
}

/**
 * Calculate consistency with all gathered evidence
 */
function calculateConsistencyScore(
  characterId: string,
  theory: PlayerTheory,
  statements: TrackedStatement[],
  contradictions: WatsonContradiction[]
): number {
  let score = 7 // Base score

  // Check for contradictions that SUPPORT the theory (suspect caught lying)
  const suspectContradictions = contradictions.filter((c) => c.affectedCharacters.includes(characterId))
  score += Math.min(3, suspectContradictions.length * 0.5)

  // Check for contradictions that WEAKEN the theory (other suspects more suspicious)
  const otherContradictions = contradictions.filter((c) => !c.affectedCharacters.includes(characterId))
  score -= Math.min(2, otherContradictions.length * 0.25)

  // Check character profile for consistency issues
  const profiles = getAllCharacterProfiles()
  const suspectProfile = profiles.find((p) => p.characterId === characterId)

  if (suspectProfile) {
    // Low consistency score for the character = more suspicious
    if (suspectProfile.consistencyScore < 0.5) {
      score += 1
    }
    // Increasingly nervous = more suspicious
    if (suspectProfile.emotionalTrend === 'increasingly-nervous') {
      score += 1
    }
    // Low cooperation = suspicious
    if (suspectProfile.cooperationLevel < 0.5) {
      score += 0.5
    }
  }

  return Math.max(1, Math.min(10, score))
}

/**
 * Calculate contradiction impact on theory
 */
function calculateContradictionImpact(
  characterId: string,
  contradictions: WatsonContradiction[]
): number {
  let impact = 0

  const suspectContradictions = contradictions.filter((c) => c.affectedCharacters.includes(characterId))

  // Contradictions involving suspect help the theory
  suspectContradictions.forEach((c) => {
    if (c.severity === 'critical') impact += 3
    else if (c.severity === 'major') impact += 2
    else if (c.severity === 'significant') impact += 1
    else impact += 0.5
  })

  // If other characters have more contradictions, theory might be weaker
  const otherCount = contradictions.length - suspectContradictions.length
  if (otherCount > suspectContradictions.length * 2) {
    impact -= 2 // Other suspects are more suspicious
  }

  return Math.max(-10, Math.min(10, impact))
}

/**
 * Identify theory weaknesses
 */
function identifyWeaknesses(
  characterId: string,
  theory: PlayerTheory,
  evaluation: TheoryEvaluation['analysis'],
  statements: TrackedStatement[]
): string[] {
  const weaknesses: string[] = []

  if (evaluation.motiveStrength < 5) {
    weaknesses.push('Motive is not well established or supported by evidence')
  }

  if (evaluation.opportunityStrength < 5) {
    weaknesses.push('Opportunity is unclear - alibi may not have been properly investigated')
  }

  if (evaluation.evidenceStrength < 4) {
    weaknesses.push('Limited direct evidence connecting suspect to the crime')
  }

  if (evaluation.contradictionImpact < 0) {
    weaknesses.push('Other suspects have shown more inconsistencies in their statements')
  }

  // Check if suspect has been thoroughly questioned
  const suspectStatements = statements.filter((s) => s.characterId === characterId)
  if (suspectStatements.length < 3) {
    weaknesses.push('Suspect has not been thoroughly interrogated')
  }

  // Check topics covered
  const topicsCovered = new Set(suspectStatements.map((s) => s.topic))
  if (!topicsCovered.has('whereabouts')) {
    weaknesses.push("Suspect's whereabouts during the crime have not been established")
  }
  if (!topicsCovered.has('timeline')) {
    weaknesses.push('Timeline of suspect\'s activities has not been investigated')
  }

  return weaknesses
}

/**
 * Identify theory strengths
 */
function identifyStrengths(
  characterId: string,
  theory: PlayerTheory,
  evaluation: TheoryEvaluation['analysis'],
  contradictions: WatsonContradiction[]
): string[] {
  const strengths: string[] = []

  if (evaluation.motiveStrength >= 7) {
    strengths.push('Clear and compelling motive established')
  }

  if (evaluation.opportunityStrength >= 7) {
    strengths.push('Suspect had clear opportunity to commit the crime')
  }

  if (evaluation.evidenceStrength >= 7) {
    strengths.push('Multiple pieces of evidence support this theory')
  }

  const suspectContradictions = contradictions.filter((c) => c.affectedCharacters.includes(characterId))
  if (suspectContradictions.length >= 2) {
    strengths.push(`Suspect has been caught in ${suspectContradictions.length} contradictions`)
  }

  if (suspectContradictions.some((c) => c.severity === 'critical' || c.severity === 'major')) {
    strengths.push('Suspect has made significantly inconsistent statements')
  }

  // Special for actual killer
  if (characterId === 'thomas') {
    strengths.push('Suspect was seen arguing with victim shortly before death')
  }

  return strengths
}

/**
 * Generate follow-up questions
 */
function generateFollowUpQuestions(
  characterId: string,
  theory: PlayerTheory,
  evaluation: TheoryEvaluation['analysis'],
  statements: TrackedStatement[]
): string[] {
  const questions: string[] = []

  const suspectStatements = statements.filter((s) => s.characterId === characterId)
  const topicsCovered = new Set(suspectStatements.map((s) => s.topic))

  if (!topicsCovered.has('whereabouts')) {
    questions.push(`Ask ${theory.suspect}: "Where exactly were you between 11:30 PM and midnight?"`)
  }

  if (!topicsCovered.has('timeline')) {
    questions.push(`Ask ${theory.suspect}: "Walk me through your movements that evening."`)
  }

  if (evaluation.motiveStrength < 6) {
    questions.push(`Investigate the relationship between ${theory.suspect} and Edmund Ashford`)
  }

  // Suggest cross-referencing
  const otherCharacters = statements
    .filter((s) => s.characterId !== characterId)
    .map((s) => s.characterId)
  const uniqueOthers = [...new Set(otherCharacters)]

  if (uniqueOthers.length > 0) {
    const other = uniqueOthers[0]
    questions.push(`Ask other witnesses if they saw ${theory.suspect} near the study that night`)
  }

  // General follow-ups
  questions.push('Examine physical evidence for fingerprints or traces')
  questions.push('Review the timeline of events with fresh eyes')

  return questions.slice(0, 4)
}

/**
 * Generate Watson's commentary
 */
async function generateWatsonCommentary(
  anthropic: Anthropic,
  theory: PlayerTheory,
  evaluation: Omit<TheoryEvaluation, 'watsonNotes' | 'evaluatedAt'>
): Promise<string> {
  const prompt = `You are Watson, the brilliant detective assistant from Sherlock Holmes, helping evaluate a theory in a 1920s murder mystery.

THE THEORY:
Suspect: ${theory.suspect}
Proposed Motive: ${theory.motive}
Proposed Opportunity: ${theory.opportunity}
${theory.method ? `Method: ${theory.method}` : ''}

EVALUATION RESULTS:
Score: ${evaluation.score}/100 (Grade: ${evaluation.grade})
Verdict: ${evaluation.verdict}

Analysis:
- Motive Strength: ${evaluation.analysis.motiveStrength}/10
- Opportunity Strength: ${evaluation.analysis.opportunityStrength}/10
- Evidence Strength: ${evaluation.analysis.evidenceStrength}/10
- Consistency: ${evaluation.analysis.consistencyScore}/10
- Contradiction Impact: ${evaluation.analysis.contradictionImpact > 0 ? '+' : ''}${evaluation.analysis.contradictionImpact}

Strengths: ${evaluation.strengths.join('; ') || 'None identified'}
Weaknesses: ${evaluation.weaknesses.join('; ') || 'None identified'}

Write a brief (2-3 sentences) Watson-style commentary on this theory. Be analytical but encouraging. If the theory has merit, note what's promising. If it's weak, suggest what's missing. Use period-appropriate language (1920s British detective style).

Respond with just the commentary, no formatting.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0].type === 'text'
      ? response.content[0].text
      : 'A most intriguing theory that warrants further investigation.'
  } catch {
    return 'An interesting theory, though the evidence requires closer examination.'
  }
}

/**
 * Evaluate a player's theory
 */
export async function evaluateTheory(
  anthropic: Anthropic,
  theory: PlayerTheory
): Promise<TheoryEvaluation> {
  const statements = getAllStatements()
  const contradictions = getAllContradictions()

  // Calculate individual scores
  const motiveStrength = calculateMotiveStrength(theory.suspect, theory.motive)
  const opportunityStrength = calculateOpportunityStrength(theory.suspect, theory.opportunity, statements)
  const { score: evidenceStrength, supportingEvidence } = calculateEvidenceStrength(
    theory.suspect,
    theory.evidence,
    statements,
    contradictions
  )
  const consistencyScore = calculateConsistencyScore(theory.suspect, theory, statements, contradictions)
  const contradictionImpact = calculateContradictionImpact(theory.suspect, contradictions)

  const analysis = {
    motiveStrength,
    opportunityStrength,
    evidenceStrength,
    consistencyScore,
    contradictionImpact,
  }

  // Calculate overall score
  const baseScore =
    motiveStrength * 2 + // 20 points max
    opportunityStrength * 2 + // 20 points max
    evidenceStrength * 3 + // 30 points max
    consistencyScore * 2 + // 20 points max
    contradictionImpact // -10 to +10

  // Bonus for accusing actual killer
  const killerBonus = theory.suspect === CASE_FACTS.actualKiller ? 10 : 0

  const score = Math.max(0, Math.min(100, baseScore + killerBonus))

  // Determine grade
  let grade: TheoryEvaluation['grade']
  if (score >= 85) grade = 'A'
  else if (score >= 70) grade = 'B'
  else if (score >= 55) grade = 'C'
  else if (score >= 40) grade = 'D'
  else grade = 'F'

  // Determine verdict
  let verdict: TheoryEvaluation['verdict']
  if (score >= 80) verdict = 'compelling'
  else if (score >= 60) verdict = 'plausible'
  else if (score >= 40) verdict = 'weak'
  else if (score >= 20) verdict = 'flawed'
  else verdict = 'dismissed'

  const weaknesses = identifyWeaknesses(theory.suspect, theory, analysis, statements)
  const strengths = identifyStrengths(theory.suspect, theory, analysis, contradictions)
  const followUpQuestions = generateFollowUpQuestions(theory.suspect, theory, analysis, statements)

  // Build partial evaluation for Watson's commentary
  const partialEvaluation = {
    theoryId: theory.id,
    score,
    grade,
    verdict,
    analysis,
    supportingEvidence,
    weaknesses,
    strengths,
    followUpQuestions,
  }

  // Get Watson's commentary
  const watsonNotes = await generateWatsonCommentary(anthropic, theory, partialEvaluation)

  const evaluation: TheoryEvaluation = {
    ...partialEvaluation,
    watsonNotes,
    evaluatedAt: Date.now(),
  }

  // Store evaluation
  evaluatedTheories.set(theory.id, evaluation)

  return evaluation
}

/**
 * Quick evaluation without AI (for UI feedback)
 */
export function quickEvaluateTheory(theory: PlayerTheory): {
  score: number
  grade: TheoryEvaluation['grade']
  verdict: TheoryEvaluation['verdict']
} {
  const statements = getAllStatements()
  const contradictions = getAllContradictions()

  const motiveStrength = calculateMotiveStrength(theory.suspect, theory.motive)
  const opportunityStrength = calculateOpportunityStrength(theory.suspect, theory.opportunity, statements)
  const { score: evidenceStrength } = calculateEvidenceStrength(
    theory.suspect,
    theory.evidence,
    statements,
    contradictions
  )
  const consistencyScore = calculateConsistencyScore(theory.suspect, theory, statements, contradictions)
  const contradictionImpact = calculateContradictionImpact(theory.suspect, contradictions)

  const baseScore =
    motiveStrength * 2 +
    opportunityStrength * 2 +
    evidenceStrength * 3 +
    consistencyScore * 2 +
    contradictionImpact

  const killerBonus = theory.suspect === CASE_FACTS.actualKiller ? 10 : 0
  const score = Math.max(0, Math.min(100, baseScore + killerBonus))

  let grade: TheoryEvaluation['grade']
  if (score >= 85) grade = 'A'
  else if (score >= 70) grade = 'B'
  else if (score >= 55) grade = 'C'
  else if (score >= 40) grade = 'D'
  else grade = 'F'

  let verdict: TheoryEvaluation['verdict']
  if (score >= 80) verdict = 'compelling'
  else if (score >= 60) verdict = 'plausible'
  else if (score >= 40) verdict = 'weak'
  else if (score >= 20) verdict = 'flawed'
  else verdict = 'dismissed'

  return { score, grade, verdict }
}

/**
 * Get all evaluated theories
 */
export function getEvaluatedTheories(): TheoryEvaluation[] {
  return Array.from(evaluatedTheories.values()).sort((a, b) => b.evaluatedAt - a.evaluatedAt)
}

/**
 * Get evaluation by theory ID
 */
export function getTheoryEvaluation(theoryId: string): TheoryEvaluation | undefined {
  return evaluatedTheories.get(theoryId)
}

/**
 * Clear all evaluations
 */
export function clearTheoryEvaluations(): void {
  evaluatedTheories.clear()
}
