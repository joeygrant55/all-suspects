/**
 * Character Portrait Video Generator
 * 
 * Generates cinematic video portraits of characters using Veo 3.
 * Supports multiple emotional states that sync with the agent's output.
 */

import { generateVideo, getGenerationStatus, type VideoGenerationResult } from './veoClient'

export type EmotionalState = 'composed' | 'nervous' | 'defensive' | 'breaking' | 'relieved' | 'hostile'

export interface PortraitRequest {
  characterId: string
  emotionalState: EmotionalState
  intensity?: number // 0-100, affects how pronounced the emotion is
  context?: string   // Additional context for more specific generation
}

export interface PortraitResult {
  characterId: string
  emotionalState: EmotionalState
  videoUrl?: string
  generationId: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
}

// Character base visual descriptions
const CHARACTER_VISUALS: Record<string, {
  appearance: string
  setting: string
  lighting: string
}> = {
  victoria: {
    appearance: 'elegant woman late 40s, silver-streaked hair pinned up in 1920s style, pearl necklace, dark burgundy evening gown',
    setting: 'sitting in wing chair by fireplace in 1920s manor study',
    lighting: 'warm amber candlelight and firelight, noir cinematography with film grain',
  },
  thomas: {
    appearance: 'young man late 20s, dark disheveled hair, loosened bow tie on white shirt, dark green suit jacket',
    setting: 'standing by rain-streaked window in 1920s manor',
    lighting: 'dramatic shadows from window light, noir style with film grain',
  },
  eleanor: {
    appearance: 'professional woman early 30s, wire-rimmed glasses, brown hair in neat bun, simple navy dress with white collar',
    setting: 'seated at writing desk in 1920s study',
    lighting: 'warm desk lamp lighting one side of face, noir cinematography',
  },
  marcus: {
    appearance: 'distinguished older gentleman 50s, well-groomed gray beard, three-piece brown suit, pocket watch chain visible',
    setting: 'standing by bookshelf in 1920s manor library, medical bag on table nearby',
    lighting: 'firelight flickers across face, atmospheric noir lighting',
  },
  lillian: {
    appearance: 'attractive woman early 40s, bold red lipstick, styled finger waves hair, purple beaded flapper dress',
    setting: 'seated on settee in 1920s parlor, cigarette holder in hand with subtle smoke wisps',
    lighting: 'dying fire behind, moody noir lighting',
  },
  james: {
    appearance: 'elderly butler 60s, silver hair impeccably combed, formal black tailcoat with white gloves',
    setting: 'standing at attention in manor hallway',
    lighting: 'soft overhead lighting with deep shadows, 1920s period atmosphere',
  },
}

// Emotional state behavior descriptions
const EMOTIONAL_BEHAVIORS: Record<EmotionalState, {
  expression: string
  movement: string
  gaze: string
}> = {
  composed: {
    expression: 'calm measured expression, occasional slow blink',
    movement: 'subtle breathing movement, minimal fidgeting, poised posture',
    gaze: 'steady direct gaze at camera, confident',
  },
  nervous: {
    expression: 'worried expression, swallows hard, lip quivers slightly',
    movement: 'shifts weight anxiously, runs hand through hair or adjusts clothing, fidgeting',
    gaze: 'avoids eye contact, darting glances, forces self to look at camera then looks away',
  },
  defensive: {
    expression: 'jaw clenched, narrowed eyes, defensive scowl',
    movement: 'arms crossed or hands gripping armrest, tense shoulders, rigid posture',
    gaze: 'hard stare at camera, challenging, hostile',
  },
  breaking: {
    expression: 'tears welling in eyes, face crumbling, anguished expression',
    movement: 'head drops, shoulders shake, hand covers mouth or wipes eyes',
    gaze: 'looks down unable to meet camera, overwhelmed',
  },
  relieved: {
    expression: 'exhale of relief, slight relaxation of features',
    movement: 'shoulders drop, posture loosens, deep breath',
    gaze: 'looks at camera with hint of hope or gratitude',
  },
  hostile: {
    expression: 'snarling contempt, fury barely contained',
    movement: 'leans forward aggressively, finger pointing or fist clenching',
    gaze: 'glaring directly at camera with anger',
  },
}

// Intensity modifiers
function getIntensityModifier(intensity: number): string {
  if (intensity < 30) return 'subtly'
  if (intensity < 60) return 'noticeably'
  if (intensity < 80) return 'clearly'
  return 'intensely'
}

