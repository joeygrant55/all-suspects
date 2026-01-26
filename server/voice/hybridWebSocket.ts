/**
 * Hybrid Voice WebSocket Handler
 * 
 * Orchestrates the full voice pipeline:
 * 1. Player audio → PersonaPlex STT → text
 * 2. Text → Claude Agent (memory, tools, lies) → response
 * 3. Response → PersonaPlex TTS → audio back to player
 * 
 * All while preserving the full Agent SDK experience.
 */

import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS, WORLD_STATE } from '../../mysteries/ashford-affair/characters'
import { HybridVoiceManager, createVoiceMessage, HybridVoiceMessage } from './hybridVoice'
import { CHARACTER_VOICES } from './personaplex'
import {
  recordConfrontation,
  getPressurePromptModifier,
  getPressureState,
} from '../pressureSystem'
import {
  addStatement,
  checkForContradictions,
} from '../contradictionDetector'

// PersonaPlex server for STT/TTS
const PERSONAPLEX_URL = process.env.PERSONAPLEX_URL || 'wss://localhost:8998'

interface ClientSession {
  ws: WebSocket
  sessionId: string
  characterId: string | null
  personaplexWs: WebSocket | null
  voiceManager: HybridVoiceManager
  isTranscribing: boolean
  pendingAudio: Buffer[]
}

const clients = new Map<string, ClientSession>()

/**
 * Setup hybrid voice WebSocket server
 */
