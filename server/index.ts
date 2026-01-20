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
  recordEvidencePresented as recordPressureEvidence,
  getPressurePromptModifier,
  getPressureState,
  clearPressure,
  getAllPressureStates,
} from './pressureSystem'
import {
  processAgentMessage,
  showEvidenceToCharacter,
  buildEnhancedSystemPrompt,
} from './agents/characterAgent'
import {
  clearAllMemories,
  clearCharacterMemories,
  exportAllMemories,
  getMemorySummary,
} from './agents/memoryStore'
import {
  clearCrossReferences,
  recordAccusation,
  getAllGossipFor,
} from './agents/crossReference'
import {
  generateVideo,
  generateImage,
  getGenerationStatus,
  isVeoConfigured,
} from './video/veoClient'
import {
  analyzeTestimony,
  buildVideoPrompt,
  buildIntroductionPrompt,
} from './video/promptBuilder'
import {
  getCachedVideo,
  cacheVideo,
  generateCacheKey,
  getCacheStats,
  clearVideoCache,
  startCacheCleanup,
} from './video/videoCache'

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

// Chat endpoint - Enhanced with Agent SDK features
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message, evidenceId } = req.body

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

    // Track pressure from this confrontation
    recordConfrontation(characterId)

    // If evidence was presented, track it
    if (evidenceId) {
      showEvidenceToCharacter(characterId, evidenceId, message)
      recordPressureEvidence(characterId, evidenceId)
    }

    // Check for accusations in the message
    const messageLower = message.toLowerCase()
    if (messageLower.includes('you killed') || messageLower.includes('you murdered') ||
        messageLower.includes('you\'re the killer') || messageLower.includes('you are guilty')) {
      recordAccusation(characterId, message)
    }

    // Get current pressure state
    const pressureState = getPressureState(characterId)
    const pressureModifier = getPressurePromptModifier(pressureState.level, character.isGuilty)

    // Use the enhanced agent system with tool use
    const agentResponse = await processAgentMessage(
      anthropic,
      character,
      message,
      history,
      pressureModifier
    )

    // Add messages to history
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: agentResponse.message })

    // Keep history manageable (last 20 exchanges)
    if (history.length > 40) {
      history.splice(0, 2)
    }

    // Track this statement for contradiction detection
    const statement = addStatement(characterId, character.name, message, agentResponse.message)

    // Check for contradictions with other characters' statements
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
      message: agentResponse.message,
      characterName: character.name,
      statementId: statement.id,
      contradictions: newContradictions,
      toolsUsed: agentResponse.toolsUsed, // New: show what tools the agent used
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
    clearCharacterMemories(characterId)
  } else {
    conversationHistory.clear()
    clearStatements() // Also clear statement tracking
    clearPressure() // Also clear pressure tracking
    clearAllMemories() // Clear agent memories
    clearCrossReferences() // Clear gossip network
  }
  res.json({ success: true })
})

// Get character memories (for debugging)
app.get('/api/memories/:characterId', (req, res) => {
  const { characterId } = req.params
  const summary = getMemorySummary(characterId)
  const gossip = getAllGossipFor(characterId)
  res.json({
    characterId,
    memorySummary: summary,
    gossip,
  })
})

