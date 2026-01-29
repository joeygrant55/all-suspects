/**
 * Mystery Generator Agent
 * 
 * Uses Claude to generate a complete MysteryBlueprint on demand.
 * This is the core of the "infinite mysteries" system.
 * 
 * Flow:
 * 1. Player requests new mystery (optional: theme/era/difficulty preferences)
 * 2. Claude generates a complete MysteryBlueprint JSON
 * 3. Blueprint is validated and stored
 * 4. Art pipeline kicks off in background (Option C: progressive loading)
 * 5. Game starts immediately with placeholders, art fills in as generated
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MysteryBlueprint } from '../../shared/types/MysteryBlueprint'

const anthropic = new Anthropic()

export interface MysteryRequest {
  era?: string          // '1920s', '1970s', '2050s', 'Victorian', etc.
  setting?: string      // 'manor house', 'cruise ship', 'space station', 'jazz club'
  difficulty?: 'easy' | 'medium' | 'hard'
  theme?: string        // 'noir', 'cozy', 'gothic', 'sci-fi'
  suspectCount?: number // 4-8, default 6
  playerHint?: string   // "I want something with a love triangle" etc.
}

export interface GenerationProgress {
  phase: 'blueprint' | 'art-portraits' | 'art-rooms' | 'art-evidence' | 'complete'
  progress: number    // 0-100
  message: string
  blueprint?: MysteryBlueprint
  assets?: GeneratedAssets
}

export interface GeneratedAssets {
  portraits: Record<string, { calm?: string; nervous?: string; breaking?: string }>
  rooms: Record<string, string>
  evidence: Record<string, string>
}

const MYSTERY_GENERATOR_PROMPT = `You are a master mystery writer and game designer. Generate a complete, playable murder mystery in JSON format.

REQUIREMENTS:
1. The mystery MUST be solvable through logical deduction
2. Every suspect needs a believable motive, alibi with holes, and secrets
3. Evidence must form a clear logical chain pointing to the killer
4. Include at least 2-3 red herrings that point to innocent suspects
5. Each character needs a distinct personality, speech pattern, and pressure profile
6. The timeline must be internally consistent — no contradictions unless intentional
7. Include exactly 6 locations and the requested number of suspects
8. One suspect MUST be guilty — their alibi must have a fatal flaw
9. Physical evidence should have forensic details (fingerprints, timestamps)
10. Each character should know something unique that helps solve the case

CREATIVE GUIDELINES:
- Make characters feel REAL — complex motivations, not cartoon villains
- Every suspect should seem potentially guilty at first
- The solution should be satisfying — "of course!" not "huh?"
- Include emotional depth — betrayal, love, fear, ambition
- Speech patterns should be distinctive (formal vs casual, verbose vs terse)
- Red herrings should be convincing but ultimately debunkable

OUTPUT: Return ONLY valid JSON matching the MysteryBlueprint schema. No markdown, no explanation, just JSON.`

/**
 * Generate a complete mystery blueprint
 */
