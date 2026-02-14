import type { Contradiction } from '../game/state'

// Use VITE_API_URL for production (Vercel → Railway), otherwise auto-detect for local dev
export const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  // In production (Vercel), use relative /api path (Vercel rewrites to Railway)
  // In local dev, use localhost:3001
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api'
  }
  return '/api'
}

const API_BASE = getApiBase()

const REQUEST_TIMEOUT_MS = 20_000

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface PressureData {
  level: number
  confrontations: number
  evidencePresented: number
  contradictionsExposed: number
}

export interface ChatStreamResponse extends ChatResponse {}

export interface ChatRequestParams {
  characterId: string
  message: string
  tactic?: 'alibi' | 'present_evidence' | 'cross_reference' | 'bluff' | null
  evidenceId?: string | null
  crossReferenceStatement?: { characterId: string; content: string } | null
}


export type EmotionalState = 'composed' | 'nervous' | 'defensive' | 'breaking' | 'relieved' | 'hostile'

export interface VoiceModifiers {
  pace: 'fast' | 'normal' | 'slow'
  tremor: boolean
  volume: 'whisper' | 'normal' | 'raised'
  breaks: boolean
}

export interface EmotionData {
  primary: EmotionalState
  intensity: number
  tells: string[]
  voice: VoiceModifiers
  observableHint?: string
}

export interface ChatResponse {
  message: string
  characterName: string
  statementId?: string
  contradictions?: Contradiction[]
  pressure?: PressureData
  emotion?: EmotionData  // New: for cinematic portrait selection
  isFallback?: boolean   // NEW: Indicates API failure, should retry
  cinematicMoment?: boolean // NEW: Dramatic moment detected
  videoGenerationId?: string // NEW: Video generation ID for polling
}

export interface ChatVideoResponse {
  message: string
  characterName: string
  statementId?: string
  contradictions?: Contradiction[]
  toolsUsed?: string[]
  pressure?: PressureData
  voiceAudioBase64?: string
  videoGenerationId?: string
  videoUrl?: string
  cached?: boolean
  analysis?: {
    location: string
    timeOfDay: string
    characters: string[]
    actions: string[]
    objects: string[]
    mood: string
    keyVisualElements: string[]
  }
}

// Active mystery ID for routing to universal character agent
let _activeMysteryId: string | null = null

/** Set the active mystery ID — routes chat to /api/mystery/:id/chat */
export function setActiveMysteryId(id: string | null) {
  _activeMysteryId = id
}

export async function sendMessage(
  characterId: string,
  message: string,
  tactic?: 'alibi' | 'present_evidence' | 'cross_reference' | 'bluff' | null,
  evidenceId?: string | null,
  crossReferenceStatement?: { characterId: string; content: string } | null
): Promise<ChatResponse> {
  // Route to universal character agent if a generated mystery is active
  const url = _activeMysteryId
    ? `${API_BASE}/mystery/${_activeMysteryId}/chat`
    : `${API_BASE}/chat`

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      characterId, 
      message,
      tactic,
      evidenceId: evidenceId || undefined,
      crossReferenceStatement
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

export async function resetConversation(characterId?: string): Promise<void> {
  await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId }),
  })
}


export function chatStream(
  params: ChatRequestParams,
  onToken: (text: string) => void,
  onDone: (response: ChatResponse) => void,
  onError?: (error: unknown) => void
): AbortController {
  const controller = new AbortController()

  // Generated mystery endpoints don't yet support streaming; fall back to normal chat
  if (_activeMysteryId) {
    sendMessage(
      params.characterId,
      params.message,
      params.tactic,
      params.evidenceId,
      params.crossReferenceStatement
    )
      .then((response) => onDone(response))
      .catch((err) => {
        if (onError) {
          onError(err)
        }
      })
    return controller
  }

  // Stream directly to Railway to avoid Vercel's 10s proxy timeout
  const streamBase = import.meta.env.DEV 
    ? 'http://localhost:3001/api' 
    : 'https://all-suspects-production.up.railway.app/api'
  
  const responsePromise = fetch(`${streamBase}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      characterId: params.characterId,
      message: params.message,
      tactic: params.tactic,
      evidenceId: params.evidenceId || undefined,
      crossReferenceStatement: params.crossReferenceStatement || undefined,
    }),
  })

  ;(async () => {
    try {
      const response = await responsePromise

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || response.statusText)
      }
      if (!response.body) {
        throw new Error('No response stream available')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneParsed = false

      const parseBlock = (block: string) => {
        const lines = block.split('\n')
        let eventName = 'message'
        let data = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            data += line.slice(6)
          }
        }

        if (!data) return

        const payload = JSON.parse(data)

        if (eventName === 'token' && payload && typeof payload.text === 'string') {
          onToken(payload.text)
        } else if (eventName === 'done') {
          doneParsed = true
          onDone(payload as ChatResponse)
        } else if (eventName === 'error') {
          doneParsed = true
          throw new Error((payload as { error?: string }).error || 'Stream error')
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          parseBlock(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf('\n\n')
        }
      }

      if (!doneParsed && buffer.trim()) {
        parseBlock(buffer.trim())
      }

      if (!doneParsed) {
        throw new Error('Stream ended before completion')
      }
    } catch (error) {
      if (onError) {
        onError(error)
      }
    }
  })()

  return controller
}


// ============================================================
// VIDEO GENERATION API
// ============================================================


export async function sendChatVideo(
  characterId: string,
  message: string,
  evidenceId?: string
): Promise<ChatVideoResponse> {
  const response = await fetch(`${API_BASE}/chat-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, message, evidenceId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || `Video generation failed`)
  }

  return response.json()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}

