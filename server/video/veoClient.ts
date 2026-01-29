/**
 * Veo 3 Client for Video Generation
 *
 * Integrates with Google's Veo 3 API via the official SDK to generate video clips
 * based on character testimony and scene descriptions.
 */

import { GoogleGenAI } from '@google/genai'
import type { GenerateVideosOperation } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'

// Initialize the GenAI client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
let genai: GoogleGenAI | null = null

// Veo 3 model name (from SDK examples)
const VEO_MODEL = 'veo-2.0-generate-001'

try {
  if (GEMINI_API_KEY) {
    genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  }
} catch (e) {
  console.warn('Failed to initialize GenAI client:', e)
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
  operation?: GenerateVideosOperation
}

// Track ongoing generations
const generationQueue: Map<string, GenerationStatus> = new Map()

/**
 * Start video generation using Veo 3 SDK
 * Uses the dedicated generateVideos API
 */
async function startVeoGeneration(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = '16:9'
): Promise<{ operation: GenerateVideosOperation } | { error: string }> {
  if (!genai) {
    return { error: 'GenAI client not initialized' }
  }

  console.log('[VEO3] Starting video generation with', VEO_MODEL, '...')
  console.log('[VEO3] Prompt:', prompt.substring(0, 100) + '...')

  try {
    const operation = await genai.models.generateVideos({
      model: VEO_MODEL,
      source: {
        prompt: prompt,
      },
      config: {
        numberOfVideos: 1,
        durationSeconds: duration,
        aspectRatio: aspectRatio,
      },
    })

    if (operation.name) {
      console.log('[VEO3] Got operation name:', operation.name)
    }

    return { operation }
  } catch (err) {
    console.error('[VEO3] Request failed:', err)
    return { error: err instanceof Error ? err.message : 'Request failed' }
  }
}

/**
 * Poll for video generation completion
 */
