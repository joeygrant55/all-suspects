import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS, WORLD_STATE } from '../mysteries/ashford-affair/characters'
import { EVIDENCE_DATABASE } from '../src/data/evidence'
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
  pregenerateIntroductions,
  findPregenVideo,
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
import { getWatson, resetWatson } from './watson/watsonAgent'
import {
  generateMystery,
  getCurrentMystery,
  getMysteryById,
  saveMystery,
  clearCurrentMystery,
  exportMystery,
  importMystery,
} from './mystery'
import portraitRoutes from './video/portraitRoutes'
import atmosphereRoutes from './video/atmosphereRoutes'
import { analyzeEmotionalState, type StructuredCharacterResponse } from './agents/emotionalOutput'
import {
  initializeCharacterLocations,
  getCharactersInRoom,
  getRoomPresence,
  getOverheardSnippet,
  getAllBackgroundConversations,
  getManorActivitySummary,
  generateBackgroundConversation,
  clearBackgroundSimulation,
} from './agents/backgroundSimulation'

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

// Helper: Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error instanceof Error ? error.message : 'Unknown error')
      
      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`[RETRY] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // All retries failed
  throw lastError
}

// Chat endpoint - Enhanced with Agent SDK features + Retry Logic + Interrogation Tactics
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now()
  
  try {
    const { characterId, message, evidenceId, tactic, crossReferenceStatement } = req.body

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

    // Detect if this is the first question to this character
    const isFirstQuestion = history.length === 0
    
    if (isFirstQuestion) {
      console.log(`[FIRST QUESTION] Character: ${characterId} - Using extended timeout and retry logic`)
    }

    // Track pressure from this confrontation with tactic-specific bonuses
    let tacticPressureBonus = 0
    
    // Apply tactic-specific pressure bonuses
    switch (tactic) {
      case 'alibi':
        tacticPressureBonus = 5
        break
      case 'present_evidence':
        tacticPressureBonus = 15
        break
      case 'cross_reference':
        tacticPressureBonus = 20
        break
      case 'bluff':
        // Bluff is risky - will be evaluated later based on how close to truth
        tacticPressureBonus = 0 // Will be adjusted after AI response
        break
    }
    
    recordConfrontation(characterId, message, tacticPressureBonus)

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
    let pressureModifier = getPressurePromptModifier(pressureState.level, character.isGuilty)
    
    // Build tactic-specific prompt modifiers
    let tacticPrompt = ''
    if (tactic === 'alibi') {
      tacticPrompt = `\n\nDETECTIVE TACTIC: The detective is asking for detailed alibi information. Provide specific timeline details, locations, and who you were with. If you're guilty, you must construct a believable lie with specific details. If innocent but hiding something, be defensive but truthful about your location.`
    } else if (tactic === 'present_evidence') {
      const evidenceData = EVIDENCE_DATABASE[evidenceId]
      tacticPrompt = `\n\nDETECTIVE TACTIC: The detective is showing you physical evidence: "${evidenceData?.name || 'evidence'}". React to seeing this evidence. If it implicates you, show fear/defensiveness. If it's irrelevant to you, show confusion or offer explanations. The detective is watching your reaction closely.`
    } else if (tactic === 'cross_reference') {
      const otherCharName = characters.find(c => c.id === crossReferenceStatement?.characterId)?.name || 'another suspect'
      tacticPrompt = `\n\nDETECTIVE TACTIC: The detective is confronting you with what ${otherCharName} said: "${crossReferenceStatement?.content}". This directly contradicts or challenges your story. You must either explain the discrepancy, admit to lying, or accuse the other person of lying. This is HIGH PRESSURE.`
    } else if (tactic === 'bluff') {
      tacticPrompt = `\n\nDETECTIVE TACTIC: The detective is BLUFFING - claiming to have evidence or knowledge they may not actually possess. If their bluff is close to the truth (something you actually did), you should show panic or slip up. If their bluff is completely wrong, you might become confident and call them out on it, or be confused. Evaluate how close their bluff is to reality.`
    }
    
    pressureModifier = pressureModifier + tacticPrompt

    // Use retry logic with exponential backoff (up to 2 retries)
    let agentResponse
    let isFallback = false
    
    try {
      agentResponse = await withRetry(
        async () => {
          return await processAgentMessage(
            anthropic,
            character,
            message,
            history,
            pressureModifier
          )
        },
        2, // Max 2 retries (3 total attempts)
        isFirstQuestion ? 2000 : 1000 // Longer delay for first question
      )
    } catch (apiError) {
      // All retries failed - use fallback response
      console.error('[API FAILURE] All retries exhausted, using fallback:', apiError)
      isFallback = true
      agentResponse = {
        message: `*${character.name} pauses, seemingly lost in thought*\n\nI... I need a moment to collect my thoughts. Perhaps you could ask me that again?`,
        toolsUsed: []
      }
    }

    // Add messages to history (only if not a fallback)
    if (!isFallback) {
      history.push({ role: 'user', content: message })
      history.push({ role: 'assistant', content: agentResponse.message })

      // Keep history manageable (last 20 exchanges)
      if (history.length > 40) {
        history.splice(0, 2)
      }
    }

    // Track this statement for contradiction detection (only if not fallback)
    let statement
    let newContradictions: DetectedContradiction[] = []
    
    if (!isFallback) {
      statement = addStatement(characterId, character.name, message, agentResponse.message)

      // Check for contradictions with other characters' statements
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
    }

    // Evaluate bluff effectiveness (if bluff tactic was used)
    if (tactic === 'bluff' && !isFallback) {
      // Simple heuristic: if the response shows panic/fear/defensiveness, the bluff was close to truth
      const responseLower = agentResponse.message.toLowerCase()
      const panicWords = ['what', 'how did you', 'that\'s not', 'you can\'t', 'impossible', 'where did', 'i swear', 'i didn\'t', '*nervous', '*panic', '*sweat', '*pale']
      const confidentWords = ['nonsense', 'ridiculous', 'absurd', 'wrong', 'lying', 'proof', 'show me', 'don\'t have']
      
      const panicCount = panicWords.filter(w => responseLower.includes(w)).length
      const confidentCount = confidentWords.filter(w => responseLower.includes(w)).length
      
      if (panicCount > confidentCount) {
        // Bluff was close to truth - add pressure
        tacticPressureBonus = 10
        console.log('[BLUFF] Effective! Adding +10 pressure')
      } else {
        // Bluff was obviously wrong - suspect gets cocky, reduce pressure
        tacticPressureBonus = -5
        console.log('[BLUFF] Failed! Reducing -5 pressure')
      }
      
      // Apply bluff pressure adjustment
      recordConfrontation(characterId, message, tacticPressureBonus)
    }

    // Get updated pressure state after all tracking
    const finalPressureState = getPressureState(characterId)

    // Analyze emotional state for cinematic portrait selection (only if not fallback)
    let emotionalState: Omit<StructuredCharacterResponse, 'dialogue'> | null = null
    if (!isFallback) {
      try {
        const recentContext = history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n')
        emotionalState = await analyzeEmotionalState(
          anthropic,
          characterId,
          character.isGuilty,
          finalPressureState.level,
          agentResponse.message,
          message,
          recentContext
        )
      } catch (emotionError) {
        console.error('Error analyzing emotional state:', emotionError)
      }
    }

    const responseTime = Date.now() - startTime
    console.log(`[RESPONSE TIME] ${characterId}: ${responseTime}ms${isFallback ? ' (FALLBACK)' : ''}`)

    // Detect cinematic moments and trigger video generation
    let cinematicMoment = false
    let videoGenerationId: string | undefined
    
    if (!isFallback) {
      try {
      const { detectCinematicMoment, shouldGenerateVideo } = await import('./video/cinematicDetection')
      const { analyzeTestimony, buildVideoPrompt } = await import('./video/promptBuilder')
      const { generateVideo } = await import('./video/veoClient')
      
      const detection = detectCinematicMoment(
        characterId,
        agentResponse.message,
        message,
        pressureState.level, // Previous pressure
        finalPressureState.level, // Current pressure
        newContradictions.length > 0,
        history.length / 2 // Approximate message count
      )
      
      console.log(`[CINEMATIC DETECTION] ${characterId}: ${detection.confidence}% - ${detection.reason || 'Not cinematic'}`)
      
      if (shouldGenerateVideo(detection)) {
        cinematicMoment = true
        
        try {
          // Analyze testimony for video prompt
          const analysis = await analyzeTestimony(
            anthropic,
            agentResponse.message,
            characterId,
            message
          )
          
          // Build video prompt
          const videoPrompt = buildVideoPrompt(analysis, characterId, false)
          
          // Generate video in background (non-blocking)
          const videoResult = await generateVideo({
            prompt: videoPrompt.fullPrompt,
            characterId,
            testimonyId: statement?.id || `cinematic-${Date.now()}`,
            duration: 5,
            aspectRatio: '16:9',
          })
          
          if (videoResult.success || videoResult.generationId) {
            videoGenerationId = videoResult.generationId
            console.log(`[CINEMATIC VIDEO] Started generation: ${videoGenerationId}`)
          }
        } catch (videoError) {
          console.error('[CINEMATIC VIDEO] Generation failed:', videoError)
          // Non-critical - continue without video
        }
      }
      } catch (cinematicError) {
        console.error('[CINEMATIC DETECTION ERROR]', cinematicError)
      }
    }

    res.json({
      message: agentResponse.message,
      characterName: character.name,
      statementId: statement?.id,
      contradictions: newContradictions,
      toolsUsed: agentResponse.toolsUsed,
      isFallback, // NEW: Flag to indicate this is a fallback response
      pressure: {
        level: finalPressureState.level,
        confrontations: finalPressureState.confrontations,
        evidencePresented: finalPressureState.evidencePresented.length,
        contradictionsExposed: finalPressureState.contradictionsExposed,
      },
      // Cinematic: emotional state for portrait selection
      emotion: emotionalState ? {
        primary: emotionalState.emotion.primary,
        intensity: emotionalState.emotion.intensity,
        tells: emotionalState.emotion.tells,
        voice: emotionalState.voice,
        observableHint: emotionalState.observableHint,
      } : null,
      // Cinematic video generation
      cinematicMoment,
      videoGenerationId,
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

    // Track pressure from this confrontation (now analyzes question aggressiveness)
    recordConfrontation(characterId, message)

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
    version: '1.2.0',
    endpoints: {
      'GET /': 'This info',
      'GET /api/health': 'Health check',
      'GET /api/characters': 'List all characters',
      'POST /api/chat': 'Chat with a character (body: {characterId, message})',
      'POST /api/reset': 'Reset conversation history and statements',
      'GET /api/contradictions': 'Get all detected contradictions',
      'GET /api/statements': 'Get all tracked character statements',
      'POST /api/mystery/generate': 'Generate a new procedural mystery (body: {difficulty})',
      'GET /api/mystery/current': 'Get current mystery (player-safe)',
      'GET /api/mystery/debug': 'Get full mystery including solution (admin)',
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

    // Check if we have a pre-generated video ready
    const pregen = findPregenVideo(characterId)
    if (pregen && pregen !== 'pending') {
      console.log(`[VEO3] Serving pre-generated intro video for ${characterId}`)
      return res.json({
        success: true,
        cached: true,
        videoUrl: pregen,
      })
    }
    if (pregen === 'pending') {
      // Video is still generating — tell client to poll
      return res.json({
        success: false,
        pending: true,
        message: 'Introduction video is still generating. Try again in a few seconds.',
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

// ============================================================
// WATSON INVESTIGATION ASSISTANT ENDPOINTS
// ============================================================

/**
 * Process a new statement through Watson
 * Call this after each interrogation response
 */
app.post('/api/watson/analyze', async (req, res) => {
  try {
    const { characterId, characterName, statement, question, pressure } = req.body

    if (!characterId || !statement) {
      return res.status(400).json({ error: 'Missing characterId or statement' })
    }

    const watson = getWatson()
    const analysis = await watson.processStatement(
      characterId,
      characterName || characterId,
      statement,
      { question: question || '', pressure: pressure || 0 }
    )

    res.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('[WATSON] Analysis failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Watson analysis failed', details: errorMessage })
  }
})

/**
 * Get all detected contradictions
 */
app.get('/api/watson/contradictions', (_req, res) => {
  try {
    const watson = getWatson()
    const contradictions = watson.getContradictions()
    res.json({ contradictions })
  } catch (error) {
    console.error('[WATSON] Get contradictions failed:', error)
    res.status(500).json({ error: 'Failed to get contradictions' })
  }
})

/**
 * Get investigation timeline
 */
app.get('/api/watson/timeline', (_req, res) => {
  try {
    const watson = getWatson()
    const timeline = watson.getTimeline()
    res.json({ timeline })
  } catch (error) {
    console.error('[WATSON] Get timeline failed:', error)
    res.status(500).json({ error: 'Failed to get timeline' })
  }
})

/**
 * Evaluate a player's theory
 */
app.post('/api/watson/evaluate-theory', async (req, res) => {
  try {
    const { accusedId, accusedName, motive, method, opportunity, supportingEvidence, supportingStatements } = req.body

    if (!accusedId || !motive) {
      return res.status(400).json({ error: 'Missing accusedId or motive' })
    }

    const watson = getWatson()
    const evaluation = await watson.evaluateTheory({
      accusedId,
      accusedName: accusedName || accusedId,
      motive,
      method: method || '',
      opportunity: opportunity || '',
      supportingEvidence,
      supportingStatements,
    })

    res.json({
      success: true,
      evaluation,
    })
  } catch (error) {
    console.error('[WATSON] Theory evaluation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Theory evaluation failed', details: errorMessage })
  }
})

/**
 * Quick theory evaluation (no AI, for real-time UI feedback)
 */
app.post('/api/watson/quick-evaluate', (req, res) => {
  try {
    const { accusedId, motive, opportunity } = req.body

    if (!accusedId) {
      return res.status(400).json({ error: 'Missing accusedId' })
    }

    const watson = getWatson()
    const result = watson.quickEvaluateTheory({
      accusedId,
      motive: motive || '',
      opportunity: opportunity || '',
    })

    res.json(result)
  } catch (error) {
    console.error('[WATSON] Quick evaluation failed:', error)
    res.status(500).json({ error: 'Quick evaluation failed' })
  }
})

/**
 * Get investigation suggestions
 */
app.get('/api/watson/suggestions', async (_req, res) => {
  try {
    const watson = getWatson()
    const suggestions = await watson.getSuggestions()
    res.json({ suggestions })
  } catch (error) {
    console.error('[WATSON] Get suggestions failed:', error)
    res.status(500).json({ error: 'Failed to get suggestions' })
  }
})

/**
 * Get summary of a specific suspect
 */
app.get('/api/watson/suspect/:id', async (req, res) => {
  try {
    const { id } = req.params
    const watson = getWatson()
    const summary = await watson.getSuspectSummary(id)
    res.json(summary)
  } catch (error) {
    console.error('[WATSON] Get suspect summary failed:', error)
    res.status(500).json({ error: 'Failed to get suspect summary' })
  }
})

/**
 * Get investigation summary
 */
app.get('/api/watson/summary', (_req, res) => {
  try {
    const watson = getWatson()
    const summary = watson.getInvestigationSummary()
    res.json(summary)
  } catch (error) {
    console.error('[WATSON] Get summary failed:', error)
    res.status(500).json({ error: 'Failed to get investigation summary' })
  }
})

/**
 * Get all tracked statements
 */
app.get('/api/watson/statements', (_req, res) => {
  try {
    const watson = getWatson()
    const statements = watson.getAllStatements()
    res.json({ statements })
  } catch (error) {
    console.error('[WATSON] Get statements failed:', error)
    res.status(500).json({ error: 'Failed to get statements' })
  }
})

/**
 * Get character profiles
 */
app.get('/api/watson/profiles', (_req, res) => {
  try {
    const watson = getWatson()
    const profiles = watson.getCharacterProfiles()
    res.json({ profiles })
  } catch (error) {
    console.error('[WATSON] Get profiles failed:', error)
    res.status(500).json({ error: 'Failed to get character profiles' })
  }
})

/**
 * Reset Watson for a new game
 */
app.post('/api/watson/reset', (_req, res) => {
  try {
    resetWatson()
    res.json({ success: true, message: 'Watson reset complete' })
  } catch (error) {
    console.error('[WATSON] Reset failed:', error)
    res.status(500).json({ error: 'Failed to reset Watson' })
  }
})

// ============================================================
// MYSTERY GENERATION ENDPOINTS (Mystery Architect)
// ============================================================

/**
 * Generate a new procedural mystery
 * This creates a unique mystery with victim, suspects, evidence, and solution
 */
app.post('/api/mystery/generate', async (req, res) => {
  try {
    const { difficulty = 'medium' } = req.body
    console.log('[MYSTERY] Generating new mystery, difficulty:', difficulty)

    const mystery = await generateMystery(difficulty)
    await saveMystery(mystery)

    // Don't return full mystery (spoilers!)
    // Return only player-safe information
    res.json({
      success: true,
      mysteryId: mystery.id,
      setting: mystery.setting,
      victim: {
        name: mystery.victim.name,
        role: mystery.victim.role,
        causeOfDeath: mystery.victim.causeOfDeath,
      },
      suspectCount: mystery.suspects.length,
      evidenceCount: mystery.evidence.length,
    })
  } catch (error) {
    console.error('[MYSTERY] Generation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate mystery', details: errorMessage })
  }
})

/**
 * Get current mystery (player-safe, no spoilers)
 * Returns setting, victim, and suspect info but NOT killer identity or solution
 */
app.get('/api/mystery/current', async (_req, res) => {
  try {
    const mystery = await getCurrentMystery()
    if (!mystery) {
      return res.status(404).json({ error: 'No active mystery', message: 'Generate a mystery first with POST /api/mystery/generate' })
    }

    // Return player-safe data only
    res.json({
      id: mystery.id,
      difficulty: mystery.difficulty,
      setting: mystery.setting,
      victim: mystery.victim,
      suspects: mystery.suspects.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        personality: s.personality,
        videoStyle: s.videoStyle,
        // Exclude: alibi truth, secrets, knowledge, pressure profile
      })),
      evidenceCount: mystery.evidence.length,
      timelineCount: mystery.timeline.length,
      // Exclude: killer, solution, evidence implications
    })
  } catch (error) {
    console.error('[MYSTERY] Get current failed:', error)
    res.status(500).json({ error: 'Failed to get mystery' })
  }
})