export function setupHybridVoiceWebSocket(
  wss: WebSocketServer,
  anthropic: Anthropic
): void {
  // Create shared voice manager
  const voiceManager = new HybridVoiceManager(anthropic, {
    personaplexUrl: PERSONAPLEX_URL,
    mode: 'personaplex',
  })

  // Listen for voice manager events
  voiceManager.on('processing:start', ({ sessionId, input }) => {
    const client = clients.get(sessionId)
    if (client) {
      sendToClient(client.ws, 'transcript', sessionId, {
        speaker: 'player',
        text: input,
        timestamp: Date.now(),
      })
    }
  })

  voiceManager.on('processing:complete', ({ sessionId, response, toolsUsed }) => {
    const client = clients.get(sessionId)
    if (client) {
      // Send tools used (for UI display)
      if (toolsUsed.length > 0) {
        sendToClient(client.ws, 'tools', sessionId, { tools: toolsUsed })
      }
    }
  })

  // Handle new connections
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = generateSessionId()
    console.log(`[HybridVoice] New connection: ${sessionId}`)

    const session: ClientSession = {
      ws,
      sessionId,
      characterId: null,
      personaplexWs: null,
      voiceManager,
      isTranscribing: false,
      pendingAudio: [],
    }

    clients.set(sessionId, session)

    // Send session ID to client
    sendToClient(ws, 'session:start', sessionId, { sessionId })

    // Handle messages from client
    ws.on('message', async (data: Buffer | string) => {
      try {
        if (Buffer.isBuffer(data)) {
          // Binary data = audio input from player
          await handleAudioInput(session, data)
        } else {
          // JSON message
          const message = JSON.parse(data.toString()) as HybridVoiceMessage
          await handleClientMessage(session, message, anthropic)
        }
      } catch (error) {
        console.error(`[HybridVoice] Error handling message:`, error)
        sendToClient(ws, 'error', sessionId, {
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })

    ws.on('close', () => {
      console.log(`[HybridVoice] Connection closed: ${sessionId}`)
      cleanupSession(sessionId)
    })

    ws.on('error', (error) => {
      console.error(`[HybridVoice] WebSocket error: ${sessionId}`, error)
      cleanupSession(sessionId)
    })
  })
}

/**
 * Handle JSON messages from client
 */
async function handleClientMessage(
  session: ClientSession,
  message: HybridVoiceMessage,
  anthropic: Anthropic
): Promise<void> {
  const { type, data } = message

  switch (type) {
    case 'session:start': {
      // Client wants to start talking to a character
      const { characterId } = data as { characterId: string }
      await startCharacterSession(session, characterId)
      break
    }

    case 'session:end': {
      // Client ending the conversation
      await endCharacterSession(session)
      break
    }

    case 'text:input': {
      // Text input (fallback or typed)
      const { text } = data as { text: string }
      await processTextInput(session, text, anthropic)
      break
    }

    default:
      console.log(`[HybridVoice] Unknown message type: ${type}`)
  }
}

/**
 * Start a voice session with a character
 */
async function startCharacterSession(
  session: ClientSession,
  characterId: string
): Promise<void> {
  const character = CHARACTERS.find(c => c.id === characterId)
  if (!character) {
    sendToClient(session.ws, 'error', session.sessionId, {
      message: `Character not found: ${characterId}`,
    })
    return
  }

  session.characterId = characterId

  // Start voice manager session
  await session.voiceManager.startSession(session.sessionId, characterId, character)

  // Connect to PersonaPlex for this character's voice
  await connectToPersonaPlex(session, characterId)

  // Notify client
  sendToClient(session.ws, 'session:start', session.sessionId, {
    characterId,
    characterName: character.name,
    voice: CHARACTER_VOICES[characterId],
  })

  console.log(`[HybridVoice] Started session with ${character.name}`)
}

/**
 * Connect to PersonaPlex server for STT/TTS
 */
async function connectToPersonaPlex(
  session: ClientSession,
  characterId: string
): Promise<void> {
  const voiceConfig = CHARACTER_VOICES[characterId]
  if (!voiceConfig) return

  try {
    const personaplexWs = new WebSocket(PERSONAPLEX_URL)

    personaplexWs.on('open', () => {
      console.log(`[HybridVoice] Connected to PersonaPlex for ${characterId}`)
      
      // Configure PersonaPlex with character voice
      // Note: We're using PersonaPlex in "TTS mode" only - 
      // the persona prompt is minimal since Claude handles the thinking
      personaplexWs.send(JSON.stringify({
        type: 'config',
        mode: 'tts',  // Text-to-speech mode only
        voicePrompt: voiceConfig.voiceId,
        textPrompt: `You are ${characterId}, speak naturally with appropriate emotion.`,
      }))

      session.personaplexWs = personaplexWs

      // Process any pending audio
      if (session.pendingAudio.length > 0) {
        session.pendingAudio.forEach(chunk => personaplexWs.send(chunk))
        session.pendingAudio = []
      }
    })

    // Handle audio/transcript from PersonaPlex
    personaplexWs.on('message', (data: Buffer | string) => {
      if (Buffer.isBuffer(data)) {
        // Audio output - forward to client
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(data)
        }
      } else {
        // JSON message (transcript, status)
        try {
          const msg = JSON.parse(data.toString())
          handlePersonaplexMessage(session, msg)
        } catch (e) {
          console.error('[HybridVoice] Failed to parse PersonaPlex message')
        }
      }
    })

    personaplexWs.on('error', (error) => {
      console.error(`[HybridVoice] PersonaPlex error:`, error)
      sendToClient(session.ws, 'error', session.sessionId, {
        message: 'Voice server connection failed',
      })
    })

    personaplexWs.on('close', () => {
      console.log(`[HybridVoice] PersonaPlex disconnected`)
      session.personaplexWs = null
    })
  } catch (error) {
    console.error(`[HybridVoice] Failed to connect to PersonaPlex:`, error)
  }
}

/**
 * Handle messages from PersonaPlex
 */
function handlePersonaplexMessage(
  session: ClientSession,
  message: { type: string; [key: string]: unknown }
): void {
  switch (message.type) {
    case 'transcript': {
      // PersonaPlex transcribed player speech
      const text = message.text as string
      if (text && text.trim()) {
        // This is the key handoff: PersonaPlex STT → Claude Agent
        processTranscribedInput(session, text)
      }
      break
    }

    case 'speaking': {
      // PersonaPlex is speaking/not speaking
      sendToClient(session.ws, 'audio:output', session.sessionId, {
        speaking: message.active,
      })
      break
    }
  }
}

