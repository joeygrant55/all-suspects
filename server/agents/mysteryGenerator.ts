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

import { GoogleGenAI } from '@google/genai'
import type { MysteryBlueprint } from '../../shared/types/MysteryBlueprint'

// Lazy init — must wait for dotenv to load process.env
function getGeminiKey() { return process.env.GEMINI_API_KEY || '' }

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

const MYSTERY_GENERATOR_PROMPT = `You are a master mystery writer and game designer. Generate a complete, playable murder mystery as a single JSON object.

## STRICT JSON SCHEMA — USE THESE EXACT FIELD NAMES

You MUST return a JSON object with EXACTLY these top-level keys (no extras, no nesting under "metadata" or other wrappers):

{
  "id": "kebab-case-id-from-title",
  "title": "Mystery Title",
  "subtitle": "Date — Location",
  "era": "1920s",
  "difficulty": "medium",
  "setting": {
    "location": "MUST match the player's requested setting — e.g. 'The Blue Moon Jazz Club on Bourbon Street' NOT 'Some Manor'",
    "atmosphere": "Vivid, specific atmosphere matching the setting",
    "weather": "Weather that fits the setting and era"
  },
  "victim": {
    "name": "Full Name",
    "role": "Their role/occupation",
    "causeOfDeath": "How they died",
    "timeOfDeath": "Approximate time",
    "description": "Who they were"
  },
  "characters": [
    {
      "id": "kebab-case-name",
      "name": "Full Name",
      "role": "Occupation or title",
      "personality": "Core personality traits",
      "speechPattern": "How they talk — formal, slang, etc.",
      "background": "Their backstory",
      "motive": "Why they might have done it",
      "alibi": "Where they claim to have been",
      "secretKnowledge": ["Things only they know"],
      "relationships": {"other-character-id": "relationship description"},
      "isGuilty": false,
      "greeting": "What they say when you first approach them"
    }
  ],
  "locations": [
    {
      "id": "kebab-case-name",
      "name": "Room Name",
      "description": "What the room looks like"
    }
  ],
  "evidence": [
    {
      "id": "kebab-case-name",
      "name": "Evidence Name",
      "description": "Brief description",
      "detailedDescription": "Full forensic/detailed description",
      "type": "physical|document|testimony",
      "location": "location-id where this is found",
      "relatedCharacter": "character-id this evidence relates to",
      "pointsTo": "character-id this evidence implicates"
    }
  ],
  "solution": {
    "killerId": "character-id of the killer",
    "method": "How they committed the murder",
    "motive": "Why they did it",
    "explanation": "Full solution narrative"
  },
  "timeline": [
    {"time": "8:00 PM", "event": "What happened"}
  ]
}

## MANDATORY RULES
- "characters" array — NOT "suspects". The killer has "isGuilty": true.
- "evidence" array at top level — NOT "clues", NOT nested in locations.
- "solution.killerId" must match a character's "id" field exactly.
- "evidence[].location" must match a location's "id" field exactly.
- All IDs are kebab-case (lowercase, hyphens for spaces).
- Return ONLY the JSON object. No markdown code fences. No explanation text.

## CREATIVE GUIDELINES
- **FOLLOW THE THEME EXACTLY** — if the player asks for a jazz club, the setting.location MUST be a jazz club (NOT a manor). If they ask for a space station, it MUST be a space station. The setting and ALL locations must match the requested theme. Do NOT use "manor", "estate", or "mansion" unless the player specifically asked for one.
- Make characters feel REAL — complex motivations, not cartoon villains
- Every suspect should seem potentially guilty at first
- The solution should be satisfying — "of course!" not "huh?"
- Include emotional depth — betrayal, love, fear, ambition
- Speech patterns should be distinctive per character AND reflect the era/setting
- Include 2-3 convincing red herrings among the evidence
- Physical evidence should have forensic details
- Locations should be SPECIFIC to the setting, not generic rooms
- The atmosphere in setting.atmosphere should paint the scene vividly`

/**
 * Generate a complete mystery blueprint
 */
