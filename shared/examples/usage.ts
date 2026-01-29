/**
 * Mystery Blueprint - Usage Examples
 * 
 * This file demonstrates how to use the Blueprint system.
 */

import type { MysteryBlueprint } from '../types/MysteryBlueprint'
import { getAshfordBlueprint, getHollywoodBlueprint, fromGeneratedMystery } from '../adapters'

// ============================================================================
// Example 1: Load a Hardcoded Mystery
// ============================================================================

function loadHardcodedMystery() {
  // Load Ashford Affair
  const ashford: MysteryBlueprint = getAshfordBlueprint()
  
  console.log(`Loaded: ${ashford.title}`)
  console.log(`Era: ${ashford.era}`)
  console.log(`Difficulty: ${ashford.difficulty}`)
  console.log(`Suspects: ${ashford.characters.length}`)
  console.log(`Evidence: ${ashford.evidence.length}`)
  console.log(`Killer: ${ashford.solution.killerId}`)
  
  return ashford
}

// ============================================================================
// Example 2: Load Hollywood Mystery
// ============================================================================

function loadHollywoodMystery() {
  const hollywood: MysteryBlueprint = getHollywoodBlueprint()
  
  console.log(`Loaded: ${hollywood.title}`)
  console.log(`Setting: ${hollywood.setting.location}`)
  console.log(`Event: ${hollywood.setting.event}`)
  
  return hollywood
}

// ============================================================================
// Example 3: Convert AI-Generated Mystery
// ============================================================================

async function loadAIMystery() {
  // This would come from the Mystery Architect Agent
  // import { generateMystery } from '@/server/mystery/architectAgent'
  // const generated = await generateMystery('medium')
  
  // For demo purposes, assume we have a GeneratedMystery
  // const blueprint = fromGeneratedMystery(generated)
  
  // console.log(`AI Mystery: ${blueprint.title}`)
  // return blueprint
}

// ============================================================================
// Example 4: Initialize Game State from Blueprint
// ============================================================================

function initializeGame(blueprint: MysteryBlueprint) {
  // Set up characters
  const characters = blueprint.characters.map(char => ({
    id: char.id,
    name: char.name,
    role: char.role,
    location: findCharacterLocation(char.id, blueprint.locations),
    portrait: `/images/characters/${char.id}.png`,
    pressure: {
      level: 0,
      confrontations: 0,
      evidencePresented: 0,
      contradictionsExposed: 0
    }
  }))
  
  // Set up locations
  const locations = blueprint.locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    description: loc.description,
    evidenceIds: loc.evidenceIds,
    visited: false
  }))
  
  // Set up evidence tracking
  const evidenceDatabase = blueprint.evidence
  const discoveredEvidence: string[] = []
  
  return {
    mystery: blueprint,
    characters,
    locations,
    evidenceDatabase,
    discoveredEvidence,
    gameStartTime: Date.now()
  }
}

function findCharacterLocation(characterId: string, locations: MysteryBlueprint['locations']): string {
  const location = locations.find(loc => loc.characterPresent === characterId)
  return location?.id || locations[0].id
}

// ============================================================================
// Example 5: Evidence Discovery System
// ============================================================================

function discoverEvidence(
  evidenceId: string,
  blueprint: MysteryBlueprint,
  currentLocation: string,
  discoveredEvidence: string[]
): { discovered: boolean; evidence?: any; unlocks?: any[] } {
  
  const evidence = blueprint.evidence.find(ev => ev.id === evidenceId)
  
  if (!evidence) {
    return { discovered: false }
  }
  
  // Check discovery condition
  let canDiscover = false
  
  switch (evidence.discoveryCondition) {
    case 'always':
      canDiscover = true
      break
      
    case 'room-search':
      canDiscover = evidence.location === currentLocation
      break
      
    case 'interrogation':
      // Would check if required questions have been asked
      canDiscover = false // Implement based on conversation history
      break
      
    case 'contradiction':
      // Would check if contradictory statements have been collected
      canDiscover = false // Implement based on collected testimony
      break
  }
  
  if (canDiscover && !discoveredEvidence.includes(evidenceId)) {
    discoveredEvidence.push(evidenceId)
    
    return {
      discovered: true,
      evidence: evidence,
      unlocks: evidence.dialogueUnlocks
    }
  }
  
  return { discovered: false }
}

// ============================================================================
// Example 6: Dialogue Unlock System
// ============================================================================

