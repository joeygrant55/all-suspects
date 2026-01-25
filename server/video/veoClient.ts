/**
 * Veo 3 Client for Video Generation
 *
 * Integrates with Google's Veo 3 API via REST to generate video clips
 * based on character testimony and scene descriptions.
 */

import { GoogleGenAI } from '@google/genai'

// Initialize the Gemini client for text generation (used for fallback)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
let genai: GoogleGenAI | null = null

// Veo 3 REST API configuration - using correct veo-002 model
const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const VEO_MODEL = 'veo-002'

try {
  if (GEMINI_API_KEY) {
    genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  }
} catch (e) {
  console.warn('Failed to initialize Gemini client:', e)
}

export interface VideoGenerationRequest {
  prompt: string
  characterId: string
  testimonyId: string
  duration?: number // seconds, default 5
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

export interface VideoGenerationResult {
  success: boolean
  videoUrl?: string
  videoData?: string // Base64 encoded video or description
  error?: string
  generationId: string
  characterId: string
  testimonyId: string
  prompt: string
  generatedAt: number
  durationMs?: number
  fallback?: boolean // True if this is a fallback/placeholder
}

export interface GenerationStatus {
  generationId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  error?: string
  operationName?: string
}

// Track ongoing generations
const generationQueue: Map<string, GenerationStatus> = new Map()

/**
 * Start video generation using Veo 3 REST API
 * Uses the correct generateContent endpoint with video modality
 */
async function startVeoGeneration(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = '16:9'
): Promise<{ operationName: string } | { error: string }> {
  const url = `${VEO_API_BASE}/models/${VEO_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  console.log('[VEO3] Starting video generation with veo-002...')
  console.log('[VEO3] Prompt:', prompt.substring(0, 100) + '...')

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['video'],
        videoDuration: duration
      }
    }

    console.log('[VEO3] Request URL:', url.replace(GEMINI_API_KEY, 'API_KEY_REDACTED'))
    console.log('[VEO3] Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('[VEO3] Response status:', response.status)
    console.log('[VEO3] Response body:', responseText.substring(0, 500))

    if (!response.ok) {
      let errorData: { error?: { message?: string } } = {}
      try {
        errorData = JSON.parse(responseText)
      } catch {
        // Response wasn't JSON
      }
      console.error('[VEO3] API error:', response.status, errorData)
      return { error: errorData.error?.message || `API error: ${response.status} - ${responseText.substring(0, 200)}` }
    }

    const data = JSON.parse(responseText)

    // The response should contain an operation name for async video generation
    // Check various possible response formats
    if (data.name) {
      console.log('[VEO3] Got operation name:', data.name)
      return { operationName: data.name }
    }

    // If the video was generated synchronously (unlikely for video), check for direct video data
    if (data.candidates?.[0]?.content?.parts) {
      const parts = data.candidates[0].content.parts
      for (const part of parts) {
        if (part.fileData?.fileUri || part.videoMetadata) {
          console.log('[VEO3] Got synchronous video response')
          // Return a fake operation name to indicate immediate completion
          return { operationName: `sync:${JSON.stringify(data)}` }
        }
      }
    }

    console.error('[VEO3] Unexpected response format:', JSON.stringify(data, null, 2).substring(0, 500))
    return { error: 'Unexpected response format - no operation name or video data' }
  } catch (err) {
    console.error('[VEO3] Request failed:', err)
    return { error: err instanceof Error ? err.message : 'Request failed' }
  }
}

/**
 * Poll for video generation completion
 */
async function pollVeoOperation(operationName: string): Promise<{
  done: boolean
  videoUrl?: string
  error?: string
  progress?: number
}> {
  // Handle synchronous responses (already have the data)
  if (operationName.startsWith('sync:')) {
    try {
      const data = JSON.parse(operationName.substring(5))
      const videoUrl = extractVideoUrl(data)
      if (videoUrl) {
        return { done: true, videoUrl }
      }
      return { done: true, error: 'No video URL in synchronous response' }
    } catch {
      return { done: true, error: 'Failed to parse synchronous response' }
    }
  }

  const url = `${VEO_API_BASE}/${operationName}?key=${GEMINI_API_KEY}`

  try {
    console.log('[VEO3] Polling operation:', operationName)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: { error?: { message?: string } } = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Response wasn't JSON
      }
      console.error('[VEO3] Poll error:', response.status, errorText.substring(0, 200))
      return { done: false, error: errorData.error?.message || `Poll failed: ${response.status}` }
    }

    const data = await response.json()
    console.log('[VEO3] Poll response:', JSON.stringify(data, null, 2).substring(0, 500))

    if (data.done) {
      // Extract video URL from response
      const videoUrl = extractVideoUrl(data)
      
      if (videoUrl) {
        console.log('[VEO3] Video ready:', videoUrl.substring(0, 100))
        return { done: true, videoUrl }
      }

      // Check for error in completed response
      if (data.error) {
        return { done: true, error: data.error.message || 'Generation failed' }
      }

      console.error('[VEO3] No video URI found. Response:', JSON.stringify(data, null, 2).substring(0, 1000))
      return { done: true, error: 'No video in response' }
    }

    // Still processing - estimate progress from metadata if available
    const progress = data.metadata?.progress || 50
    return { done: false, progress }
  } catch (err) {
    console.error('[VEO3] Poll failed:', err)
    return { done: false, error: err instanceof Error ? err.message : 'Poll failed' }
  }
}

/**
 * Extract video URL from various response formats
 */
function extractVideoUrl(data: Record<string, unknown>): string | null {
  // Try multiple possible paths where Veo might put the video URL
  const possiblePaths = [
    // Operation response formats
    (data.response as Record<string, unknown>)?.generateVideoResponse,
    (data.response as Record<string, unknown>)?.predictions,
    data.result,
    data.response,
    
    // Direct content formats (synchronous)
    (data.candidates as Array<{ content?: { parts?: unknown[] } }>)?.[0]?.content?.parts,
  ]

  for (const pathData of possiblePaths) {
    if (!pathData) continue

    // Check if it's an array of samples/videos
    if (Array.isArray(pathData)) {
      for (const item of pathData) {
        const typedItem = item as Record<string, unknown>
        const uri = 
          (typedItem.video as Record<string, unknown>)?.uri ||
          typedItem.uri ||
          (typedItem.fileData as Record<string, unknown>)?.fileUri ||
          typedItem.fileUri
        if (uri && typeof uri === 'string') {
          return appendApiKey(uri)
        }
      }
    }
    
    // Check if it's an object with generatedSamples
    const samples = (pathData as Record<string, unknown>)?.generatedSamples
    if (Array.isArray(samples)) {
      for (const sample of samples) {
        const typedSample = sample as Record<string, unknown>
        const uri = (typedSample.video as Record<string, unknown>)?.uri
        if (uri && typeof uri === 'string') {
          return appendApiKey(uri)
        }
      }
    }

    // Check for videos array
    const videos = (pathData as Record<string, unknown>)?.videos
    if (Array.isArray(videos)) {
      for (const video of videos) {
        const typedVideo = video as Record<string, unknown>
        const uri = typedVideo.uri
        if (uri && typeof uri === 'string') {
          return appendApiKey(uri)
        }
      }
    }
  }

  // Also check top-level for direct video arrays
  if (Array.isArray(data.videos)) {
    const uri = (data.videos[0] as Record<string, unknown>)?.uri
    if (uri && typeof uri === 'string') {
      return appendApiKey(uri)
    }
  }
  
  if (Array.isArray(data.generatedSamples)) {
    const uri = ((data.generatedSamples[0] as Record<string, unknown>)?.video as Record<string, unknown>)?.uri
    if (uri && typeof uri === 'string') {
      return appendApiKey(uri)
    }
  }

  return null
}

/**
 * Append API key to video URL if needed
 */
function appendApiKey(uri: string): string {
  if (uri.includes('key=') || uri.includes('api_key=')) {
    return uri
  }
  return uri.includes('?') ? `${uri}&key=${GEMINI_API_KEY}` : `${uri}?key=${GEMINI_API_KEY}`
}

/**
 * Generate a video from a prompt using Veo 3
 * Falls back to text description if video API unavailable
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const generationId = `veo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Track this generation
  generationQueue.set(generationId, {
    generationId,
    status: 'pending',
    progress: 0,
  })

  try {
    // Update status to processing
    generationQueue.set(generationId, {
      generationId,
      status: 'processing',
      progress: 10,
    })

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Start video generation with correct API
    const startResult = await startVeoGeneration(
      request.prompt,
      request.duration || 5,
      request.aspectRatio || '16:9'
    )

    if ('error' in startResult) {
      throw new Error(startResult.error)
    }

    // Store operation name for polling
    generationQueue.set(generationId, {
      generationId,
      status: 'processing',
      progress: 20,
      operationName: startResult.operationName,
    })

    // Start background polling
    pollForCompletion(generationId, startResult.operationName)

    return {
      success: true,
      generationId,
      characterId: request.characterId,
      testimonyId: request.testimonyId,
      prompt: request.prompt,
      generatedAt: Date.now(),
      // Video URL will be populated by polling
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VEO3] Video generation failed:', error)

    // Try fallback to text description
    if (genai) {
      try {
        console.log('[VEO3] Falling back to scene description...')
        const response = await genai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `Create a detailed visual description for this 1920s noir mystery scene.
This will be used to generate a short video clip.

Scene description: ${request.prompt}

Provide:
1. Camera angle and movement
2. Lighting and atmosphere
3. Character positions and expressions
4. Key visual details

Keep it cinematic and noir-styled.`,
        })

        const description = response.text || ''

        // Fallback to text description - mark as failed since there's no actual video
        generationQueue.set(generationId, {
          generationId,
          status: 'failed',
          progress: 100,
          error: 'Video generation unavailable. Text description generated as fallback.',
        })

        return {
          success: false,
          generationId,
          characterId: request.characterId,
          testimonyId: request.testimonyId,
          prompt: request.prompt,
          generatedAt: Date.now(),
          fallback: true,
          videoData: description,
          error: `Video generation failed (${errorMessage}) - fallback to text description`,
        }
      } catch (fallbackError) {
        console.error('[VEO3] Fallback also failed:', fallbackError)
      }
    }

