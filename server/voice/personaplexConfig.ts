/**
 * PersonaPlex Character Voice Configuration
 * 
 * Maps each Ashford Affair character to their unique voice and persona.
 * Optimized for 1920s noir murder mystery atmosphere.
 */

import { CharacterProfile } from '../../src/agents/types'

/**
 * PersonaPlex Voice IDs
 * NAT = Natural (more conversational)
 * VAR = Variety (more distinctive)
 * F/M = Female/Male
 * 0-4 = Voice variant number
 */
export type PersonaPlexVoiceId = 
  | 'NATF0' | 'NATF1' | 'NATF2' | 'NATF3'  // Natural Female
  | 'NATM0' | 'NATM1' | 'NATM2' | 'NATM3'  // Natural Male
  | 'VARF0' | 'VARF1' | 'VARF2' | 'VARF3' | 'VARF4'  // Variety Female
  | 'VARM0' | 'VARM1' | 'VARM2' | 'VARM3' | 'VARM4'  // Variety Male

/**
 * Voice characteristics for a character
 */
export interface CharacterVoiceProfile {
  voiceId: PersonaPlexVoiceId
  description: string
  characteristics: {
    pace: 'slow' | 'normal' | 'fast'
    tone: string
    distinctive: string[]
  }
  emotionalRange: {
    neutral: string
    stressed: string
    defensive: string
    evasive: string
  }
}

/**
 * Character voice assignments - carefully matched to personality and role
 * 
 * Voice Selection Criteria:
 * - Victoria: NATF0 (natural female 0) - most formal, composed
 * - Thomas: NATM1 (natural male 1) - younger, slightly nervous energy
 * - Eleanor: NATF2 (natural female 2) - clear, intelligent articulation
 * - Marcus: NATM0 (natural male 0) - mature, reassuring authority
 * - Lillian: VARF1 (variety female 1) - distinctive nostalgic quality
 * - James: VARM0 (variety male 0) - deep, formal butler voice
 */
export const ASHFORD_VOICES: Record<string, CharacterVoiceProfile> = {
  victoria: {
    voiceId: 'NATF0',
    description: 'Formal, composed, aristocratic with cold undertones',
    characteristics: {
      pace: 'normal',
      tone: 'Controlled and measured, revealing little emotion',
      distinctive: [
        'Slight pause before answering difficult questions',
        'Crisp enunciation',
        'Barely perceptible tremor when lying',
      ],
    },
    emotionalRange: {
      neutral: 'Cool, detached, imperious',
      stressed: 'Clipped words, faster pace, rising pitch on defensive statements',
      defensive: 'Icy calm with sharp edges, slower deliberate speech',
      evasive: 'Smooth redirects, topic changes with minimal hesitation',
    },
  },

  thomas: {
    voiceId: 'NATM1',
    description: 'Charming but with underlying nervous energy, younger male voice',
    characteristics: {
      pace: 'fast',
      tone: 'Engaging and personable, but occasionally rushed',
      distinctive: [
        'Slight stammer when caught in a lie',
        'Nervous laugh to deflect',
        'Voice cracks under pressure',
      ],
    },
    emotionalRange: {
      neutral: 'Friendly, open, slightly self-deprecating',
      stressed: 'Rapid speech, rising pitch, verbal fumbling',
      defensive: 'Indignant but wavering, appeals to being misunderstood',
      evasive: 'Rambling tangents, joke deflections',
    },
  },

  eleanor: {
    voiceId: 'NATF2',
    description: 'Clear, intelligent, carefully measured - professional secretary',
    characteristics: {
      pace: 'normal',
      tone: 'Precise and articulate, every word chosen carefully',
      distinctive: [
        'Perfect grammar even under stress',
        'Slightly warmer when discussing literature',
        'Controlled emotional displays',
      ],
    },
    emotionalRange: {
      neutral: 'Professional, observant, subtly guarded',
      stressed: 'Overly formal, academic word choice increases',
      defensive: 'Logical arguments, appeals to facts and evidence',
      evasive: 'Intellectualizing, abstract language to avoid directness',
    },
  },

  marcus: {
    voiceId: 'NATM0',
    description: 'Mature, distinguished, reassuring doctor voice with authority',
    characteristics: {
      pace: 'slow',
      tone: 'Warm but professional, naturally authoritative',
      distinctive: [
        'Medical terminology woven in naturally',
        'Comforting bedside manner',
        'Slight hesitation before discussing personal matters',
      ],
    },
    emotionalRange: {
      neutral: 'Calm, reassuring, paternal',
      stressed: 'Maintains composure, but voice becomes softer',
      defensive: 'Appeals to professional ethics and medical duty',
      evasive: 'Doctor-patient confidentiality deflections',
    },
  },

  lillian: {
    voiceId: 'VARF1',
    description: 'Nostalgic, world-weary with hints of bitterness beneath warmth',
    characteristics: {
      pace: 'slow',
      tone: 'Wistful and reminiscent, carrying years of history',
      distinctive: [
        'Occasional theatrical flourish from acting days',
        'Bitter edge when discussing the present',
        'Warm nostalgia when recalling the past',
      ],
    },
    emotionalRange: {
      neutral: 'Melancholic warmth, slightly distant',
      stressed: 'Emotional, voice trembles, tears threaten',
      defensive: 'Dramatic declarations, appeals to past glory',
      evasive: 'Lost in reminiscence, deflecting to old stories',
    },
  },

  james: {
    voiceId: 'VARM0',
    description: 'Formal, dignified, quietly observant butler with deep voice',
    characteristics: {
      pace: 'slow',
      tone: 'Impeccably proper, respectful yet detached',
      distinctive: [
        'Perfect diction and formal address',
        'Slight disapproval in tone when propriety is violated',
        'Observes more than speaks',
      ],
    },
    emotionalRange: {
      neutral: 'Professional distance, respectful formality',
      stressed: 'Even more formal, retreating into role',
      defensive: 'Appeals to duty and proper conduct',
      evasive: 'Discretion as a virtue, selective memory',
    },
  },
}