export async function generateMystery(request: MysteryRequest = {}): Promise<MysteryBlueprint> {
  const {
    era = '1920s',
    setting = 'English manor house',
    difficulty = 'medium',
    theme = 'noir',
    suspectCount = 6,
    playerHint = '',
  } = request

  const userPrompt = `Generate a ${difficulty} ${theme} murder mystery set in a ${setting} during the ${era}.

Number of suspects: ${suspectCount}
${playerHint ? `Player request: ${playerHint}` : ''}

The mystery needs:
- A compelling victim with dark secrets
- ${suspectCount} suspects, each with unique personality, motive, alibi, and pressure profile
- 6 explorable locations with evidence hidden in them
- 12-15 evidence items (physical, documents, testimonies, contradictions)
- A watertight timeline of events
- A solution with clear logical chain
- 2-3 convincing red herrings
- Scoring config with par time based on difficulty

For each character, include:
- A detailed systemPrompt that instructs Claude how to roleplay them during interrogation
- Specific weaknesses that make them crack under pressure
- What they know about other suspects
- Their greeting when first approached

Generate the complete MysteryBlueprint JSON now.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    system: MYSTERY_GENERATOR_PROMPT,
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Parse and validate the blueprint
  let blueprint: MysteryBlueprint
  try {
    // Strip any markdown code fences if present
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    blueprint = JSON.parse(jsonText)
  } catch (e) {
    throw new Error(`Failed to parse mystery blueprint: ${e}`)
  }

  // Validate essential fields
  validateBlueprint(blueprint)

  return blueprint
}

/**
 * Generate art prompts for a mystery blueprint
 * These prompts are optimized for Nano Banana Pro / Gemini image generation
 */
export function generateArtPrompts(blueprint: MysteryBlueprint) {
  const { setting, characters, locations, evidence } = blueprint

  const prompts: {
    portraits: Record<string, { calm: string; nervous: string; breaking: string }>
    rooms: Record<string, string>
    evidence: Record<string, string>
    titleScreen: string
    caseBoard: string
  } = {
    portraits: {},
    rooms: {},
    evidence: {},
    titleScreen: '',
    caseBoard: '',
  }

  // Character portrait prompts
  for (const char of characters) {
    const basePrompt = `Portrait of ${char.name}, ${char.role}. ${char.personality}. ${setting.atmosphere} style, ${blueprint.era} era. Cinematic lighting, detailed, photorealistic. Dark moody background.`

    prompts.portraits[char.id] = {
      calm: basePrompt + ' Composed, confident expression.',
      nervous: basePrompt + ' Nervous, unsettled, slightly sweating, darting eyes.',
      breaking: basePrompt + ' Emotionally breaking down, tears forming, composure cracking, desperate.',
    }
  }

  // Room prompts
  for (const loc of locations) {
    prompts.rooms[loc.id] = `Interior view of ${loc.name}. ${loc.description}. ${blueprint.era} era ${setting.location}. ${setting.atmosphere} atmosphere. ${setting.weather}. Cinematic, detailed, atmospheric lighting. No people. Wide angle. Noir style.`
  }

  // Evidence item prompts
  for (const ev of evidence) {
    if (ev.type === 'physical' || ev.type === 'document') {
      prompts.evidence[ev.id] = `Close-up photograph of ${ev.name}: ${ev.description}. Dramatic spotlight lighting on dark surface. ${blueprint.era} era. Evidence photo style, forensic, detailed. Sepia tones.`
    }
  }

  // Title screen
  prompts.titleScreen = `Title screen for a ${blueprint.era} ${setting.atmosphere} murder mystery game set in ${setting.location}. ${setting.weather}. Dark atmospheric, cinematic. No text. 16:9 landscape.`

  // Case board
  prompts.caseBoard = `Detective investigation cork board for a ${blueprint.era} murder mystery. Pinned polaroid suspect photos connected by red string. Evidence photos, newspaper clippings, handwritten notes. Moody amber lighting. Film grain. Professional game UI. 16:9 landscape.`

  return prompts
}

/**
 * Validate a mystery blueprint has all required fields
 */
function validateBlueprint(blueprint: MysteryBlueprint): void {
  const errors: string[] = []

  if (!blueprint.id) errors.push('Missing id')
  if (!blueprint.title) errors.push('Missing title')
  if (!blueprint.characters?.length) errors.push('No characters')
  if (!blueprint.locations?.length) errors.push('No locations')
  if (!blueprint.evidence?.length) errors.push('No evidence')
  if (!blueprint.solution?.killerId) errors.push('No solution/killer')
  if (!blueprint.victim) errors.push('No victim')

  // Verify killer exists in characters
  const killerExists = blueprint.characters.some(c => c.id === blueprint.solution.killerId)
  if (!killerExists) errors.push(`Killer ${blueprint.solution.killerId} not found in characters`)

  // Verify guilty flag matches
  const guiltyChars = blueprint.characters.filter(c => c.isGuilty)
  if (guiltyChars.length !== 1) errors.push(`Expected 1 guilty character, found ${guiltyChars.length}`)

  // Verify evidence locations exist
  for (const ev of blueprint.evidence) {
    const locExists = blueprint.locations.some(l => l.id === ev.location) || ev.location === 'conversation'
    if (!locExists) errors.push(`Evidence ${ev.id} references unknown location ${ev.location}`)
  }

  if (errors.length > 0) {
    throw new Error(`Blueprint validation failed:\n${errors.join('\n')}`)
  }
}