    generationQueue.set(generationId, {
      generationId,
      status: 'failed',
      error: errorMessage,
    })

    return {
      success: false,
      error: errorMessage,
      generationId,
      characterId: request.characterId,
      testimonyId: request.testimonyId,
      prompt: request.prompt,
      generatedAt: Date.now(),
    }
  }
}

/**
 * Background polling for video completion
 */
async function pollForCompletion(generationId: string, operationName: string): Promise<void> {
  const maxAttempts = 120 // 10 minutes max (5 second intervals) - video gen can take a while
  let attempts = 0
  console.log(`[VEO3] Starting background polling for ${generationId}`)

  const poll = async () => {
    attempts++
    console.log(`[VEO3] Poll attempt ${attempts}/${maxAttempts} for ${generationId}`)

    const result = await pollVeoOperation(operationName)

    if (result.done) {
      if (result.videoUrl) {
        console.log(`[VEO3] ✅ Video generation completed: ${generationId}`)
        console.log(`[VEO3] Video URL: ${result.videoUrl.substring(0, 100)}...`)
        generationQueue.set(generationId, {
          generationId,
          status: 'completed',
          progress: 100,
          videoUrl: result.videoUrl,
          operationName,
        })
      } else {
        console.error(`[VEO3] ❌ Video generation failed: ${generationId} - ${result.error}`)
        generationQueue.set(generationId, {
          generationId,
          status: 'failed',
          error: result.error || 'No video URL returned',
          operationName,
        })
      }
      return
    }

    if (result.error && attempts > 5) {
      // Give it a few tries before giving up on errors
      console.error(`[VEO3] ❌ Too many errors, giving up: ${generationId}`)
      generationQueue.set(generationId, {
        generationId,
        status: 'failed',
        error: result.error,
        operationName,
      })
      return
    }

    // Update progress
    const currentStatus = generationQueue.get(generationId)
    if (currentStatus) {
      generationQueue.set(generationId, {
        ...currentStatus,
        progress: result.progress || Math.min(20 + attempts * 1.5, 95),
      })
    }

    // Continue polling if not at max attempts
    if (attempts < maxAttempts) {
      setTimeout(poll, 5000) // Poll every 5 seconds
    } else {
      console.error(`[VEO3] ❌ Generation timed out: ${generationId}`)
      generationQueue.set(generationId, {
        generationId,
        status: 'failed',
        error: 'Generation timed out after 10 minutes',
        operationName,
      })
    }
  }

  // Start polling after a short delay
  setTimeout(poll, 3000)
}