/**
 * Admin/debug endpoint - returns FULL mystery including solution
 * Only use for testing/development!
 */
app.get('/api/mystery/debug', async (_req, res) => {
  try {
    const mystery = await getCurrentMystery()
    if (!mystery) {
      return res.status(404).json({ error: 'No active mystery' })
    }

    // Return full mystery including solution (for debugging)
    res.json(mystery)
  } catch (error) {
    console.error('[MYSTERY] Debug get failed:', error)
    res.status(500).json({ error: 'Failed to get mystery' })
  }
})

/**
 * Export current mystery as JSON (for saving/sharing)
 */
app.get('/api/mystery/export', async (_req, res) => {
  try {
    const json = await exportMystery()
    if (!json) {
      return res.status(404).json({ error: 'No active mystery to export' })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="mystery.json"')
    res.send(json)
  } catch (error) {
    console.error('[MYSTERY] Export failed:', error)
    res.status(500).json({ error: 'Failed to export mystery' })
  }
})

/**
 * Import a mystery from JSON
 */
app.post('/api/mystery/import', async (req, res) => {
  try {
    const { mystery: mysteryJson } = req.body
    if (!mysteryJson) {
      return res.status(400).json({ error: 'Missing mystery JSON in request body' })
    }

    const mystery = await importMystery(typeof mysteryJson === 'string' ? mysteryJson : JSON.stringify(mysteryJson))
    res.json({
      success: true,
      mysteryId: mystery.id,
      setting: mystery.setting,
    })
  } catch (error) {
    console.error('[MYSTERY] Import failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to import mystery', details: errorMessage })
  }
})

