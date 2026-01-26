/**
 * Hybrid Voice System for All Suspects
 * 
 * Combines Claude Agent SDK intelligence with PersonaPlex voice I/O:
 * - PersonaPlex handles speech-to-text (player input)
 * - Claude Agent handles thinking, memory, tools, lies, pressure
 * - PersonaPlex handles text-to-speech (NPC output) with character voices
 * 
 * This preserves the full Agent SDK experience while adding natural voice.
 */

import { EventEmitter } from 'events'
import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile } from '../../src/agents/types'
import { processAgentMessage } from '../agents/characterAgent'
import { CHARACTER_VOICES, buildPersonaPrompt } from './personaplex'

// Voice synthesis modes
type VoiceSynthMode = 'personaplex' | 'elevenlabs' | 'hybrid'

interface HybridVoiceConfig {
  personaplexUrl: string
  elevenLabsKey?: string
  mode: VoiceSynthMode
}

interface VoiceSession {
  characterId: string
  character: CharacterProfile
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  isActive: boolean
}

/**
 * Hybrid Voice Manager
 * 
 * Orchestrates the voice pipeline:
 * 1. Receive audio from player
 * 2. Transcribe via PersonaPlex STT (or Whisper fallback)
 * 3. Process through Claude Agent (full SDK features)
 * 4. Synthesize response via PersonaPlex TTS (with character voice)
 */
export class HybridVoiceManager extends EventEmitter {
  private config: HybridVoiceConfig
  private anthropic: Anthropic
  private sessions: Map<string, VoiceSession> = new Map()
  private personaplexWs: WebSocket | null = null

  constructor(anthropic: Anthropic, config: HybridVoiceConfig) {
    super()
    this.anthropic = anthropic
    this.config = config
  }

  /**
   * Start a voice session with a character
   */
  async startSession(
    sessionId: string,
    characterId: string,
    character: CharacterProfile
  ): Promise<void> {
    const session: VoiceSession = {
      characterId,
      character,
      conversationHistory: [],
      isActive: true,
    }

    this.sessions.set(sessionId, session)

    // Connect to PersonaPlex for this session's voice
    await this.connectPersonaPlex(sessionId, characterId)

    this.emit('session:started', { sessionId, characterId })
  }

  /**
   * Connect to PersonaPlex server with character voice config
   */
  private async connectPersonaPlex(sessionId: string, characterId: string): Promise<void> {
    const voiceConfig = CHARACTER_VOICES[characterId]
    if (!voiceConfig) {
      throw new Error(`No voice config for character: ${characterId}`)
    }

    // PersonaPlex connection will be established by the WebSocket handler
    // This method prepares the configuration
    this.emit('personaplex:config', {
      sessionId,
      characterId,
      voiceId: voiceConfig.voiceId,
    })
  }