export interface VideoGenerationResponse {
  success: boolean
  cached?: boolean
  videoUrl?: string
  videoData?: string
  imageUrl?: string
  error?: string
  generationId?: string
  prompt?: string
  analysis?: {
    location: string
    timeOfDay: string
    characters: string[]
    actions: string[]
    objects: string[]
    mood: string
    keyVisualElements: string[]
  }
}

export interface VideoStatusResponse {
  generationId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  error?: string
}

export interface VideoCacheStats {
  configured: boolean
  cache: {
    size: number
    maxSize: number
    hitRate: number
    oldestEntry: number | null
    newestEntry: number | null
  }
}

/**
 * Generate a video from character testimony
 */
export async function generateTestimonyVideo(
  characterId: string,
  testimony: string,
  question?: string,
  testimonyId?: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/testimony`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, testimony, question, testimonyId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Video generation failed')
  }

  return response.json()
}

/**
 * Generate a character introduction video
 */
export async function generateIntroductionVideo(
  characterId: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/introduction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Video generation failed')
  }

  return response.json()
}

/**
 * Generate an image from testimony (faster fallback)
 */
export async function generateTestimonyImage(
  characterId: string,
  testimony: string,
  question?: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, testimony, question }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Image generation failed')
  }

  return response.json()
}

/**
 * Check the status of a video generation
 */
export async function checkVideoStatus(
  generationId: string
): Promise<VideoStatusResponse> {
  const response = await fetch(`${API_BASE}/video/status/${generationId}`)

  if (!response.ok) {
    throw new Error('Failed to check video status')
  }

  return response.json()
}

/**
 * Get video cache statistics
 */
export async function getVideoCacheStats(): Promise<VideoCacheStats> {
  const response = await fetch(`${API_BASE}/video/cache`)

  if (!response.ok) {
    throw new Error('Failed to get cache stats')
  }

  return response.json()
}

/**
 * Check if video generation is available
 */
export async function isVideoAvailable(): Promise<boolean> {
  try {
    const stats = await getVideoCacheStats()
    return stats.configured
  } catch {
    return false
  }
}

// ============================================================
// VOICE GENERATION API
// ============================================================

export interface VoiceResponse {
  audio: string // base64 encoded audio
  format: string
  characterId: string
  voiceName: string
}

/**
 * Generate voice audio for text
 */
export async function generateVoice(
  characterId: string,
  text: string
): Promise<VoiceResponse> {
  const response = await fetch(`${API_BASE}/voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Voice generation failed')
  }

  return response.json()
}

// ============================================================
// WATSON INVESTIGATION ASSISTANT API
// ============================================================

export interface WatsonContradiction {
  id: string
  type: 'direct' | 'logical' | 'timeline'
  severity: 'minor' | 'significant' | 'critical'
  statement1: {
    characterId: string
    characterName: string
    content: string
  }
  statement2: {
    characterId: string
    characterName: string
    content: string
  }
  explanation: string
  suggestedFollowUp?: string[]
}

export interface WatsonTimelineEvent {
  time: string
  location: string
  description: string
  sources: string[]
  confirmed: boolean
  disputed: boolean
}

export interface WatsonSuggestion {
  id: string
  type: 'follow_up' | 'new_line' | 'evidence' | 'comparison'
  priority: 'low' | 'medium' | 'high'
  text: string
  reasoning: string
  targetCharacter?: string
}

export interface WatsonTheoryEvaluation {
  score: number
  grade: string
  verdict: string
  supports?: string[]
  contradicts?: string[]
  missing?: string[]
  watsonComment?: string
}