/**
 * Clear current mystery
 */
app.post('/api/mystery/clear', async (_req, res) => {
  try {
    await clearCurrentMystery()
    res.json({ success: true, message: 'Mystery cleared' })
  } catch (error) {
    console.error('[MYSTERY] Clear failed:', error)
    res.status(500).json({ error: 'Failed to clear mystery' })
  }
})

/**
 * List all available mysteries (hardcoded + generated)
 * Returns metadata only for the mystery selection screen
 */
app.get('/api/mysteries', async (_req, res) => {
  try {
    // Import the registry from the frontend
    // For now, return hardcoded list
    // TODO: In the future, also include generated mysteries from the store
    const mysteries = [
      {
        id: 'ashford-affair',
        title: 'The Ashford Affair',
        subtitle: 'New Year\'s Eve, 1929 — Ashford Manor',
        era: '1920s',
        difficulty: 'medium',
        isGenerated: false,
      },
      {
        id: 'hollywood-premiere',
        title: 'Shadows Over Sunset',
        subtitle: 'March 15th, 1947 — The Palladium Theatre',
        era: '1940s',
        difficulty: 'medium',
        isGenerated: false,
      },
    ]
    res.json({ mysteries })
  } catch (error) {
    console.error('[MYSTERY] List failed:', error)
    res.status(500).json({ error: 'Failed to list mysteries' })
  }
})

