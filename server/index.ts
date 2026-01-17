import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS, WORLD_STATE } from '../mysteries/ashford-affair/characters'
import {
  addStatement,
  checkForContradictions,
  getDetectedContradictions,
  getAllStatements,
  clearStatements,
  type DetectedContradiction,
} from './contradictionDetector'
import {
  recordConfrontation,
  recordContradiction,
  getPressurePromptModifier,
  getPressureState,
  clearPressure,
  getAllPressureStates,
} from './pressureSystem'

const app = express()
app.use(cors())
app.use(express.json())

// Initialize Anthropic client
const anthropic = new Anthropic()

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

// Voice IDs for each character (ElevenLabs pre-made voices)
// These can be customized with your own cloned voices
const CHARACTER_VOICES: Record<string, { voiceId: string; name: string }> = {
  victoria: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel' },      // British, mature female
  thomas: { voiceId: 'VR6AewLTigWG4xSOukaG', name: 'Josh' },          // American, young male
  eleanor: { voiceId: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },         // American, professional female
  marcus: { voiceId: 'onwK4e9ZLuTAKqWW03F9', name: 'Antoni' },        // British, older male
  lillian: { voiceId: 'XB0fDUnXU5powFXDhCwa', name: 'Domi' },         // American, mature female
  james: { voiceId: 'N2lVS1w4EtoT3dr4eOWO', name: 'Daniel' },         // British, butler-like male
}

// Voice settings for 1920s noir atmosphere
const VOICE_SETTINGS = {
  stability: 0.5,           // Moderate stability for natural variation
  similarity_boost: 0.75,   // Strong character consistency
  style: 0.3,               // Subtle stylization
  use_speaker_boost: true,
}

// In-memory conversation history per character
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map()

// Build system prompt for a character
function buildSystemPrompt(characterId: string, pressureModifier: string = ''): string {
  const character = CHARACTERS.find((c) => c.id === characterId)
  if (!character) {
    throw new Error(`Character not found: ${characterId}`)
  }

  return `You are ${character.name}, ${character.role.toLowerCase()}, in a 1920s murder mystery game called "All Suspects".
${pressureModifier}

SETTING:
${WORLD_STATE.publicKnowledge.map((fact) => `- ${fact}`).join('\n')}

YOUR CHARACTER:
- Name: ${character.name}
- Role: ${character.role}
- Personality: ${character.personality}
- Speech pattern: ${character.speechPattern}

YOUR SECRETS (only you know these - never reveal directly, but they influence your behavior):
${character.privateSecrets.map((secret) => `- ${secret}`).join('\n')}

YOUR ALIBI:
${character.alibi}

YOUR RELATIONSHIPS:
${Object.entries(character.relationships)
  .map(([name, feeling]) => `- ${name}: ${feeling}`)
  .join('\n')}

${character.isGuilty ? `SECRET: You are the killer. You murdered Edmund Ashford. You must lie and deflect to avoid suspicion, but you might slip up under pressure.` : `SECRET: You are innocent of the murder, but you have your own secrets to protect.`}

RULES:
1. Stay in character at all times. Speak as ${character.name} would speak in the 1920s.
2. Be evasive about your secrets but don't be unrealistically suspicious.
3. You can lie, deflect, or refuse to answer, but be consistent with previous statements.
4. Show emotions appropriate to being questioned about a murder.
5. If asked about your alibi, provide it but you may be nervous or defensive.
6. Reference other characters and their relationships naturally.
7. Keep responses concise - 1-3 sentences typically, unless the question warrants more.
8. Use period-appropriate language and mannerisms.
9. If you are lying, your response should subtly hint at nervousness or inconsistency.

Remember: The player is a detective investigating Edmund Ashford's murder. They will try to catch you in lies or contradictions.`
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message } = req.body

    if (!characterId || !message) {
      return res.status(400).json({ error: 'Missing characterId or message' })
    }

    const character = CHARACTERS.find((c) => c.id === characterId)
    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }

    // Get or create conversation history for this character
    if (!conversationHistory.has(characterId)) {
      conversationHistory.set(characterId, [])
    }
    const history = conversationHistory.get(characterId)!

    // Add user message to history
    history.push({ role: 'user', content: message })

    // Track pressure from this confrontation
    recordConfrontation(characterId)

    // Get current pressure state
    const pressureState = getPressureState(characterId)
    const pressureModifier = getPressurePromptModifier(pressureState.level, character.isGuilty)

    // Build system prompt with pressure modifier
    const systemPrompt = buildSystemPrompt(characterId, pressureModifier)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: history,
    })

    // Extract response text
    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage })

    // Keep history manageable (last 20 exchanges)
    if (history.length > 40) {
      history.splice(0, 2)
    }

    // Track this statement for contradiction detection
    const statement = addStatement(characterId, character.name, message, assistantMessage)

    // Check for contradictions with other characters' statements (async, don't block response)
    let newContradictions: DetectedContradiction[] = []
    try {
      newContradictions = await checkForContradictions(anthropic, statement)

      // Track contradictions for pressure system
      newContradictions.forEach((contradiction) => {
        recordContradiction(contradiction.statement1.characterId)
        recordContradiction(contradiction.statement2.characterId)
      })
    } catch (contradictionError) {
      console.error('Error checking contradictions:', contradictionError)
    }

    // Get updated pressure state after all tracking
    const finalPressureState = getPressureState(characterId)

    res.json({
      message: assistantMessage,
      characterName: character.name,
      statementId: statement.id,
      contradictions: newContradictions,
      pressure: {
        level: finalPressureState.level,
        confrontations: finalPressureState.confrontations,
        evidencePresented: finalPressureState.evidencePresented.length,
        contradictionsExposed: finalPressureState.contradictionsExposed,
      },
    })
  } catch (error) {
    console.error('Error generating response:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate response', details: errorMessage })
  }
})