/**
 * Handle raw audio input from player
 */
async function handleAudioInput(
  session: ClientSession,
  audioChunk: Buffer
): Promise<void> {
  if (!session.characterId) {
    // No active character session, ignore audio
    return
  }

  // Forward audio to PersonaPlex for STT
  if (session.personaplexWs?.readyState === WebSocket.OPEN) {
    session.personaplexWs.send(audioChunk)
  } else {
    // Queue audio until PersonaPlex connects
    session.pendingAudio.push(audioChunk)
  }
}

/**
 * Process transcribed speech through Claude Agent
 * This is where the Agent SDK magic happens!
 */
async function processTranscribedInput(
  session: ClientSession,
  text: string
): Promise<void> {
  if (!session.characterId) return

  const character = CHARACTERS.find(c => c.id === session.characterId)
  if (!character) return

  // Track confrontation for pressure system
  recordConfrontation(session.characterId)

  // Get pressure state
  const pressureState = getPressureState(session.characterId)
  const pressureModifier = getPressurePromptModifier(pressureState.level, character.isGuilty)

  // Send transcript to client
  sendToClient(session.ws, 'transcript', session.sessionId, {
    speaker: 'player',
    text,
    timestamp: Date.now(),
  })

  try {
    // Process through Claude Agent with full SDK features
    const result = await session.voiceManager.processPlayerInput(
      session.sessionId,
      text,
      pressureModifier
    )

    // Track statement for contradiction detection
    addStatement(session.characterId, character.name, text, result.response)

    // Send response transcript to client
    sendToClient(session.ws, 'transcript', session.sessionId, {
      speaker: 'npc',
      text: result.response,
      timestamp: Date.now(),
    })

    // Send emotion for UI
    sendToClient(session.ws, 'emotion', session.sessionId, {
      emotion: result.emotion,
    })

    // Prepare text for speech
    const { speakableText, stageDirections } = session.voiceManager.prepareForSpeech(result.response)

    // Send stage directions to client (for visual display)
    if (stageDirections.length > 0) {
      sendToClient(session.ws, 'text:output', session.sessionId, {
        stageDirections,
      })
    }

    // Get voice parameters adjusted for emotion
    const voiceParams = session.voiceManager.getVoiceParams(session.characterId, result.emotion)

    // Send to PersonaPlex for TTS
    if (session.personaplexWs?.readyState === WebSocket.OPEN && speakableText) {
      session.personaplexWs.send(JSON.stringify({
        type: 'speak',
        text: speakableText,
        ...voiceParams,
      }))
    }
  } catch (error) {
    console.error(`[HybridVoice] Error processing input:`, error)
    sendToClient(session.ws, 'error', session.sessionId, {
      message: 'Failed to process your question',
    })
  }
}

/**
 * Process text input (typed, not spoken)
 */
async function processTextInput(
  session: ClientSession,
  text: string,
  anthropic: Anthropic
): Promise<void> {
  // Same flow as transcribed input
  await processTranscribedInput(session, text)
}

/**
 * End a character session
 */
async function endCharacterSession(session: ClientSession): Promise<void> {
  if (session.personaplexWs) {
    session.personaplexWs.close()
    session.personaplexWs = null
  }

  session.voiceManager.endSession(session.sessionId)
  session.characterId = null

  sendToClient(session.ws, 'session:end', session.sessionId, {})
}

/**
 * Cleanup session on disconnect
 */
function cleanupSession(sessionId: string): void {
  const session = clients.get(sessionId)
  if (session) {
    if (session.personaplexWs) {
      session.personaplexWs.close()
    }
    session.voiceManager.endSession(sessionId)
    clients.delete(sessionId)
  }
}

/**
 * Send message to client
 */
function sendToClient(
  ws: WebSocket,
  type: HybridVoiceMessage['type'],
  sessionId: string,
  data: unknown
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(createVoiceMessage(type, sessionId, data)))
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
