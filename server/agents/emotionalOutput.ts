/**
 * Structured Emotional Output for Character Agents
 * 
 * Enhances character responses with structured emotional data
 * that drives visual presentation (portrait videos, voice modulation).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { EmotionalState } from '../video/portraitGenerator'

export interface InternalState {
  thought: string        // What they're actually thinking
  fear: string | null    // What they're afraid you'll discover
  strategy: string       // How they're trying to manipulate the situation
}

export interface EmotionalData {
  primary: EmotionalState
  secondary?: EmotionalState
  intensity: number      // 0-100
  tells: string[]        // Observable behaviors ("fidgeting with ring", "avoiding eye contact")
  microexpressions: string[] // Brief flashes of true emotion
}

export interface VoiceModifiers {
  pace: 'fast' | 'normal' | 'slow'
  tremor: boolean
  volume: 'whisper' | 'normal' | 'raised'
  breaks: boolean        // Voice breaking with emotion
}

export interface StructuredCharacterResponse {
  dialogue: string
  internal: InternalState
  emotion: EmotionalData
  voice: VoiceModifiers
  // For the UI to show subtle hints
  observableHint?: string  // "You notice their hand trembles slightly"
}

/**
 * Analyze a character's response and extract structured emotional data
 */
export async function analyzeEmotionalState(
  anthropic: Anthropic,
  characterId: string,
  isGuilty: boolean,
  pressureLevel: number,
  dialogue: string,
  questionAsked: string,
  recentContext: string
): Promise<Omit<StructuredCharacterResponse, 'dialogue'>> {
  
  const prompt = `Analyze this character's emotional state during a murder mystery interrogation.

CHARACTER: ${characterId}
IS GUILTY: ${isGuilty}
PRESSURE LEVEL: ${pressureLevel}/100
QUESTION ASKED: "${questionAsked}"
THEIR RESPONSE: "${dialogue}"
RECENT CONTEXT: ${recentContext}

Analyze their TRUE emotional state (not what they're showing) and output JSON:

{
  "internal": {
    "thought": "What they're REALLY thinking right now (1 sentence)",
    "fear": "What specific thing they're afraid will be discovered (or null if nothing specific)",
    "strategy": "How they're trying to control the conversation (1 sentence)"
  },
  "emotion": {
    "primary": "composed|nervous|defensive|breaking|relieved|hostile",
    "secondary": "optional second emotion or null",
    "intensity": 0-100,
    "tells": ["2-3 observable physical behaviors they can't fully hide"],
    "microexpressions": ["1-2 brief flashes of true emotion that a perceptive observer might catch"]
  },
  "voice": {
    "pace": "fast|normal|slow",
    "tremor": true/false,
    "volume": "whisper|normal|raised",
    "breaks": true/false
  },
  "observableHint": "A short sentence describing what the detective might notice (or null)"
}

Consider:
- Guilty characters try harder to appear calm but have more to hide
- High pressure causes cracks in the facade
- Characters have different baselines (James is always formal, Thomas is always somewhat nervous)
- The emotion should match the content and context

JSON only:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        internal: parsed.internal || { thought: '', fear: null, strategy: '' },
        emotion: {
          primary: parsed.emotion?.primary || 'composed',
          secondary: parsed.emotion?.secondary || undefined,
          intensity: parsed.emotion?.intensity || 50,
          tells: parsed.emotion?.tells || [],
          microexpressions: parsed.emotion?.microexpressions || [],
        },
        voice: {
          pace: parsed.voice?.pace || 'normal',
          tremor: parsed.voice?.tremor || false,
          volume: parsed.voice?.volume || 'normal',
          breaks: parsed.voice?.breaks || false,
        },
        observableHint: parsed.observableHint || undefined,
      }
    }
  } catch (error) {
    console.error('[EmotionalOutput] Analysis failed:', error)
  }
  
  // Fallback based on pressure level
  return getDefaultEmotionalState(pressureLevel, isGuilty)
}

/**
 * Get default emotional state based on pressure (used as fallback)
 */
function getDefaultEmotionalState(
  pressureLevel: number,
  isGuilty: boolean
): Omit<StructuredCharacterResponse, 'dialogue'> {
  let primary: EmotionalState = 'composed'
  let intensity = 30
  
  if (pressureLevel > 80) {
    primary = isGuilty ? 'breaking' : 'defensive'
    intensity = 85
  } else if (pressureLevel > 60) {
    primary = isGuilty ? 'nervous' : 'defensive'
    intensity = 70
  } else if (pressureLevel > 30) {
    primary = 'nervous'
    intensity = 50
  }
  
  return {
    internal: {
      thought: isGuilty ? 'I need to stay calm...' : 'Why are they focusing on me?',
      fear: isGuilty ? 'They might find the evidence' : null,
      strategy: 'Deflect and stay composed',
    },
    emotion: {
      primary,
      intensity,
      tells: pressureLevel > 50 ? ['slight tension in shoulders'] : [],
      microexpressions: [],
    },
    voice: {
      pace: pressureLevel > 60 ? 'fast' : 'normal',
      tremor: pressureLevel > 70,
      volume: 'normal',
      breaks: pressureLevel > 85 && isGuilty,
    },
  }
}

/**
 * Quick emotional state estimation without API call
 * Used for real-time updates between full analysis
 */
export function estimateEmotionalState(
  pressureLevel: number,
  isGuilty: boolean,
  recentEmotions: EmotionalState[]
): EmotionalData {
  // Weight recent emotions
  const emotionCounts: Record<string, number> = {}
  recentEmotions.forEach((e, i) => {
    const weight = 1 + (i / recentEmotions.length) // More recent = higher weight
    emotionCounts[e] = (emotionCounts[e] || 0) + weight
  })
  
  // Determine primary based on pressure and history
  let primary: EmotionalState = 'composed'
  
  if (pressureLevel > 85) {
    primary = isGuilty ? 'breaking' : 'hostile'
  } else if (pressureLevel > 65) {
    primary = 'defensive'
  } else if (pressureLevel > 40) {
    primary = 'nervous'
  } else if (recentEmotions.length > 0) {
    // Use most common recent emotion
    primary = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionalState || 'composed'
  }
  
  return {
    primary,
    intensity: Math.min(100, pressureLevel + (isGuilty ? 15 : 0)),
    tells: [],
    microexpressions: [],
  }
}

/**
 * Character-specific emotional baselines
 * Some characters are naturally more nervous, others more composed
 */
export const CHARACTER_EMOTIONAL_BASELINES: Record<string, {
  defaultState: EmotionalState
  intensityModifier: number  // Added to base intensity
  nervousnessThreshold: number // Pressure level where they start showing nervousness
}> = {
  victoria: {
    defaultState: 'composed',
    intensityModifier: -10,  // Very controlled
    nervousnessThreshold: 60,
  },
  thomas: {
    defaultState: 'nervous',
    intensityModifier: 15,   // Already anxious
    nervousnessThreshold: 20,
  },
  eleanor: {
    defaultState: 'composed',
    intensityModifier: 0,
    nervousnessThreshold: 45,
  },
  marcus: {
    defaultState: 'composed',
    intensityModifier: 5,    // Hides guilt
    nervousnessThreshold: 50,
  },
  lillian: {
    defaultState: 'composed',
    intensityModifier: 0,
    nervousnessThreshold: 55,
  },
  james: {
    defaultState: 'composed',
    intensityModifier: -15,  // Professional composure
    nervousnessThreshold: 70,
  },
}

/**
 * Apply character baseline to emotional state
 */
export function applyCharacterBaseline(
  characterId: string,
  emotion: EmotionalData
): EmotionalData {
  const baseline = CHARACTER_EMOTIONAL_BASELINES[characterId]
  if (!baseline) return emotion
  
  return {
    ...emotion,
    intensity: Math.max(0, Math.min(100, emotion.intensity + baseline.intensityModifier)),
  }
}