async function pollVeoOperation(operation: GenerateVideosOperation): Promise<{
  done: boolean
  videoUrl?: string
  error?: string
  progress?: number
}> {
  if (!genai) {
    return { done: false, error: 'GenAI client not initialized' }
  }

  try {
    console.log('[VEO3] Polling operation:', operation.name)
    
    const updatedOperation = await genai.operations.getVideosOperation({ operation })

    if (updatedOperation.done) {
      // Extract video URL from response
      const videoUri = updatedOperation.response?.generatedVideos?.[0]?.video?.uri
      
      if (videoUri) {
        console.log('[VEO3] Video ready:', videoUri.substring(0, 100))
        // Append API key to video URL if needed
        const videoUrl = appendApiKey(videoUri)
        return { done: true, videoUrl }
      }

      // Check for error in completed operation
      if (updatedOperation.error) {
        const errorMsg = typeof updatedOperation.error === 'object' && 'message' in updatedOperation.error
          ? String(updatedOperation.error.message)
          : 'Generation failed'
        return { done: true, error: errorMsg }
      }

      console.error('[VEO3] No video URI found. Response:', JSON.stringify(updatedOperation.response, null, 2).substring(0, 1000))
      return { done: true, error: 'No video in response' }
    }

    // Still processing - estimate progress from metadata if available
    const progress = updatedOperation.metadata?.progress 
      ? (typeof updatedOperation.metadata.progress === 'number' ? updatedOperation.metadata.progress : 50)
      : 50
    return { done: false, progress }
  } catch (err) {
    console.error('[VEO3] Poll failed:', err)
    return { done: false, error: err instanceof Error ? err.message : 'Poll failed' }
  }
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

    // Store operation for polling
    generationQueue.set(generationId, {
      generationId,
      status: 'processing',
      progress: 20,
      operation: startResult.operation,
    })

    // Start background polling
    pollForCompletion(generationId, startResult.operation)

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
// Directory for downloaded videos
const VIDEO_DIR = path.join(process.cwd(), 'public', 'videos', 'generated')

/**
 * Download a video from Google's temporary URL to local storage
 */
async function downloadVideoLocally(url: string, generationId: string): Promise<string | null> {
  try {
    // Ensure directory exists
    fs.mkdirSync(VIDEO_DIR, { recursive: true })
    
    const filename = `${generationId}.mp4`
    const filepath = path.join(VIDEO_DIR, filename)
    
    console.log(`[VEO3] Downloading video to ${filepath}...`)
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[VEO3] Download failed: ${response.status}`)
      return null
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filepath, buffer)
    console.log(`[VEO3] ✅ Video downloaded: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`)
    
    // Return local URL that the frontend can access
    return `/videos/generated/${filename}`
  } catch (err) {
    console.error(`[VEO3] Download error:`, err)
    return null
  }
}

async function pollForCompletion(generationId: string, operation: GenerateVideosOperation): Promise<void> {
  const maxAttempts = 120 // 10 minutes max (5 second intervals) - video gen can take a while
  let attempts = 0
  console.log(`[VEO3] Starting background polling for ${generationId}`)

  const poll = async () => {
    attempts++
    console.log(`[VEO3] Poll attempt ${attempts}/${maxAttempts} for ${generationId}`)

    const result = await pollVeoOperation(operation)

    if (result.done) {
      if (result.videoUrl) {
        console.log(`[VEO3] ✅ Video generation completed: ${generationId}`)
        console.log(`[VEO3] Video URL: ${result.videoUrl.substring(0, 100)}...`)
        
        // Download the video locally (Google URLs expire!)
        const localUrl = await downloadVideoLocally(result.videoUrl, generationId)
        const finalUrl = localUrl || result.videoUrl
        
        generationQueue.set(generationId, {
          generationId,
          status: 'completed',
          progress: 100,
          videoUrl: finalUrl,
          operation,
        })
      } else {
        console.error(`[VEO3] ❌ Video generation failed: ${generationId} - ${result.error}`)
        generationQueue.set(generationId, {
          generationId,
          status: 'failed',
          error: result.error || 'No video URL returned',
          operation,
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
        operation,
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
        operation,
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

// Maps characterId → generationId for pre-generated intro videos
const pregenMap = new Map<string, string>()

/**
 * Find a completed pre-generated video for a character.
 * Returns the video URL if ready, 'pending' if still generating, or null if not found.
 */
export function findPregenVideo(characterId: string): string | 'pending' | null {
  const genId = pregenMap.get(characterId)
  if (!genId) return null
  const status = generationQueue.get(genId)
  if (!status) return null
  if (status.status === 'completed' && status.videoUrl) return status.videoUrl
  if (status.status === 'processing' || status.status === 'pending') return 'pending'
  return null
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

/**
 * Pre-generate introduction videos for all characters on server startup
 * This ensures the first interaction with each character is smooth
 */
export async function pregenerateIntroductions(): Promise<void> {
  console.log('[VEO3] Starting pre-generation of character introduction videos...')

  // Character IDs from the game (excluding edmund as he's deceased)
  const characterIds = ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james']

  // Import the prompt builder (avoid circular dependency)
  const { buildIntroductionPrompt } = await import('./promptBuilder')
  const { generateCacheKey, getCachedVideo, cacheVideo } = await import('./videoCache')

  let generated = 0
  let cached = 0
  let failed = 0

  for (const characterId of characterIds) {
    try {
      // Build the introduction prompt
      const videoPrompt = buildIntroductionPrompt(characterId)

      // Check if already cached
      const cacheKey = generateCacheKey(characterId, videoPrompt.fullPrompt, 'introduction')
      const cachedVideo = getCachedVideo(cacheKey)

      if (cachedVideo && cachedVideo.videoUrl) {
        console.log(`[VEO3] ✓ Introduction for ${characterId} already cached`)
        cached++
        continue
      }

      console.log(`[VEO3] → Generating introduction for ${characterId}...`)

      // Stagger requests to avoid rate limits (wait 10s between each)
      if (generated > 0 || cached > 0) {
        console.log(`[VEO3] Waiting 10s before next generation to avoid rate limits...`)
        await new Promise(resolve => setTimeout(resolve, 10000))
      }

      // Generate the video
      const result = await generateVideo({
        prompt: videoPrompt.fullPrompt,
        characterId,
        testimonyId: `intro-${characterId}`,
        duration: videoPrompt.duration,
        aspectRatio: videoPrompt.aspectRatio,
      })

      // Track pre-gen mapping so the API can find it later
      if (result.generationId) {
        pregenMap.set(characterId, result.generationId)
      }

      if (result.success && result.videoUrl) {
        // Cache the result
        cacheVideo(cacheKey, {
          characterId,
          testimonyId: `intro-${characterId}`,
          videoUrl: result.videoUrl,
          prompt: result.prompt,
          createdAt: result.generatedAt,
          type: 'introduction',
        })
        console.log(`[VEO3] ✓ Generated introduction for ${characterId}`)
        generated++
      } else if (result.generationId) {
        // Video is being generated in background
        console.log(`[VEO3] ⏳ Background generation started for ${characterId} (ID: ${result.generationId})`)
        generated++
      } else {
        console.warn(`[VEO3] ⚠ Failed to generate introduction for ${characterId}: ${result.error}`)
        failed++
      }
    } catch (error) {
      console.error(`[VEO3] ❌ Error generating introduction for ${characterId}:`, error)
      failed++
      // Continue with next character - don't let one failure stop the whole process
    }
  }

  console.log(`[VEO3] Pre-generation complete: ${generated} generated, ${cached} cached, ${failed} failed`)
}