  /**
   * Process player speech input
   * 
   * Flow:
   * 1. Receive transcribed text from PersonaPlex STT
   * 2. Send to Claude Agent with full context
   * 3. Return response for TTS
   */
  async processPlayerInput(
    sessionId: string,
    transcribedText: string,
    pressureModifier: string = ''
  ): Promise<{
    response: string
    toolsUsed: string[]
    emotion: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`No active session: ${sessionId}`)
    }

    const { character, conversationHistory } = session

    // Emit that we're processing
    this.emit('processing:start', { sessionId, input: transcribedText })

    try {
      // Process through the full Claude Agent system
      // This uses ALL the Agent SDK features:
      // - Memory persistence
      // - Tool use (recall, check_notes, etc.)
      // - Cross-character awareness
      // - Consistent lie maintenance
      // - Pressure-based behavior changes
      const agentResponse = await processAgentMessage(
        this.anthropic,
        character,
        transcribedText,
        conversationHistory,
        pressureModifier
      )

      // Update conversation history
      conversationHistory.push({ role: 'user', content: transcribedText })
      conversationHistory.push({ role: 'assistant', content: agentResponse.message })

      // Keep history manageable
      if (conversationHistory.length > 40) {
        conversationHistory.splice(0, 2)
      }

      // Analyze response for emotional cues (affects voice delivery)
      const emotion = this.analyzeEmotion(agentResponse.message, character)

      this.emit('processing:complete', {
        sessionId,
        response: agentResponse.message,
        toolsUsed: agentResponse.toolsUsed,
      })

      return {
        response: agentResponse.message,
        toolsUsed: agentResponse.toolsUsed,
        emotion,
      }
    } catch (error) {
      this.emit('processing:error', { sessionId, error })
      throw error
    }
  }

  /**
   * Analyze response text for emotional delivery cues
   * PersonaPlex can adjust voice characteristics based on emotion
   */
  private analyzeEmotion(
    response: string,
    character: CharacterProfile
  ): string {
    const lower = response.toLowerCase()

    // Check for stage directions
    if (response.includes('*nervous*') || response.includes('*fidgets*')) {
      return 'nervous'
    }
    if (response.includes('*angry*') || response.includes('*snaps*')) {
      return 'angry'
    }
    if (response.includes('*crying*') || response.includes('*tears*')) {
      return 'sad'
    }
    if (response.includes('*laughs*') || response.includes('*chuckles*')) {
      return 'amused'
    }

    // Check for emotional keywords
    if (lower.includes('how dare') || lower.includes('outrageous')) {
      return 'indignant'
    }
    if (lower.includes('i didn\'t') || lower.includes('i swear')) {
      return 'defensive'
    }
    if (lower.includes('perhaps') || lower.includes('well, you see')) {
      return 'evasive'
    }

    // Character-specific defaults
    if (character.isGuilty) {
      return 'guarded'
    }

    return 'neutral'
  }

  /**
   * Prepare text for voice synthesis
   * Cleans up stage directions while preserving meaning
   */
  prepareForSpeech(text: string): {
    speakableText: string
    stageDirections: string[]
  } {
    const stageDirections: string[] = []

    // Extract stage directions like *sighs* or *looks away*
    const directionMatches = text.match(/\*[^*]+\*/g)
    if (directionMatches) {
      stageDirections.push(...directionMatches.map(d => d.replace(/\*/g, '')))
    }

    // Clean text for speech
    const speakableText = text
      .replace(/\*[^*]+\*/g, '') // Remove *actions*
      .replace(/\([^)]+\)/g, '') // Remove (parentheticals)
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()

    return { speakableText, stageDirections }
  }

  /**
   * Get voice synthesis parameters for PersonaPlex
   * Adjusts based on character and emotion
   */
  getVoiceParams(
    characterId: string,
    emotion: string
  ): {
    voiceId: string
    speed: number
    pitch: number
    emphasis: number
  } {
    const voiceConfig = CHARACTER_VOICES[characterId]
    const baseVoice = voiceConfig?.voiceId || 'NATM0'

    // Adjust parameters based on emotion
    const emotionParams: Record<string, { speed: number; pitch: number; emphasis: number }> = {
      neutral: { speed: 1.0, pitch: 1.0, emphasis: 0.5 },
      nervous: { speed: 1.15, pitch: 1.05, emphasis: 0.7 },
      angry: { speed: 1.1, pitch: 0.95, emphasis: 0.9 },
      sad: { speed: 0.9, pitch: 0.95, emphasis: 0.6 },
      amused: { speed: 1.05, pitch: 1.05, emphasis: 0.6 },
      indignant: { speed: 1.0, pitch: 1.0, emphasis: 0.85 },
      defensive: { speed: 1.1, pitch: 1.02, emphasis: 0.75 },
      evasive: { speed: 0.95, pitch: 1.0, emphasis: 0.4 },
      guarded: { speed: 0.95, pitch: 0.98, emphasis: 0.5 },
    }

    const params = emotionParams[emotion] || emotionParams.neutral

    return {
      voiceId: baseVoice,
      ...params,
    }
  }

  /**
   * End a voice session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      this.sessions.delete(sessionId)
      this.emit('session:ended', { sessionId })
    }
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.isActive)
      .map(([id]) => id)
  }
}

/**
 * Message types for hybrid voice WebSocket protocol
 */
export interface HybridVoiceMessage {
  type: 
    | 'session:start'      // Start voice session with character
    | 'session:end'        // End voice session
    | 'audio:input'        // Raw audio from player mic
    | 'text:input'         // Transcribed text (from PersonaPlex STT)
    | 'text:output'        // Claude response text
    | 'audio:output'       // Synthesized audio (from PersonaPlex TTS)
    | 'transcript'         // Running transcript update
    | 'emotion'            // Detected emotion for UI
    | 'tools'              // Tools used by Claude agent
    | 'error'              // Error message
  sessionId: string
  data: unknown
}

/**
 * Create standard response message
 */
export function createVoiceMessage(
  type: HybridVoiceMessage['type'],
  sessionId: string,
  data: unknown
): HybridVoiceMessage {
  return { type, sessionId, data }
}