/**
 * Build the full prompt for a character portrait video
 */
export function buildPortraitPrompt(
  characterId: string,
  emotionalState: EmotionalState,
  intensity: number = 50,
  context?: string
): string {
  const character = CHARACTER_VISUALS[characterId]
  const emotion = EMOTIONAL_BEHAVIORS[emotionalState]
  
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`)
  }

  const intensityMod = getIntensityModifier(intensity)
  
  let prompt = `Cinematic close-up portrait video, ${character.appearance}, ${character.setting}. `
  prompt += `${intensityMod} ${emotion.expression}, ${emotion.movement}, ${emotion.gaze}. `
  prompt += `${character.lighting}. `
  
  if (context) {
    prompt += `Context: ${context}. `
  }
  
  prompt += `8 seconds seamless loop, photorealistic, period accurate 1920s.`
  
  return prompt
}

// Cache for generated portraits
const portraitCache: Map<string, PortraitResult> = new Map()

function getCacheKey(characterId: string, emotionalState: EmotionalState): string {
  return `${characterId}:${emotionalState}`
}

/**
 * Get or generate a character portrait video
 */
export async function getCharacterPortrait(
  request: PortraitRequest
): Promise<PortraitResult> {
  const cacheKey = getCacheKey(request.characterId, request.emotionalState)
  
  // Check cache first
  const cached = portraitCache.get(cacheKey)
  if (cached && cached.status === 'ready' && cached.videoUrl) {
    return cached
  }
  
  // If already generating, return current status
  if (cached && (cached.status === 'pending' || cached.status === 'generating')) {
    // Check if generation completed
    const status = getGenerationStatus(cached.generationId)
    if (status?.status === 'completed' && status.videoUrl) {
      const result: PortraitResult = {
        ...cached,
        status: 'ready',
        videoUrl: status.videoUrl,
      }
      portraitCache.set(cacheKey, result)
      return result
    }
    return cached
  }
  
  // Generate new portrait
  const prompt = buildPortraitPrompt(
    request.characterId,
    request.emotionalState,
    request.intensity,
    request.context
  )
  
  const result: PortraitResult = {
    characterId: request.characterId,
    emotionalState: request.emotionalState,
    generationId: '',
    status: 'pending',
  }
  
  try {
    const videoResult = await generateVideo({
      prompt,
      characterId: request.characterId,
      testimonyId: `portrait:${request.emotionalState}`,
      duration: 8,
      aspectRatio: '16:9',
    })
    
    result.generationId = videoResult.generationId
    result.status = videoResult.success ? 'generating' : 'error'
    
    if (videoResult.videoUrl) {
      result.status = 'ready'
      result.videoUrl = videoResult.videoUrl
    }
    
    if (videoResult.error) {
      result.error = videoResult.error
    }
    
  } catch (error) {
    result.status = 'error'
    result.error = error instanceof Error ? error.message : 'Generation failed'
  }
  
  portraitCache.set(cacheKey, result)
  return result
}

/**
 * Check status of a portrait generation
 */
export function checkPortraitStatus(
  characterId: string,
  emotionalState: EmotionalState
): PortraitResult | null {
  const cacheKey = getCacheKey(characterId, emotionalState)
  const cached = portraitCache.get(cacheKey)
  
  if (!cached) return null
  
  // If still generating, check for updates
  if (cached.status === 'generating' && cached.generationId) {
    const status = getGenerationStatus(cached.generationId)
    if (status?.status === 'completed' && status.videoUrl) {
      cached.status = 'ready'
      cached.videoUrl = status.videoUrl
      portraitCache.set(cacheKey, cached)
    } else if (status?.status === 'failed') {
      cached.status = 'error'
      cached.error = status.error
      portraitCache.set(cacheKey, cached)
    }
  }
  
  return cached
}

/**
 * Pre-generate all base portraits for a character
 */
export async function pregenerateCharacterPortraits(
  characterId: string,
  states: EmotionalState[] = ['composed', 'nervous', 'defensive']
): Promise<void> {
  console.log(`[Portrait] Pre-generating portraits for ${characterId}:`, states)
  
  for (const state of states) {
    await getCharacterPortrait({ characterId, emotionalState: state })
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

/**
 * Get all cached portraits
 */
export function getAllCachedPortraits(): Record<string, PortraitResult> {
  const result: Record<string, PortraitResult> = {}
  portraitCache.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Clear portrait cache
 */
export function clearPortraitCache(): void {
  portraitCache.clear()
}