// Get all memories (for debugging)
app.get('/api/memories', (_req, res) => {
  const allMemories = exportAllMemories()
  res.json({ memories: allMemories })
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

// ============================================================
// COMBINED CHAT + VIDEO ENDPOINT (Video-First Interrogation)
// ============================================================

/**
 * Combined chat endpoint that returns:
 * - Character response (from Claude agent)
 * - Voice audio (from ElevenLabs) - fast, ~1-3 seconds
 * - Video generation ID (from Veo) - background generation
 * - Scene analysis for subtitles/metadata
 */
app.post('/api/chat-video', async (req, res) => {
  try {
    const { characterId, message, evidenceId } = req.body

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

    // Track pressure from this confrontation
    recordConfrontation(characterId)

    // If evidence was presented, track it
    if (evidenceId) {
      showEvidenceToCharacter(characterId, evidenceId, message)
      recordPressureEvidence(characterId, evidenceId)
    }

    // Check for accusations in the message
    const messageLower = message.toLowerCase()
    if (messageLower.includes('you killed') || messageLower.includes('you murdered') ||
        messageLower.includes('you\'re the killer') || messageLower.includes('you are guilty')) {
      recordAccusation(characterId, message)
    }

    // Get current pressure state
    const pressureState = getPressureState(characterId)
    const pressureModifier = getPressurePromptModifier(pressureState.level, character.isGuilty)

    // Use the enhanced agent system with tool use
    const agentResponse = await processAgentMessage(
      anthropic,
      character,
      message,
      history,
      pressureModifier
    )

    // Add messages to history
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: agentResponse.message })

    // Keep history manageable (last 20 exchanges)
    if (history.length > 40) {
      history.splice(0, 2)
    }

    // Track this statement for contradiction detection
    const statement = addStatement(characterId, character.name, message, agentResponse.message)

    // Check for contradictions with other characters' statements
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

    // === VOICE GENERATION (Fast - 1-3 seconds) ===
    let voiceAudioBase64: string | undefined
    const voiceConfig = CHARACTER_VOICES[characterId]

    if (ELEVENLABS_API_KEY && voiceConfig) {
      try {
        // Clean text for speech (remove stage directions like *sighs*)
        const cleanText = agentResponse.message
          .replace(/\*[^*]+\*/g, '')
          .replace(/\([^)]+\)/g, '')
          .trim()

        if (cleanText) {
          const voiceResponse = await fetch(
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

          if (voiceResponse.ok) {
            const audioBuffer = await voiceResponse.arrayBuffer()
            voiceAudioBase64 = Buffer.from(audioBuffer).toString('base64')
          }
        }
      } catch (voiceError) {
        console.error('Voice generation error:', voiceError)
        // Continue without voice - don't fail the request
      }
    }

    // === VIDEO GENERATION (Background - 15-30 seconds) ===
    let videoGenerationId: string | undefined
    let analysisResult: {
      location: string
      timeOfDay: string
      characters: string[]
      actions: string[]
      objects: string[]
      mood: string
      keyVisualElements: string[]
    } | undefined

    if (isVeoConfigured()) {
      try {
        // Analyze the testimony to extract visual elements
        analysisResult = await analyzeTestimony(
          anthropic,
          agentResponse.message,
          characterId,
          message
        )

        // Build the video prompt
        const videoPrompt = buildVideoPrompt(analysisResult, characterId)

        // Check cache first
        const cacheKey = generateCacheKey(characterId, videoPrompt.fullPrompt, 'testimony')
        const cached = getCachedVideo(cacheKey)

        if (cached && cached.videoUrl) {
          // Return cached video URL directly
          return res.json({
            message: agentResponse.message,
            characterName: character.name,
            statementId: statement.id,
            contradictions: newContradictions,
            toolsUsed: agentResponse.toolsUsed,
            pressure: {
              level: finalPressureState.level,
              confrontations: finalPressureState.confrontations,
              evidencePresented: finalPressureState.evidencePresented.length,
              contradictionsExposed: finalPressureState.contradictionsExposed,
            },
            voiceAudioBase64,
            videoUrl: cached.videoUrl,
            cached: true,
            analysis: analysisResult,
          })
        }

        // Start video generation in background
        const videoResult = await generateVideo({
          prompt: videoPrompt.fullPrompt,
          characterId,
          testimonyId: `testimony-${Date.now()}`,
          duration: videoPrompt.duration,
          aspectRatio: videoPrompt.aspectRatio,
        })

        if (videoResult.generationId) {
          videoGenerationId = videoResult.generationId
        }

        // If video completed immediately (unlikely but possible)
        if (videoResult.success && videoResult.videoUrl) {
          cacheVideo(cacheKey, {
            characterId,
            testimonyId: videoResult.testimonyId,
            videoUrl: videoResult.videoUrl,
            prompt: videoResult.prompt,
            createdAt: videoResult.generatedAt,
            type: 'testimony',
          })

          return res.json({
            message: agentResponse.message,
            characterName: character.name,
            statementId: statement.id,
            contradictions: newContradictions,
            toolsUsed: agentResponse.toolsUsed,
            pressure: {
              level: finalPressureState.level,
              confrontations: finalPressureState.confrontations,
              evidencePresented: finalPressureState.evidencePresented.length,
              contradictionsExposed: finalPressureState.contradictionsExposed,
            },
            voiceAudioBase64,
            videoUrl: videoResult.videoUrl,
            cached: false,
            analysis: analysisResult,
          })
        }
      } catch (videoError) {
        console.error('Video generation error:', videoError)
        // Continue without video - don't fail the request
      }
    }

    // Return response with voice (immediate) and video generation ID (for polling)
    res.json({
      message: agentResponse.message,
      characterName: character.name,
      statementId: statement.id,
      contradictions: newContradictions,
      toolsUsed: agentResponse.toolsUsed,
      pressure: {
        level: finalPressureState.level,
        confrontations: finalPressureState.confrontations,
        evidencePresented: finalPressureState.evidencePresented.length,
        contradictionsExposed: finalPressureState.contradictionsExposed,
      },
      voiceAudioBase64,
      videoGenerationId,
      analysis: analysisResult,
    })
  } catch (error) {
    console.error('Error in chat-video endpoint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to process request', details: errorMessage })
  }
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

// ============================================================
// VIDEO GENERATION ENDPOINTS (Veo 3 / Imagen)
// ============================================================

// Generate a video from character testimony
app.post('/api/video/testimony', async (req, res) => {
  try {
    const { characterId, testimony, question, testimonyId } = req.body

    if (!characterId || !testimony) {
      return res.status(400).json({ error: 'Missing characterId or testimony' })
    }

    // Check if Veo is configured
    if (!isVeoConfigured()) {
      return res.status(503).json({
        error: 'Video service not configured',
        message: 'Gemini API key not set. Add GEMINI_API_KEY to your .env file.',
      })
    }

    // Analyze the testimony to extract visual elements
    const analysis = await analyzeTestimony(
      anthropic,
      testimony,
      characterId,
      question || 'What did you see?'
    )

    // Build the video prompt
    const videoPrompt = buildVideoPrompt(analysis, characterId)

    // Check cache first
    const cacheKey = generateCacheKey(characterId, videoPrompt.fullPrompt, 'testimony')
    const cached = getCachedVideo(cacheKey)

    if (cached) {
      return res.json({
        success: true,
        cached: true,
        videoUrl: cached.videoUrl,
        videoData: cached.videoData,
        prompt: cached.prompt,
        analysis,
      })
    }

    // Generate the video
    const result = await generateVideo({
      prompt: videoPrompt.fullPrompt,
      characterId,
      testimonyId: testimonyId || `testimony-${Date.now()}`,
      duration: videoPrompt.duration,
      aspectRatio: videoPrompt.aspectRatio,
    })

    if (result.success && result.videoUrl) {
      // Cache the result
      cacheVideo(cacheKey, {
        characterId,
        testimonyId: result.testimonyId,
        videoUrl: result.videoUrl,
        prompt: result.prompt,
        createdAt: result.generatedAt,
        type: 'testimony',
      })
    }

    res.json({
      success: result.success,
      cached: false,
      videoUrl: result.videoUrl,
      videoData: result.videoData,
      error: result.error,
      generationId: result.generationId,
      prompt: result.prompt,
      analysis,
    })
  } catch (error) {
    console.error('Error generating testimony video:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate video', details: errorMessage })
  }
})