function getAvailableQuestions(
  characterId: string,
  blueprint: MysteryBlueprint,
  discoveredEvidence: string[]
): string[] {
  
  const baseQuestions = [
    'Where were you at the time of the murder?',
    'What was your relationship with the victim?',
    'Did you see anything unusual?'
  ]
  
  // Add evidence-based questions
  const evidenceQuestions = discoveredEvidence
    .flatMap(evidenceId => {
      const unlocks = blueprint.dialogueUnlocks[evidenceId] || []
      return unlocks
        .filter(unlock => unlock.characterId === characterId)
        .map(unlock => unlock.prompt)
    })
  
  return [...baseQuestions, ...evidenceQuestions]
}

// ============================================================================
// Example 7: Scoring Calculation
// ============================================================================

function calculateScore(
  blueprint: MysteryBlueprint,
  gameState: {
    timeElapsed: number // in minutes
    evidenceFound: number
    contradictionsFound: number
    wrongAccusations: number
    correctAccusation: boolean
  }
): number {
  
  const config = blueprint.scoring
  let score = config.maxScore
  
  // Time penalty
  if (gameState.timeElapsed > config.parTime) {
    const overtimeMinutes = gameState.timeElapsed - config.parTime
    score -= overtimeMinutes * config.penalties.excessiveTime
  }
  
  // Wrong accusation penalties
  score -= gameState.wrongAccusations * config.penalties.wrongAccusation
  
  // Bonuses
  if (gameState.timeElapsed < config.parTime) {
    score += config.bonuses.underParTime
  }
  
  if (gameState.evidenceFound === blueprint.evidence.length) {
    score += config.bonuses.allEvidenceFound
  }
  
  const totalContradictions = blueprint.solution.keyContradictions.length
  if (gameState.contradictionsFound === totalContradictions) {
    score += config.bonuses.allContradictionsDiscovered
  }
  
  if (gameState.correctAccusation && gameState.wrongAccusations === 0) {
    score += config.bonuses.firstAttemptCorrect
  }
  
  // Apply difficulty multiplier
  score = Math.round(score * config.difficultyMultiplier)
  
  return Math.max(0, score)
}

// ============================================================================
// Example 8: Validate Solution
// ============================================================================

function validateAccusation(
  accusedId: string,
  blueprint: MysteryBlueprint,
  collectedEvidence: string[]
): { correct: boolean; hasCriticalEvidence: boolean; missingEvidence: string[] } {
  
  const correct = accusedId === blueprint.solution.killerId
  const criticalEvidence = blueprint.solution.criticalEvidence
  
  const hasCriticalEvidence = criticalEvidence.every(evidenceId => 
    collectedEvidence.includes(evidenceId)
  )
  
  const missingEvidence = criticalEvidence.filter(evidenceId => 
    !collectedEvidence.includes(evidenceId)
  )
  
  return {
    correct,
    hasCriticalEvidence,
    missingEvidence
  }
}

// ============================================================================
// Example 9: Generate AI Prompt for Character
// ============================================================================

function generateInterrogationPrompt(
  characterId: string,
  blueprint: MysteryBlueprint,
  playerQuestion: string,
  conversationHistory: string[]
): string {
  
  const character = blueprint.characters.find(c => c.id === characterId)
  
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }
  
  const systemPrompt = character.systemPrompt || `You are ${character.name}, ${character.role}.`
  
  const prompt = `${systemPrompt}

CONVERSATION HISTORY:
${conversationHistory.join('\n')}

PLAYER QUESTION: "${playerQuestion}"

Respond in character as ${character.name}. Use your speech pattern: "${character.speechPattern}".
Stay consistent with your alibi: "${character.alibi.claimed}".
${character.isGuilty ? 'You are guilty - be careful not to slip up.' : 'You are innocent - be helpful but protect your secrets.'}
`
  
  return prompt
}

// ============================================================================
// Example 10: Export Mystery as JSON
// ============================================================================

function exportMysteryToJSON(blueprint: MysteryBlueprint): string {
  return JSON.stringify(blueprint, null, 2)
}

function importMysteryFromJSON(json: string): MysteryBlueprint {
  return JSON.parse(json) as MysteryBlueprint
}

// ============================================================================
// Exports
// ============================================================================

export {
  loadHardcodedMystery,
  loadHollywoodMystery,
  loadAIMystery,
  initializeGame,
  discoverEvidence,
  getAvailableQuestions,
  calculateScore,
  validateAccusation,
  generateInterrogationPrompt,
  exportMysteryToJSON,
  importMysteryFromJSON
}