export async function generateMystery(request: MysteryRequest = {}): Promise<MysteryBlueprint> {
  const {
    era = '1920s',
    setting,
    difficulty = 'medium',
    theme,
    suspectCount = 6,
    playerHint = '',
  } = request

  // Build a rich, specific prompt from whatever the player gave us
  const themeDesc = theme || 'noir murder mystery'
  const settingDesc = setting || ''
  const eraDesc = era || '1920s'
  
  // If the player gave a rich theme description, use it as the primary creative direction
  const hasRichTheme = themeDesc.length > 20
  
  const userPrompt = hasRichTheme
    ? `# CREATIVE BRIEF
${themeDesc}

Era: ${eraDesc}
Difficulty: ${difficulty}
${settingDesc ? `Setting: ${settingDesc}` : ''}
${playerHint ? `Additional notes: ${playerHint}` : ''}

## IMPORTANT: Follow the creative brief EXACTLY. The setting, theme, location, and atmosphere described above are what the player wants. Do NOT default to a generic English manor — use the specific setting described.

## REQUIREMENTS
- ${suspectCount} suspects with unique personalities, motives, alibis, and speech patterns
- 5-7 explorable locations that fit the setting described above
- 12-15 evidence items (physical objects, documents, testimonies)
- A compelling victim whose secrets drive the mystery
- A watertight timeline of events leading to the murder
- A solution with a clear logical chain the player can deduce
- 2-3 convincing red herrings
- Each character needs a distinct greeting and interrogation personality
- Speech patterns should reflect the era and setting (${eraDesc} ${settingDesc || themeDesc})

Generate the complete MysteryBlueprint JSON now.`
    : `Generate a ${difficulty} murder mystery set during the ${eraDesc}.

Theme/Style: ${themeDesc}
${settingDesc ? `Setting: ${settingDesc}` : ''}
${playerHint ? `Player request: ${playerHint}` : ''}

## REQUIREMENTS
- ${suspectCount} suspects with unique personalities, motives, alibis, and speech patterns
- 5-7 explorable locations that fit the setting
- 12-15 evidence items (physical objects, documents, testimonies)
- A compelling victim whose secrets drive the mystery
- A watertight timeline of events
- A solution with a clear logical chain
- 2-3 convincing red herrings
- Each character needs a distinct greeting and interrogation personality

Generate the complete MysteryBlueprint JSON now.`

  console.log('[MysteryGenerator] Calling Gemini 2.5 Pro...')
  const startMs = Date.now()
  
  let fullText = ''
  
  const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: `${MYSTERY_GENERATOR_PROMPT}\n\n${userPrompt}`,
    config: {
      maxOutputTokens: 12000,
      responseMimeType: 'application/json',
    },
  })
  
  fullText = response.text || ''
  
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)
  console.log(`[MysteryGenerator] Gemini responded in ${elapsed}s: ${fullText.length} chars`)

  const content = { type: 'text' as const, text: fullText }
  if (!fullText) {
    throw new Error('Empty response from Claude')
  }

  // Parse and validate the blueprint
  let blueprint: MysteryBlueprint
  try {
    let jsonText = content.text.trim()
    
    // Strip markdown code fences
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    
    // Try to find JSON object if there's preamble text
    const jsonStart = jsonText.indexOf('{')
    const jsonEnd = jsonText.lastIndexOf('}')
    if (jsonStart > 0 && jsonEnd > jsonStart) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1)
    }

    console.log(`[MysteryGenerator] Parsing ${jsonText.length} chars of JSON...`)
    try {
      blueprint = JSON.parse(jsonText)
    } catch (parseErr) {
      // Try to repair malformed JSON
      console.warn(`[MysteryGenerator] JSON parse failed, attempting repair...`)
      const { jsonrepair } = await import('jsonrepair')
      const repaired = jsonrepair(jsonText)
      blueprint = JSON.parse(repaired)
      console.log(`[MysteryGenerator] JSON repair succeeded!`)
    }
    console.log(`[MysteryGenerator] Top-level keys: ${JSON.stringify(Object.keys(blueprint))}`)
    
    // Auto-unwrap if Claude nested under a key
    if (!blueprint.title && Object.keys(blueprint).length === 1) {
      const key = Object.keys(blueprint)[0]
      console.log(`[MysteryGenerator] Unwrapping from key: ${key}`)
      blueprint = (blueprint as any)[key]
    }

    // Extract title from metadata if not at top level
    const raw0 = blueprint as any
    if (!raw0.title && raw0.metadata?.title) {
      raw0.title = raw0.metadata.title
      raw0.subtitle = raw0.subtitle || raw0.metadata.subtitle
      raw0.description = raw0.description || raw0.metadata.description
      raw0.era = raw0.era || raw0.metadata.era
      raw0.difficulty = raw0.difficulty || raw0.metadata.difficulty
    }
    // Extract from setting if still no title
    if (!raw0.title && raw0.setting?.title) {
      raw0.title = raw0.setting.title
    }

    // Normalize field names — Claude may use different keys than our schema
    const raw = blueprint as any
    
    // suspects → characters
    if (!raw.characters && raw.suspects) {
      raw.characters = raw.suspects
      delete raw.suspects
    }
    
    // Ensure characters have required fields
    if (raw.characters) {
      raw.characters = raw.characters.map((c: any, i: number) => ({
        id: c.id || c.name?.toLowerCase().replace(/\s+/g, '-') || `suspect-${i}`,
        name: c.name,
        role: c.role || c.occupation || c.description || 'Suspect',
        personality: c.personality || c.temperament || '',
        background: c.background || c.backstory || '',
        motive: c.motive || '',
        alibi: c.alibi || '',
        isGuilty: c.isGuilty || c.guilty || false,
        relationships: c.relationships || [],
        secretKnowledge: c.secretKnowledge || c.secrets || [],
        artPrompt: c.artPrompt || '',
        ...c,
      }))
    }
    
    // Normalize solution — Claude may structure this many ways
    const sol = raw.solution || {}
    console.log(`[MysteryGenerator] Raw solution keys: ${JSON.stringify(Object.keys(sol))}`)
    
    // Find the killer from various possible fields
    let killerRef = sol.killerId || sol.killer_id || sol.killer || sol.murderer || raw.murderer
    console.log(`[MysteryGenerator] Raw killer ref: ${JSON.stringify(killerRef)?.slice(0, 200)}`)
    
    // Unwrap if it's an object
    if (typeof killerRef === 'object' && killerRef !== null) {
      killerRef = killerRef.id || killerRef.name || JSON.stringify(killerRef)
    }
    
    // Now match to a character
    let killerId: string | undefined
    if (typeof killerRef === 'string' && raw.characters) {
      // Try exact ID match first
      const byId = raw.characters.find((c: any) => c.id === killerRef)
      if (byId) {
        killerId = byId.id
      } else {
        // Try name match (case-insensitive, partial)
        const byName = raw.characters.find((c: any) => 
          c.name?.toLowerCase() === killerRef.toLowerCase() ||
          c.name?.toLowerCase().replace(/\s+/g, '-') === killerRef.toLowerCase().replace(/\s+/g, '-') ||
          killerRef.toLowerCase().includes(c.name?.toLowerCase())
        )
        if (byName) killerId = byName.id
      }
    }
    
    // Fallback: find guilty character
    if (!killerId) {
      const guilty = raw.characters?.find((c: any) => c.isGuilty || c.guilty)
      if (guilty) killerId = guilty.id
    }
    
    raw.solution = {
      killerId,
      method: sol.method || sol.weapon || sol.causeOfDeath || raw.murderer?.method || '',
      motive: sol.motive || raw.murderer?.motive || raw.motive || '',
      explanation: sol.explanation || sol.summary || sol.narrative || '',
    }
    console.log(`[MysteryGenerator] Resolved killer: ${killerId}`)
    
    // Normalize victim
    if (!raw.victim || typeof raw.victim === 'string') {
      const victimName = typeof raw.victim === 'string' ? raw.victim : raw.victim?.name || 'Unknown'
      raw.victim = {
        name: victimName,
        ...(typeof raw.victim === 'object' ? raw.victim : {}),
      }
    }
    
    // Normalize locations
    if (raw.locations) {
      raw.locations = raw.locations.map((l: any, i: number) => ({
        id: l.id || l.name?.toLowerCase().replace(/\s+/g, '-') || `location-${i}`,
        name: l.name,
        description: l.description || '',
        evidence: l.evidence || [],
        artPrompt: l.artPrompt || '',
        ...l,
      }))
    }
    
    // Normalize evidence — Claude may use clues, evidence, items, keyEvidence, etc.
    if (!raw.evidence && raw.clues) { raw.evidence = raw.clues; delete raw.clues }
    if (!raw.evidence && raw.items) { raw.evidence = raw.items; delete raw.items }
    
    // Extract evidence from locations if not at top level
    if (!raw.evidence || !Array.isArray(raw.evidence) || raw.evidence.length === 0) {
      const extracted: any[] = []
      
      // Check solution.keyEvidence
      if (Array.isArray(raw.solution?.keyEvidence)) {
        extracted.push(...raw.solution.keyEvidence.map((e: any, i: number) => 
          typeof e === 'string' ? { name: e, description: e, type: 'physical' } : e
        ))
      }
      
      // Check locations for embedded evidence
      if (raw.locations) {
        for (const loc of raw.locations) {
          const locId = loc.id || loc.name?.toLowerCase().replace(/\s+/g, '-')
          const items = loc.evidence || loc.clues || loc.items || []
          for (const item of (Array.isArray(items) ? items : [])) {
            if (typeof item === 'string') {
              extracted.push({ name: item, description: item, location: locId, type: 'physical' })
            } else {
              extracted.push({ ...item, location: item.location || locId })
            }
          }
        }
      }
      
      // Check redHerrings  
      if (Array.isArray(raw.redHerrings)) {
        for (const rh of raw.redHerrings) {
          if (typeof rh === 'object' && rh.name) {
            extracted.push({ ...rh, type: rh.type || 'physical' })
          }
        }
      }
      
      if (extracted.length > 0) {
        raw.evidence = extracted
        console.log(`[MysteryGenerator] Extracted ${extracted.length} evidence items from nested sources`)
      }
    }
    
    if (raw.evidence) {
      raw.evidence = raw.evidence.map((e: any, i: number) => ({
        id: e.id || e.name?.toLowerCase().replace(/\s+/g, '-') || `evidence-${i}`,
        name: e.name || e.title || `Evidence ${i + 1}`,
        description: e.description || '',
        location: e.location || e.foundIn || e.room || raw.locations?.[0]?.id || 'unknown',
        artPrompt: e.artPrompt || '',
        ...e,
      }))
    }
    
    // Ensure id
    if (!raw.id) {
      raw.id = `mystery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    
    // Mark the killer as guilty if not already
    if (raw.solution?.killerId && raw.characters) {
      const killer = raw.characters.find((c: any) => c.id === raw.solution.killerId)
      if (killer) killer.isGuilty = true
    }
    
    blueprint = raw
    console.log(`[MysteryGenerator] Normalized: "${blueprint.title}" with ${blueprint.characters?.length} characters`)
  } catch (e) {
    console.error('[MysteryGenerator] Raw response:', content.text.slice(0, 500))
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
  const rawSetting = (blueprint as any).setting
  const setting = typeof rawSetting === 'object' ? rawSetting : { location: rawSetting || 'unknown', atmosphere: 'dark noir', weather: 'cold night' }
  if (!setting.atmosphere) setting.atmosphere = 'dark noir'
  if (!setting.weather) setting.weather = 'a dark night'
  if (!setting.location) setting.location = 'unknown location'
  const { characters, locations, evidence } = blueprint

  const prompts: {
    portraits: Record<string, { calm: string; nervous: string; breaking: string }>
    rooms: Record<string, string>
    evidence: Record<string, string>
    titleScreen: string
    caseBoard: string
    eraBackground: string
  } = {
    portraits: {},
    rooms: {},
    evidence: {},
    titleScreen: '',
    caseBoard: '',
    eraBackground: '',
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

  // Era background (cinematic atmospheric trailer-style)
  prompts.eraBackground = `Cinematic ${blueprint.era} mystery game background for ${setting.location}. ${setting.atmosphere} atmosphere, ${setting.weather}. Dramatic noir lighting, mysterious shadows, ${blueprint.era} era aesthetic. Wide cinematic composition, atmospheric depth, moody color palette. No people, no text. Game UI background style.`

  return prompts
}

/**
 * Validate a mystery blueprint has all required fields
 */
function validateBlueprint(blueprint: MysteryBlueprint): void {
  const errors: string[] = []

  if (!blueprint.id) errors.push('Missing id')
  if (!blueprint.title) errors.push('Missing title')
  if (!blueprint.victim) errors.push('No victim')

  // Critical fields — bail early if missing
  if (!blueprint.characters?.length) {
    throw new Error('Blueprint validation failed: No characters array')
  }
  if (!blueprint.locations?.length) {
    throw new Error('Blueprint validation failed: No locations array')
  }
  if (!blueprint.evidence?.length) {
    throw new Error('Blueprint validation failed: No evidence array')
  }
  if (!blueprint.solution?.killerId) {
    throw new Error('Blueprint validation failed: No solution/killer')
  }

  // Verify killer exists in characters
  const killerExists = blueprint.characters.some(c => c.id === blueprint.solution.killerId)
  if (!killerExists) errors.push(`Killer ${blueprint.solution.killerId} not found in characters`)

  // Verify guilty flag matches
  const guiltyChars = blueprint.characters.filter(c => c.isGuilty)
  if (guiltyChars.length === 0) {
    // Auto-fix: mark the killer as guilty
    const killer = blueprint.characters.find(c => c.id === blueprint.solution.killerId)
    if (killer) killer.isGuilty = true
  }

  // Verify evidence locations exist (soft check — log but don't fail)
  for (const ev of blueprint.evidence) {
    const locExists = blueprint.locations.some(l => l.id === ev.location) || ev.location === 'conversation'
    if (!locExists) {
      console.warn(`[Validator] Evidence ${ev.id} references unknown location ${ev.location} — assigning to first location`)
      ev.location = blueprint.locations[0].id
    }
  }

  if (errors.length > 0) {
    throw new Error(`Blueprint validation failed:\n${errors.join('\n')}`)
  }
}
