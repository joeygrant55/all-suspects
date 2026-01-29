/**
 * Cinematic Moment Detection
 * 
 * Analyzes interrogation responses to detect dramatic moments
 * that warrant video generation for enhanced immersion.
 */

import type { TestimonyAnalysis } from './promptBuilder'

export interface CinematicMomentDetection {
  isCinematic: boolean
  reason?: string
  priority: 'low' | 'medium' | 'high'
  confidence: number // 0-100
}

// Track last cinematic moment per character to enforce cooldown
const lastCinematicMoment = new Map<string, number>()
const COOLDOWN_MESSAGES = 3 // Minimum 3 messages between cinematic moments

/**
 * Detect if a moment warrants cinematic video generation
 */
export function detectCinematicMoment(
  characterId: string,
  testimony: string,
  question: string,
  previousPressure: number,
  currentPressure: number,
  hasContradiction: boolean,
  messagesSinceStart: number
): CinematicMomentDetection {
  // Check cooldown - respect rate limits (but only if we've had a cinematic before)
  if (lastCinematicMoment.has(characterId)) {
    const lastMoment = lastCinematicMoment.get(characterId)!
    const messagesSinceLastCinematic = messagesSinceStart - lastMoment
    
    if (messagesSinceLastCinematic < COOLDOWN_MESSAGES) {
      return {
        isCinematic: false,
        priority: 'low',
        confidence: 0,
      }
    }
  }

  const testimonyLower = testimony.toLowerCase()
  const questionLower = question.toLowerCase()
  
  let score = 0
  let reasons: string[] = []
  
  console.log(`[CINEMATIC DEBUG] question: "${questionLower.substring(0, 80)}" | pressure: ${previousPressure}->${currentPressure} | contradiction: ${hasContradiction} | msgs: ${messagesSinceStart}`)

  // 1. Significant pressure change (20 points)
  const pressureDelta = currentPressure - previousPressure
  if (pressureDelta >= 15) {
    score += 20
    reasons.push('Major pressure increase')
  } else if (pressureDelta >= 10) {
    score += 10
    reasons.push('Moderate pressure increase')
  }

  // 2. Contradiction detected (25 points)
  if (hasContradiction) {
    score += 25
    reasons.push('Contradiction detected')
  }

  // 3. Character showing strong emotion (15 points)
  const strongEmotionIndicators = [
    'gasp', 'panic', 'breaks down', 'sob', 'shout', 'slam',
    'trembl', 'pale', 'sweat', 'shake', 'collapses', 'glare',
    'furious', 'terrified', 'stunned', 'shocked', 'horror',
    'tears', 'crying', 'rage', 'fury', 'desperate'
  ]
  const emotionCount = strongEmotionIndicators.filter(indicator => 
    testimonyLower.includes(indicator)
  ).length
  if (emotionCount >= 2) {
    score += 15
    reasons.push('Strong emotional reaction')
  } else if (emotionCount === 1) {
    score += 7
  }

  // 4. Evidence confrontation (20 points)
  if (questionLower.includes('[showing') || 
      questionLower.includes('explain this') ||
      questionLower.includes('evidence') && questionLower.includes('prove')) {
    score += 20
    reasons.push('Evidence confrontation')
  }

  // 5. Accusation or major reveal (25 points)
  const accusationWords = ['killed', 'murdered', 'guilty', 'lying', 'liar', 'caught you']
  const hasAccusation = accusationWords.some(word => questionLower.includes(word))
  if (hasAccusation) {
    score += 25
    reasons.push('Direct accusation')
  }

  // 6. Character makes accusation about another suspect (20 points)
  const characterNames = ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james']
  const accusesOther = characterNames.some(name => 
    testimonyLower.includes(name) && 
    (testimonyLower.includes('killed') || testimonyLower.includes('did it') || 
     testimonyLower.includes('guilty') || testimonyLower.includes('murderer'))
  )
  if (accusesOther) {
    score += 20
    reasons.push('Accuses another suspect')
  }

  // 7. Breaking point reached (high pressure) (15 points)
  if (currentPressure >= 80) {
    score += 15
    reasons.push('Breaking point reached')
  }

  // 8. Confession or major admission (30 points)
  const confessionWords = ['confess', 'admit', 'guilty', 'did it', 'sorry', 'forgive me']
  const hasConfession = confessionWords.some(word => testimonyLower.includes(word))
  if (hasConfession && testimonyLower.includes('i')) {
    score += 30
    reasons.push('Possible confession or admission')
  }

  // 9. Physical action or dramatic gesture (10 points)
  const dramaticActions = ['stands up', 'walks away', 'grabs', 'throws', 'points', 'leaves', 'storms', 'slams', 'drops', 'staggers']
  const hasDramaticAction = dramaticActions.some(action => testimonyLower.includes(action))
  if (hasDramaticAction) {
    score += 10
    reasons.push('Dramatic physical action')
  }

  // Determine if this is cinematic based on score
  // Threshold: 30+ points = cinematic (lowered from 40 for better triggering)
  const isCinematic = score >= 30

  // Update last cinematic moment if triggered
  if (isCinematic) {
    lastCinematicMoment.set(characterId, messagesSinceStart)
  }

  // Determine priority based on score
  let priority: 'low' | 'medium' | 'high' = 'low'
  if (score >= 60) {
    priority = 'high'
  } else if (score >= 50) {
    priority = 'medium'
  }

  return {
    isCinematic,
    reason: reasons.join(', '),
    priority,
    confidence: Math.min(score, 100),
  }
}

/**
 * Should we generate video based on detection and rate limiting?
 */
export function shouldGenerateVideo(detection: CinematicMomentDetection): boolean {
  // Only generate for cinematic moments with sufficient confidence
  return detection.isCinematic && detection.confidence >= 30
}

/**
 * Reset cooldown for a character (useful for testing)
 */
export function resetCooldown(characterId?: string): void {
  if (characterId) {
    lastCinematicMoment.delete(characterId)
  } else {
    lastCinematicMoment.clear()
  }
}
