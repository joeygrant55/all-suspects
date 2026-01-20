/**
 * Veo 3 Client for Video Generation
 *
 * Integrates with Google's Veo 3.1 API via REST to generate video clips
 * based on character testimony and scene descriptions.
 */

import { GoogleGenAI } from '@google/genai'

// Initialize the Gemini client for text generation (used for fallback)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
let genai: GoogleGenAI | null = null

// Veo 3 REST API configuration
const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const VEO_MODEL = 'veo-3.1-generate-preview'

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
 */
async function startVeoGeneration(
  prompt: string,
  aspectRatio: string = '16:9',
  resolution: string = '720p'
): Promise<{ operationName: string } | { error: string }> {
  const url = `${VEO_API_BASE}/models/${VEO_MODEL}:predictLongRunning`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio,
          resolution,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Veo API error:', response.status, errorData)
      return { error: errorData.error?.message || `API error: ${response.status}` }
    }

    const data = await response.json()

    // The response contains an operation name for polling
    if (data.name) {
      return { operationName: data.name }
    }

    return { error: 'No operation name in response' }
  } catch (err) {
    console.error('Veo request failed:', err)
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
  const url = `${VEO_API_BASE}/${operationName}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { done: false, error: errorData.error?.message || 'Poll failed' }
    }

    const data = await response.json()

    if (data.done) {
      // Extract video URL from response
      const videoUri =
        data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        data.response?.predictions?.[0]?.video?.uri

      if (videoUri) {
        // The URI may need the API key appended for access
        const videoUrl = videoUri.includes('?')
          ? `${videoUri}&key=${GEMINI_API_KEY}`
          : `${videoUri}?key=${GEMINI_API_KEY}`
        return { done: true, videoUrl }
      }

      // Check for error in completed response
      if (data.error) {
        return { done: true, error: data.error.message || 'Generation failed' }
      }

      return { done: true, error: 'No video in response' }
    }

    // Still processing - estimate progress from metadata if available
    const progress = data.metadata?.progress || 50
    return { done: false, progress }
  } catch (err) {
    console.error('Poll failed:', err)
    return { done: false, error: err instanceof Error ? err.message : 'Poll failed' }
  }
}

/**
 * Generate a video from a prompt using Veo 3
 * Falls back to image generation or placeholder if video API unavailable
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

    // Start video generation
    const startResult = await startVeoGeneration(
      request.prompt,
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
    console.error('Video generation failed:', error)

    // Try fallback to text description
    if (genai) {
      try {
        console.log('Falling back to scene description...')
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

        generationQueue.set(generationId, {
          generationId,
          status: 'completed',
          progress: 100,
        })

        return {
          success: true,
          generationId,
          characterId: request.characterId,
          testimonyId: request.testimonyId,
          prompt: request.prompt,
          generatedAt: Date.now(),
          fallback: true,
          videoData: description,
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
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
  const maxAttempts = 60 // 5 minutes max (5 second intervals)
  let attempts = 0

  const poll = async () => {
    attempts++

    const result = await pollVeoOperation(operationName)

    if (result.done) {
      if (result.videoUrl) {
        generationQueue.set(generationId, {
          generationId,
          status: 'completed',
          progress: 100,
          videoUrl: result.videoUrl,
          operationName,
        })
        console.log(`Video generation completed: ${generationId}`)
      } else {
        generationQueue.set(generationId, {
          generationId,
          status: 'failed',
          error: result.error || 'No video URL',
          operationName,
        })
        console.error(`Video generation failed: ${generationId} - ${result.error}`)
      }
      return
    }

    if (result.error && attempts > 3) {
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
        progress: result.progress || Math.min(20 + attempts * 2, 95),
      })
    }

    // Continue polling if not at max attempts
    if (attempts < maxAttempts) {
      setTimeout(poll, 5000) // Poll every 5 seconds
    } else {
      generationQueue.set(generationId, {
        generationId,
        status: 'failed',
        error: 'Generation timed out',
        operationName,
      })
    }
  }

  // Start polling
  setTimeout(poll, 5000)
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

    // Try to use Imagen for image generation
    // Fall back to text description if not available
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
    console.error('Image generation failed:', error)
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
  return generationQueue.get(generationId) || null
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