export interface WatsonAnalysis {
  success: boolean
  analysis: {
    newContradictions: WatsonContradiction[]
    observations: string[]
    suggestions: WatsonSuggestion[]
    timelineUpdates: WatsonTimelineEvent[]
  }
}

export interface WatsonSummary {
  totalStatements: number
  statementsPerCharacter: Record<string, number>
  contradictionCount: number
  unresolvedContradictions: number
  timelineEvents: number
  confirmedEvents: number
  disputedEvents: number
  activeTheories: number
}

/**
 * Process a statement through Watson for analysis
 */
export async function analyzeWithWatson(
  characterId: string,
  characterName: string,
  statement: string,
  question: string,
  pressure: number = 0
): Promise<WatsonAnalysis> {
  const response = await fetch(`${API_BASE}/watson/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, characterName, statement, question, pressure }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Watson analysis failed')
  }

  return response.json()
}

/**
 * Get all detected contradictions
 */
export async function getWatsonContradictions(): Promise<{ contradictions: WatsonContradiction[] }> {
  const response = await fetch(`${API_BASE}/watson/contradictions`)

  if (!response.ok) {
    throw new Error('Failed to get contradictions')
  }

  return response.json()
}

/**
 * Get investigation timeline
 */
export async function getWatsonTimeline(): Promise<{ timeline: WatsonTimelineEvent[] }> {
  const response = await fetch(`${API_BASE}/watson/timeline`)

  if (!response.ok) {
    throw new Error('Failed to get timeline')
  }

  return response.json()
}

/**
 * Evaluate a player's theory
 */
export async function evaluateWatsonTheory(theory: {
  accusedId: string
  accusedName: string
  motive: string
  method: string
  opportunity: string
  supportingEvidence?: string[]
  supportingStatements?: string[]
}): Promise<{ success: boolean; evaluation: WatsonTheoryEvaluation }> {
  const response = await fetch(`${API_BASE}/watson/evaluate-theory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(theory),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Theory evaluation failed')
  }

  return response.json()
}

/**
 * Quick theory evaluation (no AI, for real-time feedback)
 */
export async function quickEvaluateWatsonTheory(theory: {
  accusedId: string
  motive: string
  opportunity: string
}): Promise<{ score: number; grade: string; verdict: string }> {
  const response = await fetch(`${API_BASE}/watson/quick-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(theory),
  })

  if (!response.ok) {
    throw new Error('Quick evaluation failed')
  }

  return response.json()
}

/**
 * Get investigation suggestions
 */
export async function getWatsonSuggestions(): Promise<{ suggestions: WatsonSuggestion[] }> {
  const response = await fetch(`${API_BASE}/watson/suggestions`)

  if (!response.ok) {
    throw new Error('Failed to get suggestions')
  }

  return response.json()
}

/**
 * Get summary of a specific suspect
 */
export async function getWatsonSuspectSummary(characterId: string): Promise<{
  characterId: string
  characterName: string
  statementsCount: number
  contradictionsInvolved: number
  summary: string
  keyStatements: { id: string; content: string; topic: string }[]
  emotionalPattern: string
  cooperationLevel: number
}> {
  const response = await fetch(`${API_BASE}/watson/suspect/${characterId}`)

  if (!response.ok) {
    throw new Error('Failed to get suspect summary')
  }

  return response.json()
}

/**
 * Get overall investigation summary
 */
export async function getWatsonSummary(): Promise<WatsonSummary> {
  const response = await fetch(`${API_BASE}/watson/summary`)

  if (!response.ok) {
    throw new Error('Failed to get investigation summary')
  }

  return response.json()
}

/**
 * Reset Watson for a new game
 */
export async function resetWatson(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/watson/reset`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to reset Watson')
  }

  return response.json()
}

// ============================================================
// CHARACTER PORTRAIT VIDEO API
// ============================================================

export interface PortraitResult {
  characterId: string
  emotionalState: EmotionalState
  videoUrl?: string
  generationId: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
}

/**
 * Get or generate a character portrait video
 */