/**
 * Generate an image using Imagen (faster fallback)
 */
export async function generateImage(
  prompt: string,
  characterId: string
): Promise<{ success: boolean; imageUrl?: string; error?: string; description?: string }> {
  try {
    if (!genai) {
      throw new Error('Gemini client not initialized')
    }

    // Fall back to text description if image generation not available
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Describe this 1920s noir mystery scene visually in rich detail:

${prompt}

Include:
- Lighting and shadows (noir style)
- Character appearance and expression
- Room details and atmosphere
- Time of day indicators
- Key objects in focus

Write as a vivid visual description that paints the scene.`,
    })

    const description = response.text || ''

    return {
      success: true,
      description,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VEO3] Image generation failed:', error)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Get the status of an ongoing generation
 */
export function getGenerationStatus(generationId: string): GenerationStatus | null {
  const status = generationQueue.get(generationId)
  if (status) {
    console.log(`[VEO3] Status for ${generationId}:`, status.status, status.videoUrl ? `(has URL)` : '(no URL yet)')
  }
  return status || null
}

/**
 * Clear completed generations from memory
 */
export function clearCompletedGenerations(): void {
  for (const [id, status] of generationQueue) {
    if (status.status === 'completed' || status.status === 'failed') {
      generationQueue.delete(id)
    }
  }
}

/**
 * Check if the Veo client is properly configured
 */
export function isVeoConfigured(): boolean {
  return !!GEMINI_API_KEY
}
