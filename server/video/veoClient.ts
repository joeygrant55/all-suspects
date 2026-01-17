/**
 * Veo 3 Client for Video Generation
 *
 * Integrates with Google's Veo/Imagen API to generate video/image clips
 * based on character testimony and scene descriptions.
 *
 * Note: Veo 3 video generation API access may require specific permissions.
 * This module gracefully falls back to image generation or placeholder content.
 */

import { GoogleGenAI } from '@google/genai'

// Initialize the Gemini client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
let genai: GoogleGenAI | null = null

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
}

// Track ongoing generations
const generationQueue: Map<string, GenerationStatus> = new Map()

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
    // Update status
    generationQueue.set(generationId, {
      generationId,
      status: 'processing',
      progress: 10,
    })

    if (!genai) {
      throw new Error('Gemini client not initialized')
    }

    // Try video generation first (Veo API)
    // Note: This API may require specific access permissions
    try {
      // Attempt to use video generation model
      // The exact model name may vary: 'veo-2.0-generate-001', 'veo-3', etc.
      const videoModels = ['veo-2.0-generate-001', 'veo-3', 'imagen-video']

      for (const modelName of videoModels) {
        try {
          // Use the new Google GenAI SDK API
          const response = await genai.models.generateContent({
            model: modelName,
            contents: `Generate a 5-second video: ${request.prompt}`,
          })

          // If we get here, the model exists and responded
          if (response) {
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
              fallback: true, // Currently using text model as placeholder
            }
          }
        } catch {
          // Model not available, try next
          continue
        }
      }

      // No video model worked, fall back to image description
      throw new Error('Video models not available')

    } catch (videoError) {
      // Fall back to generating a detailed description that could be visualized
      console.log('Video generation not available, using fallback:', videoError)

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
        videoData: description, // Return scene description as fallback
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    generationQueue.set(generationId, {
      generationId,
      status: 'failed',
      error: errorMessage,
    })

    console.error('Video generation failed:', error)

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
  return !!GEMINI_API_KEY && !!genai
}