/**
 * Get a specific mystery by ID
 * Returns the full mystery data needed to initialize the game
 * For hardcoded mysteries, loads from the mystery files
 * For generated mysteries, loads from the store
 */
app.get('/api/mystery/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Check if it's a hardcoded mystery
    if (id === 'ashford-affair' || id === 'hollywood-premiere') {
      // For hardcoded mysteries, the frontend registry will handle loading
      // We just return a minimal response indicating it should be loaded client-side
      res.json({
        success: true,
        mysteryId: id,
        loadClientSide: true,
        message: 'Load this mystery from the client-side registry',
      })
    } else {
      // For generated mysteries, load from the store
      const mystery = await getMysteryById(id)
      if (!mystery) {
        return res.status(404).json({ error: 'Mystery not found' })
      }

      // Convert GeneratedMystery to LoadedMystery format
      // This is a simplified conversion - in production you'd want to fully map the structure
      res.json({
        mystery: {
          id: mystery.id,
          title: `Case ${mystery.id}`,
          worldState: {
            timeOfDeath: mystery.victim.lastKnownAlive.time,
            victim: mystery.victim.name,
            location: mystery.setting.location,
            weather: 'Clear evening',
            guestList: mystery.suspects.map(s => s.name),
            publicKnowledge: mystery.timeline
              .filter(t => t.isPublicKnowledge)
              .map(t => t.description),
          },
          characters: mystery.suspects,
          greetings: {}, // TODO: Generate greetings from character profiles
          evidence: {}, // TODO: Convert evidence array to record
          evidenceByRoom: {},
          evidenceDialogueUnlocks: {},
          rooms: [...new Set(mystery.timeline.map(t => t.location))],
          killerId: mystery.killer.characterId,
        },
      })
    }
  } catch (error) {
    console.error('[MYSTERY] Get by ID failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to get mystery', details: errorMessage })
  }
})

