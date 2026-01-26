/**
 * Voice API Routes for PersonaPlex integration
 * 
 * Handles WebSocket connections for real-time voice chat with characters.
 * Proxies between frontend and PersonaPlex server with character context injection.
 */

import { Router, Request, Response } from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import { CHARACTERS, WORLD_STATE } from '../../mysteries/ashford-affair/characters'
import { 
  CHARACTER_VOICES, 
  buildPersonaPrompt, 
  createCharacterSession,
  PersonaPlexConfig 
} from './personaplex'

const router = Router()

// PersonaPlex server URL (local or remote)
const PERSONAPLEX_URL = process.env.PERSONAPLEX_URL || 'wss://localhost:8998'

// Track active sessions
const activeSessions = new Map<string, {
  characterId: string
  personaplexWs: WebSocket | null
  clientWs: WebSocket
}>()

/**
 * GET /api/voice/characters
 * List characters with their voice configurations
 */
router.get('/characters', (_req: Request, res: Response) => {
  const characters = CHARACTERS.map(char => ({
    id: char.id,
    name: char.name,
    role: char.role,
    voice: CHARACTER_VOICES[char.id],
  }))
  res.json({ characters })
})

/**
 * GET /api/voice/status
 * Check PersonaPlex server status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // Try to connect briefly to check if server is up
    const ws = new WebSocket(PERSONAPLEX_URL)
    
    const timeout = setTimeout(() => {
      ws.close()
      res.json({ 
        status: 'unavailable', 
        url: PERSONAPLEX_URL,
        message: 'Connection timeout' 
      })
    }, 5000)

    ws.on('open', () => {
      clearTimeout(timeout)
      ws.close()
      res.json({ 
        status: 'available', 
        url: PERSONAPLEX_URL 
      })
    })

    ws.on('error', () => {
      clearTimeout(timeout)
      res.json({ 
        status: 'unavailable', 
        url: PERSONAPLEX_URL,
        message: 'Connection failed' 
      })
    })
  } catch (error) {
    res.json({ 
      status: 'error', 
      url: PERSONAPLEX_URL,
      message: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

/**
 * GET /api/voice/config/:characterId
 * Get PersonaPlex configuration for a character (for debugging/preview)
 */
router.get('/config/:characterId', (req: Request, res: Response) => {
  const { characterId } = req.params
  const character = CHARACTERS.find(c => c.id === characterId)
  
  if (!character) {
    res.status(404).json({ error: `Character not found: ${characterId}` })
    return
  }

  const worldContext = [
    `Time of death: ${WORLD_STATE.timeOfDeath}`,
    `Victim: ${WORLD_STATE.victim}`,
    `Location: ${WORLD_STATE.location}`,
    `Weather: ${WORLD_STATE.weather}`,
    'Public knowledge:',
    ...WORLD_STATE.publicKnowledge.map(k => `- ${k}`),
  ].join('\n')

  const config = createCharacterSession(characterId, character, worldContext, PERSONAPLEX_URL)
  
  res.json({
    characterId,
    name: character.name,
    voice: CHARACTER_VOICES[characterId],
    personaPrompt: config.textPrompt,
    // Don't expose secrets in response
    secretCount: character.privateSecrets.length,
  })
})

/**
 * Initialize WebSocket server for voice chat
 * Called from main server setup
 */
export function setupVoiceWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (clientWs: WebSocket, req) => {
    const sessionId = generateSessionId()
    console.log(`[Voice] New connection: ${sessionId}`)

    // Wait for client to send character configuration
    clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        
        if (message.type === 'config') {
          handleCharacterConfig(sessionId, clientWs, message.characterId)
        } else if (message.type === 'text') {
          // Text input - convert to audio or pass through
          forwardTextToPersonaPlex(sessionId, message.content)
        } else {
          // Binary audio data - forward to PersonaPlex
          const session = activeSessions.get(sessionId)
          if (session?.personaplexWs?.readyState === WebSocket.OPEN) {
            session.personaplexWs.send(data)
          }
        }
      } catch (error) {
        // Binary data - forward directly
        const session = activeSessions.get(sessionId)
        if (session?.personaplexWs?.readyState === WebSocket.OPEN) {
          session.personaplexWs.send(data)
        }
      }
    })

    clientWs.on('close', () => {
      console.log(`[Voice] Connection closed: ${sessionId}`)
      cleanupSession(sessionId)
    })

    clientWs.on('error', (error) => {
      console.error(`[Voice] WebSocket error: ${sessionId}`, error)
      cleanupSession(sessionId)
    })
  })
}

/**
 * Handle character configuration from client
 */
function handleCharacterConfig(sessionId: string, clientWs: WebSocket, characterId: string): void {
  const character = CHARACTERS.find(c => c.id === characterId)
  
  if (!character) {
    clientWs.send(JSON.stringify({
      type: 'error',
      message: `Character not found: ${characterId}`,
    }))
    return
  }

  // Build world context
  const worldContext = [
    `Time of death: ${WORLD_STATE.timeOfDeath}`,
    `Victim: ${WORLD_STATE.victim}`,
    `Location: ${WORLD_STATE.location}`,
    `Weather: ${WORLD_STATE.weather}`,
    'Public knowledge:',
    ...WORLD_STATE.publicKnowledge.map(k => `- ${k}`),
  ].join('\n')

  // Create PersonaPlex config
  const config = createCharacterSession(characterId, character, worldContext, PERSONAPLEX_URL)

  // Connect to PersonaPlex server
  connectToPersonaPlex(sessionId, clientWs, characterId, config)
}

/**
 * Connect to PersonaPlex server for a character
 */
function connectToPersonaPlex(
  sessionId: string, 
  clientWs: WebSocket, 
  characterId: string,
  config: PersonaPlexConfig
): void {
  console.log(`[Voice] Connecting to PersonaPlex for ${characterId}`)

  const personaplexWs = new WebSocket(config.serverUrl)

  personaplexWs.on('open', () => {
    console.log(`[Voice] Connected to PersonaPlex for ${characterId}`)
    
    // Send configuration
    personaplexWs.send(JSON.stringify({
      type: 'config',
      voicePrompt: config.voicePrompt,
      textPrompt: config.textPrompt,
      seed: config.seed,
    }))

    // Store session
    activeSessions.set(sessionId, {
      characterId,
      personaplexWs,
      clientWs,
    })

    // Notify client
    clientWs.send(JSON.stringify({
      type: 'status',
      status: 'connected',
      characterId,
    }))
  })

  personaplexWs.on('message', (data) => {
    // Forward PersonaPlex responses to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)
    }
  })

  personaplexWs.on('error', (error) => {
    console.error(`[Voice] PersonaPlex error for ${characterId}:`, error)
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Voice server connection failed',
    }))
  })

  personaplexWs.on('close', () => {
    console.log(`[Voice] PersonaPlex disconnected for ${characterId}`)
  })
}

/**
 * Forward text input to PersonaPlex
 */
function forwardTextToPersonaPlex(sessionId: string, text: string): void {
  const session = activeSessions.get(sessionId)
  if (session?.personaplexWs?.readyState === WebSocket.OPEN) {
    session.personaplexWs.send(JSON.stringify({
      type: 'text',
      content: text,
    }))
  }
}

/**
 * Cleanup session on disconnect
 */
function cleanupSession(sessionId: string): void {
  const session = activeSessions.get(sessionId)
  if (session) {
    session.personaplexWs?.close()
    activeSessions.delete(sessionId)
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default router