// Get all characters endpoint
app.get('/api/characters', (_req, res) => {
  const publicCharacters = CHARACTERS.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
  }))
  res.json(publicCharacters)
})

// Reset conversation history
app.post('/api/reset', (req, res) => {
  const { characterId } = req.body
  if (characterId) {
    conversationHistory.delete(characterId)
    clearPressure(characterId)
  } else {
    conversationHistory.clear()
    clearStatements() // Also clear statement tracking
    clearPressure() // Also clear pressure tracking
  }
  res.json({ success: true })
})

// Get pressure states for all characters
app.get('/api/pressure', (_req, res) => {
  const pressureStates = getAllPressureStates()
  res.json({ pressure: pressureStates })
})

// Get all detected contradictions
app.get('/api/contradictions', (_req, res) => {
  const contradictions = getDetectedContradictions()
  res.json({ contradictions })
})

// Get all tracked statements
app.get('/api/statements', (_req, res) => {
  const statements = getAllStatements()
  res.json({ statements })
})

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'All Suspects API',
    version: '1.1.0',
    endpoints: {
      'GET /': 'This info',
      'GET /api/health': 'Health check',
      'GET /api/characters': 'List all characters',
      'POST /api/chat': 'Chat with a character (body: {characterId, message})',
      'POST /api/reset': 'Reset conversation history and statements',
      'GET /api/contradictions': 'Get all detected contradictions',
      'GET /api/statements': 'Get all tracked character statements',
    },
  })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Text-to-speech endpoint using ElevenLabs
app.post('/api/voice', async (req, res) => {
  try {
    const { characterId, text } = req.body

    if (!characterId || !text) {
      return res.status(400).json({ error: 'Missing characterId or text' })
    }

    // Check if ElevenLabs API key is configured
    if (!ELEVENLABS_API_KEY) {
      return res.status(503).json({
        error: 'Voice service not configured',
        message: 'ElevenLabs API key not set. Add ELEVENLABS_API_KEY to your .env file.',
      })
    }

    const voiceConfig = CHARACTER_VOICES[characterId]
    if (!voiceConfig) {
      return res.status(404).json({ error: 'Voice not found for character' })
    }

    // Clean text for speech (remove stage directions like *sighs*)
    const cleanText = text
      .replace(/\*[^*]+\*/g, '') // Remove *action* markers
      .replace(/\([^)]+\)/g, '') // Remove (parentheticals)
      .trim()

    if (!cleanText) {
      return res.status(400).json({ error: 'No speakable text after cleaning' })
    }

    // Call ElevenLabs API
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceConfig.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: VOICE_SETTINGS,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', errorText)
      return res.status(response.status).json({
        error: 'Voice synthesis failed',
        details: errorText,
      })
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer()

    // Return audio as base64 for easy frontend playback
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    res.json({
      audio: base64Audio,
      format: 'mp3',
      characterId,
      voiceName: voiceConfig.name,
    })
  } catch (error) {
    console.error('Error generating voice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate voice', details: errorMessage })
  }
})

// Get available voices
app.get('/api/voices', (_req, res) => {
  const voices = Object.entries(CHARACTER_VOICES).map(([characterId, config]) => ({
    characterId,
    voiceName: config.name,
  }))
  res.json({
    available: !!ELEVENLABS_API_KEY,
    voices,
  })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Available endpoints:')
  console.log('  POST /api/chat - Chat with a character')
  console.log('  GET /api/characters - List all characters')
  console.log('  POST /api/reset - Reset conversation history')
})