// ============================================================
// BACKGROUND SIMULATION ENDPOINTS (Inter-Character Dynamics)
// ============================================================

/**
 * GET /api/manor/activity
 * Get current manor activity summary
 */
app.get('/api/manor/activity', (_req, res) => {
  try {
    const summary = getManorActivitySummary()
    res.json(summary)
  } catch (error) {
    console.error('[MANOR] Get activity failed:', error)
    res.status(500).json({ error: 'Failed to get manor activity' })
  }
})

/**
 * GET /api/manor/room/:roomId
 * Get info about a specific room (who's there, what's happening)
 */
app.get('/api/manor/room/:roomId', (req, res) => {
  try {
    const { roomId } = req.params
    const presence = getRoomPresence(roomId)
    const characters = getCharactersInRoom(roomId)
    
    res.json({
      roomId,
      characters,
      presence,
    })
  } catch (error) {
    console.error('[MANOR] Get room failed:', error)
    res.status(500).json({ error: 'Failed to get room info' })
  }
})

/**
 * GET /api/manor/room/:roomId/enter
 * Enter a room and potentially overhear something
 */
app.get('/api/manor/room/:roomId/enter', (req, res) => {
  try {
    const { roomId } = req.params
    const { snippet, whatHeard } = getOverheardSnippet(roomId)
    const presence = getRoomPresence(roomId)
    
    res.json({
      roomId,
      presence,
      overheard: whatHeard,
      fullConversation: snippet,
    })
  } catch (error) {
    console.error('[MANOR] Enter room failed:', error)
    res.status(500).json({ error: 'Failed to enter room' })
  }
})