// Generate a character introduction video
app.post('/api/video/introduction', async (req, res) => {
  try {
    const { characterId } = req.body

    if (!characterId) {
      return res.status(400).json({ error: 'Missing characterId' })
    }

    // Check if Veo is configured
    if (!isVeoConfigured()) {
      return res.status(503).json({
        error: 'Video service not configured',
        message: 'Gemini API key not set.',
      })
    }

    // Build introduction prompt
    const videoPrompt = buildIntroductionPrompt(characterId)

    // Check cache
    const cacheKey = generateCacheKey(characterId, videoPrompt.fullPrompt, 'introduction')
    const cached = getCachedVideo(cacheKey)

    if (cached) {
      return res.json({
        success: true,
        cached: true,
        videoUrl: cached.videoUrl,
        prompt: cached.prompt,
      })
    }

    // Generate the video
    const result = await generateVideo({
      prompt: videoPrompt.fullPrompt,
      characterId,
      testimonyId: `intro-${characterId}`,
      duration: videoPrompt.duration,
      aspectRatio: videoPrompt.aspectRatio,
    })

    if (result.success && result.videoUrl) {
      cacheVideo(cacheKey, {
        characterId,
        testimonyId: `intro-${characterId}`,
        videoUrl: result.videoUrl,
        prompt: result.prompt,
        createdAt: result.generatedAt,
        type: 'introduction',
      })
    }

    res.json({
      success: result.success,
      cached: false,
      videoUrl: result.videoUrl,
      error: result.error,
      generationId: result.generationId,
      prompt: result.prompt,
    })
  } catch (error) {
    console.error('Error generating introduction video:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate video', details: errorMessage })
  }
})

// Generate an image fallback (faster than video)
app.post('/api/video/image', async (req, res) => {
  try {
    const { characterId, testimony, question } = req.body

    if (!characterId || !testimony) {
      return res.status(400).json({ error: 'Missing characterId or testimony' })
    }

    if (!isVeoConfigured()) {
      return res.status(503).json({
        error: 'Image service not configured',
        message: 'Gemini API key not set.',
      })
    }

    // Analyze testimony
    const analysis = await analyzeTestimony(anthropic, testimony, characterId, question || '')
    const videoPrompt = buildVideoPrompt(analysis, characterId)

    // Generate image instead of video
    const result = await generateImage(videoPrompt.fullPrompt, characterId)

    res.json({
      success: result.success,
      imageUrl: result.imageUrl,
      error: result.error,
      prompt: videoPrompt.fullPrompt,
      analysis,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate image', details: errorMessage })
  }
})

// Check video generation status
app.get('/api/video/status/:generationId', (req, res) => {
  const { generationId } = req.params
  const status = getGenerationStatus(generationId)

  if (!status) {
    return res.status(404).json({ error: 'Generation not found' })
  }

  res.json(status)
})

// Get video cache stats
app.get('/api/video/cache', (_req, res) => {
  const stats = getCacheStats()
  res.json({
    configured: isVeoConfigured(),
    cache: stats,
  })
})

// Clear video cache
app.post('/api/video/cache/clear', (_req, res) => {
  clearVideoCache()
  res.json({ success: true })
})

const PORT = process.env.PORT || 3001

// Start cache cleanup interval
startCacheCleanup()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Available endpoints:')
  console.log('  POST /api/chat - Chat with a character')
  console.log('  GET /api/characters - List all characters')
  console.log('  POST /api/reset - Reset conversation history')
})