/**
 * Build a PersonaPlex-optimized text prompt for a character.
 * 
 * PersonaPlex training format expects customer service or assistant style prompts.
 * We adapt this for murder mystery interrogation.
 */
export function buildCharacterPersonaPrompt(
  characterId: string,
  character: CharacterProfile,
  worldContext: string
): string {
  const voiceProfile = ASHFORD_VOICES[characterId]
  if (!voiceProfile) {
    throw new Error(`No voice profile for character: ${characterId}`)
  }

  // Build relationship context
  const relationships = Object.entries(character.relationships)
    .map(([name, relation]) => `${name}: ${relation}`)
    .join('; ')

  // Create a focused prompt (PersonaPlex works best with concise prompts)
  const prompt = `You are ${character.name}, ${character.role} at Ashford Manor in 1929.

PERSONALITY: ${character.personality}

VOICE: ${voiceProfile.description}
Speak with ${voiceProfile.characteristics.pace} pacing, ${voiceProfile.characteristics.tone}.

CONTEXT: It's New Year's Eve. Edmund Ashford has been found murdered. You are being questioned.

YOUR SITUATION:
- Alibi: ${character.alibi}
${character.isGuilty ? '- YOU are the killer. You must seem helpful while deflecting suspicion.' : '- You are innocent but have secrets to protect.'}
- Relationships: ${relationships}

SECRETS (never state directly, but they influence your answers):
${character.privateSecrets.slice(0, 3).join('; ')}

SPEAKING STYLE: ${character.speechPattern}

You enjoy having a good conversation. Answer questions about the murder investigation while staying in character. Show appropriate emotion for someone being questioned about a murder.`

  return prompt
}

/**
 * Voice synthesis parameters for different emotional states
 */
export interface VoiceSynthesisParams {
  speed: number      // 0.5 - 2.0 (1.0 = normal)
  pitch: number      // 0.5 - 2.0 (1.0 = normal)
  emphasis: number   // 0.0 - 1.0 (amount of emotional emphasis)
}

/**
 * Get voice parameters adjusted for character and emotional state
 */
export function getVoiceParameters(
  characterId: string,
  emotion: string
): VoiceSynthesisParams {
  const voiceProfile = ASHFORD_VOICES[characterId]
  if (!voiceProfile) {
    return { speed: 1.0, pitch: 1.0, emphasis: 0.5 }
  }

  // Base parameters from character pace
  const baseSpeed = voiceProfile.characteristics.pace === 'fast' ? 1.1 
    : voiceProfile.characteristics.pace === 'slow' ? 0.9 
    : 1.0

  // Emotional adjustments
  const emotionModifiers: Record<string, Partial<VoiceSynthesisParams>> = {
    neutral: { speed: baseSpeed, pitch: 1.0, emphasis: 0.5 },
    nervous: { speed: baseSpeed * 1.15, pitch: 1.05, emphasis: 0.7 },
    angry: { speed: baseSpeed * 1.1, pitch: 0.95, emphasis: 0.9 },
    sad: { speed: baseSpeed * 0.85, pitch: 0.95, emphasis: 0.6 },
    amused: { speed: baseSpeed * 1.05, pitch: 1.05, emphasis: 0.6 },
    indignant: { speed: baseSpeed, pitch: 1.0, emphasis: 0.85 },
    defensive: { speed: baseSpeed * 1.1, pitch: 1.02, emphasis: 0.75 },
    evasive: { speed: baseSpeed * 0.95, pitch: 1.0, emphasis: 0.4 },
    guarded: { speed: baseSpeed * 0.95, pitch: 0.98, emphasis: 0.5 },
    stressed: { speed: baseSpeed * 1.15, pitch: 1.03, emphasis: 0.8 },
  }

  const modifier = emotionModifiers[emotion] || emotionModifiers.neutral

  return {
    speed: modifier.speed || baseSpeed,
    pitch: modifier.pitch || 1.0,
    emphasis: modifier.emphasis || 0.5,
  }
}

/**
 * Get the voice file name for PersonaPlex (e.g., "NATF0.pt")
 */
export function getVoiceFileName(characterId: string): string {
  const voiceProfile = ASHFORD_VOICES[characterId]
  if (!voiceProfile) {
    throw new Error(`No voice profile for character: ${characterId}`)
  }
  return `${voiceProfile.voiceId}.pt`
}

/**
 * Validate that a character has a voice configuration
 */
export function hasVoiceConfiguration(characterId: string): boolean {
  return characterId in ASHFORD_VOICES
}

/**
 * Get all configured character IDs
 */
export function getConfiguredCharacters(): string[] {
  return Object.keys(ASHFORD_VOICES)
}

/**
 * Get character's emotional range descriptions for UI display
 */
export function getEmotionalRange(characterId: string): Record<string, string> | null {
  const voiceProfile = ASHFORD_VOICES[characterId]
  return voiceProfile ? voiceProfile.emotionalRange : null
}