export async function getCharacterPortrait(
  characterId: string,
  emotionalState: EmotionalState,
  intensity?: number,
  context?: string
): Promise<PortraitResult> {
  const params = new URLSearchParams()
  if (intensity !== undefined) params.set('intensity', intensity.toString())
  if (context) params.set('context', context)
  
  const url = `${API_BASE}/portraits/${characterId}/${emotionalState}${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Failed to get portrait')
  }

  return response.json()
}

/**
 * Check status of a portrait generation
 */
export async function checkPortraitStatus(
  characterId: string,
  emotionalState: EmotionalState
): Promise<PortraitResult | null> {
  const response = await fetch(`${API_BASE}/portraits/${characterId}/${emotionalState}/status`)

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Failed to check portrait status')
  }

  return response.json()
}

/**
 * Pre-generate portraits for characters
 */
export async function pregeneratePortraits(
  characters?: string[],
  states?: EmotionalState[]
): Promise<{ message: string; characters: string[]; states: string[] }> {
  const response = await fetch(`${API_BASE}/portraits/pregenerate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characters, states }),
  })

  if (!response.ok) {
    throw new Error('Failed to start pre-generation')
  }

  return response.json()
}

/**
 * Get all cached portraits
 */
export async function getCachedPortraits(): Promise<Record<string, PortraitResult>> {
  const response = await fetch(`${API_BASE}/portraits/cache`)

  if (!response.ok) {
    throw new Error('Failed to get cached portraits')
  }

  return response.json()
}

// ============================================================
// ROOM ATMOSPHERE VIDEO API
// ============================================================

export type RoomId = 'study' | 'parlor' | 'dining' | 'kitchen' | 'hallway' | 'garden'
export type TimeOfDay = 'night' | 'dawn' | 'dusk'
export type WeatherCondition = 'clear' | 'rain' | 'storm' | 'fog'

export interface RoomAtmosphereResult {
  roomId: RoomId
  videoUrl?: string
  generationId: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
  timeOfDay: TimeOfDay
  weather: WeatherCondition
}

export interface RoomInfo {
  roomId: RoomId
  name: string
  description: string
  keyElements: string[]
  lightSources: string[]
  sounds: string[]
}

/**
 * Get or generate a room atmosphere video
 */
export async function getRoomAtmosphere(
  roomId: RoomId,
  timeOfDay?: TimeOfDay,
  weather?: WeatherCondition,
  tension?: number
): Promise<RoomAtmosphereResult> {
  const params = new URLSearchParams()
  if (timeOfDay) params.set('time', timeOfDay)
  if (weather) params.set('weather', weather)
  if (tension !== undefined) params.set('tension', tension.toString())
  
  const url = `${API_BASE}/atmosphere/${roomId}${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Failed to get atmosphere')
  }

  return response.json()
}

/**
 * Check status of an atmosphere generation
 */
export async function checkAtmosphereStatus(
  roomId: RoomId,
  timeOfDay?: TimeOfDay,
  weather?: WeatherCondition
): Promise<RoomAtmosphereResult | null> {
  const params = new URLSearchParams()
  if (timeOfDay) params.set('time', timeOfDay)
  if (weather) params.set('weather', weather)
  
  const response = await fetch(`${API_BASE}/atmosphere/${roomId}/status?${params}`)

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Failed to check atmosphere status')
  }

  return response.json()
}

/**
 * Get room information
 */
export async function getRoomInfo(roomId: RoomId): Promise<RoomInfo> {
  const response = await fetch(`${API_BASE}/atmosphere/${roomId}/info`)

  if (!response.ok) {
    throw new Error('Failed to get room info')
  }

  return response.json()
}

/**
 * Get list of all rooms
 */
export async function getAllRooms(): Promise<{
  rooms: Array<{ id: RoomId; name: string; description: string }>
  validTimes: TimeOfDay[]
  validWeather: WeatherCondition[]
}> {
  const response = await fetch(`${API_BASE}/atmosphere/rooms/list`)

  if (!response.ok) {
    throw new Error('Failed to get rooms list')
  }

  return response.json()
}

/**
 * Pre-generate room atmospheres
 */
export async function pregenerateAtmospheres(
  timeOfDay?: TimeOfDay,
  weather?: WeatherCondition
): Promise<{ message: string; timeOfDay: string; weather: string; rooms: string[] }> {
  const response = await fetch(`${API_BASE}/atmosphere/pregenerate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeOfDay, weather }),
  })

  if (!response.ok) {
    throw new Error('Failed to start pre-generation')
  }

  return response.json()
}

// ── Stripe / Subscription ──────────────────────────────────────────────────

export interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

export interface SubscriptionStatusResponse {
  isPremium: boolean
  customerId?: string
  subscriptionId?: string
  expiresAt?: number
  visitorId?: string
}

export async function createCheckoutSession(visitorId: string): Promise<CheckoutSessionResponse> {
  const response = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }
  
  return response.json()
}

export async function getSubscriptionStatus(sessionId: string): Promise<SubscriptionStatusResponse> {
  const response = await fetch(`${API_BASE}/stripe/subscription-status?session_id=${sessionId}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get subscription status')
  }
  
  return response.json()
}
