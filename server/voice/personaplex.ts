/**
 * PersonaPlex Voice Integration for All Suspects
 * 
 * Real-time, full-duplex speech-to-speech conversations with NPCs.
 * Each character gets a unique voice + persona configuration.
 * 
 * @see https://github.com/NVIDIA/personaplex
 */

import { CharacterProfile } from '../../src/agents/types'

// Pre-packaged voice embeddings from PersonaPlex
// Natural voices sound more conversational, Variety voices are more distinctive
type VoiceId = 
  | 'NATF0' | 'NATF1' | 'NATF2' | 'NATF3'  // Natural Female
  | 'NATM0' | 'NATM1' | 'NATM2' | 'NATM3'  // Natural Male
  | 'VARF0' | 'VARF1' | 'VARF2' | 'VARF3' | 'VARF4'  // Variety Female
  | 'VARM0' | 'VARM1' | 'VARM2' | 'VARM3' | 'VARM4'  // Variety Male

interface CharacterVoiceConfig {
  voiceId: VoiceId
  description: string
}

// Character voice assignments - matched to personality
export const CHARACTER_VOICES: Record<string, CharacterVoiceConfig> = {
  victoria: {
    voiceId: 'NATF0',
    description: 'Formal, composed, aristocratic. Cold undertones.',
  },
  thomas: {
    voiceId: 'NATM1', 
    description: 'Charming but with nervous energy. Younger male voice.',
  },
  eleanor: {
    voiceId: 'NATF2',
    description: 'Clear, intelligent, carefully measured. Professional.',
  },
  marcus: {
    voiceId: 'NATM0',
    description: 'Mature, distinguished, reassuring doctor voice.',
  },
  lillian: {
    voiceId: 'NATF3',
    description: 'World-weary, hints of bitterness beneath warmth.',
  },
  james: {
    voiceId: 'NATM2',
    description: 'Dignified, formal, quietly observant butler.',
  },
}

/**
 * Build the PersonaPlex text prompt for a character.
 * This defines their personality, knowledge, and conversation style.
 */
export function buildPersonaPrompt(character: CharacterProfile, worldContext: string): string {
  const relationshipSummary = Object.entries(character.relationships)
    .map(([name, rel]) => `- ${name}: ${rel}`)
    .join('\n')

  // Build a rich customer-service style prompt (PersonaPlex's training format)
  return `You are ${character.name}, ${character.role} at Ashford Manor on New Year's Eve, 1929.

PERSONALITY: ${character.personality}

SPEECH STYLE: ${character.speechPattern}

PUBLIC BACKGROUND: ${character.publicInfo}

YOUR SECRETS (never reveal directly, but let them influence your behavior):
${character.privateSecrets.map(s => `- ${s}`).join('\n')}

YOUR ALIBI: ${character.alibi}
${character.isGuilty ? '\nYOU ARE THE KILLER. You struck Edmund in a moment of rage. You must deflect suspicion while appearing cooperative.' : ''}

YOUR RELATIONSHIPS:
${relationshipSummary}

WORLD CONTEXT:
${worldContext}

INSTRUCTIONS:
- Stay in character at all times as ${character.name}
- Respond to questions about the murder investigation
- Be evasive about your secrets but consistent
- Show emotion appropriate to someone being questioned about a murder
- If pressed hard on sensitive topics, become defensive or try to redirect
- Remember: you have something to hide, but you want to appear helpful
- Never break character or acknowledge you are an AI

You enjoy having a good conversation. You are being interviewed by a detective about a murder.`
}

/**
 * PersonaPlex server configuration
 */
export interface PersonaPlexConfig {
  serverUrl: string  // WebSocket URL to PersonaPlex server
  voicePrompt: VoiceId
  textPrompt: string
  seed?: number
}

/**
 * Create configuration for a character's PersonaPlex session
 */
export function createCharacterSession(
  characterId: string,
  character: CharacterProfile,
  worldContext: string,
  serverUrl: string = 'wss://localhost:8998'
): PersonaPlexConfig {
  const voiceConfig = CHARACTER_VOICES[characterId]
  
  if (!voiceConfig) {
    throw new Error(`No voice configuration for character: ${characterId}`)
  }

  return {
    serverUrl,
    voicePrompt: voiceConfig.voiceId,
    textPrompt: buildPersonaPrompt(character, worldContext),
    seed: hashString(characterId), // Consistent seed for reproducibility
  }
}

/**
 * Simple hash for consistent seeding
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * WebSocket message types for PersonaPlex communication
 */
export interface PersonaPlexMessage {
  type: 'audio' | 'text' | 'config' | 'status'
  data: unknown
}

/**
 * Audio chunk from PersonaPlex (Opus encoded)
 */
export interface AudioChunk {
  timestamp: number
  samples: Float32Array
  sampleRate: number
}

/**
 * Transcript of what was said
 */
export interface TranscriptSegment {
  speaker: 'user' | 'agent'
  text: string
  startTime: number
  endTime: number
}