/**
 * GET /api/manor/conversations
 * Get all recent background conversations (for debug/review)
 */
app.get('/api/manor/conversations', (_req, res) => {
  try {
    const conversations = getAllBackgroundConversations()
    res.json({ conversations })
  } catch (error) {
    console.error('[MANOR] Get conversations failed:', error)
    res.status(500).json({ error: 'Failed to get conversations' })
  }
})

/**
 * POST /api/manor/simulate
 * Trigger a background conversation between characters in a room
 */
app.post('/api/manor/simulate', async (req, res) => {
  try {
    const { char1Id, char2Id, roomId, pressureLevel } = req.body
    
    if (!char1Id || !char2Id || !roomId) {
      return res.status(400).json({ error: 'Missing char1Id, char2Id, or roomId' })
    }
    
    const conversation = await generateBackgroundConversation(
      anthropic,
      char1Id,
      char2Id,
      roomId,
      pressureLevel || 50
    )
    
    res.json({
      success: true,
      conversation,
    })
  } catch (error) {
    console.error('[MANOR] Simulate conversation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to simulate conversation', details: errorMessage })
  }
})

/**
 * POST /api/manor/reset
 * Reset the background simulation
 */
app.post('/api/manor/reset', (_req, res) => {
  try {
    clearBackgroundSimulation()
    initializeCharacterLocations()
    res.json({ success: true, message: 'Background simulation reset' })
  } catch (error) {
    console.error('[MANOR] Reset failed:', error)
    res.status(500).json({ error: 'Failed to reset simulation' })
  }
})

const PORT = process.env.PORT || 3001

// Portrait video routes
app.use('/api/portraits', portraitRoutes)

// Room atmosphere routes
app.use('/api/atmosphere', atmosphereRoutes)

// Start cache cleanup interval
startCacheCleanup()

// Initialize character locations for background simulation
initializeCharacterLocations()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  console.log('Available endpoints:')
  console.log('  POST /api/chat - Chat with a character')
  console.log('  GET /api/characters - List all characters')
  console.log('  POST /api/reset - Reset conversation history')
  console.log('  GET /api/manor/activity - Get manor activity summary')
  console.log('  GET /api/manor/room/:id/enter - Enter room and overhear conversations')

  // Pre-generate character introduction videos in the background
  // Wait 5 seconds after server starts to avoid startup congestion
  setTimeout(() => {
    pregenerateIntroductions().catch(error => {
      console.error('[SERVER] Failed to pre-generate introductions:', error)
      // Don't crash the server - this is background work
    })
  }, 5000)
})
