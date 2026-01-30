/**
 * fal.ai Video Generation Client
 * 
 * Supports Kling 1.6 and Minimax Hailuo for video generation.
 * Used as fallback when Veo3 is rate-limited or unavailable.
 */

import * as fs from 'fs'
import * as path from 'path'

const FAL_KEY = process.env.FAL_KEY || ''
const FAL_API_BASE = 'https://queue.fal.run'

// Video output directory
const VIDEO_DIR = path.join(process.cwd(), 'public', 'videos', 'generated')

export type FalModel = 'kling-1.6' | 'minimax-hailuo' | 'wan-2.1'

interface FalModelConfig {
  endpoint: string
  name: string
  maxDuration: number
  supportsImageToVideo: boolean
}

const MODEL_CONFIGS: Record<FalModel, FalModelConfig> = {
  'kling-1.6': {
    endpoint: 'fal-ai/kling-video/v1.6/standard/text-to-video',
    name: 'Kling 1.6',
    maxDuration: 10,
    supportsImageToVideo: true,
  },
  'minimax-hailuo': {
    endpoint: 'fal-ai/minimax-video/video-01/text-to-video',
    name: 'Minimax Hailuo',
    maxDuration: 6,
    supportsImageToVideo: true,
  },
  'wan-2.1': {
    endpoint: 'fal-ai/wan/v2.1/text-to-video',
    name: 'Wan 2.1',
    maxDuration: 5,
    supportsImageToVideo: false,
  },
}

/**
 * Extract the base model ID from a full endpoint path.
 * fal.ai queue API uses the full path for submit but ONLY the model_id for status/result.
 * e.g. "fal-ai/kling-video/v1.6/standard/text-to-video" → "fal-ai/kling-video"
 */
function getModelId(endpoint: string): string {
  // Model ID is namespace/model-name (first two segments)
  const parts = endpoint.split('/')
  return parts.slice(0, 2).join('/')
}

export interface FalVideoRequest {
  prompt: string
  duration?: number // seconds
  aspectRatio?: '16:9' | '9:16' | '1:1'
  imageUrl?: string // For image-to-video
  model?: FalModel
  negativePrompt?: string
}

export interface FalVideoResult {
  success: boolean
  videoUrl?: string
  error?: string
  model: string
  requestId?: string
  durationMs?: number
}

/**
 * Submit a video generation request to fal.ai queue
 */
async function submitToQueue(model: FalModel, payload: Record<string, unknown>): Promise<{ requestId: string } | { error: string }> {
  const config = MODEL_CONFIGS[model]
  const url = `${FAL_API_BASE}/${config.endpoint}`

  console.log(`[FAL] Submitting to ${config.name}: ${url}`)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[FAL] Submit failed (${res.status}):`, errText)
      return { error: `${config.name} submit failed: ${res.status} — ${errText.slice(0, 200)}` }
    }

    const data = await res.json() as { request_id?: string; status_url?: string }
    const requestId = data.request_id
    if (!requestId) {
      return { error: `${config.name} returned no request_id` }
    }

    console.log(`[FAL] ✅ Queued ${config.name}: ${requestId}`)
    return { requestId }
  } catch (err) {
    return { error: `${config.name} network error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Poll a fal.ai queue request until complete
 */
async function pollQueue(model: FalModel, requestId: string, maxWaitMs: number = 300000): Promise<FalVideoResult> {
  const config = MODEL_CONFIGS[model]
  const modelId = getModelId(config.endpoint)
  const statusUrl = `${FAL_API_BASE}/${modelId}/requests/${requestId}/status`
  const resultUrl = `${FAL_API_BASE}/${modelId}/requests/${requestId}`
  const startTime = Date.now()
  const pollInterval = 5000

  console.log(`[FAL] Polling ${config.name} request ${requestId}...`)

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(statusUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      })

      if (!res.ok) {
        console.warn(`[FAL] Poll status ${res.status}`)
        await sleep(pollInterval)
        continue
      }

      const status = await res.json() as { status: string }

      if (status.status === 'COMPLETED') {
        // Fetch the result
        const resultRes = await fetch(resultUrl, {
          headers: { 'Authorization': `Key ${FAL_KEY}` },
        })

        if (!resultRes.ok) {
          return { success: false, error: `Failed to fetch result: ${resultRes.status}`, model: config.name }
        }

        const result = await resultRes.json() as { video?: { url: string }; video_url?: string }
        const videoUrl = result.video?.url || result.video_url

        if (!videoUrl) {
          console.error('[FAL] No video URL in result:', JSON.stringify(result).slice(0, 500))
          return { success: false, error: 'No video URL in response', model: config.name }
        }

        const elapsed = Date.now() - startTime
        console.log(`[FAL] ✅ ${config.name} completed in ${(elapsed / 1000).toFixed(1)}s`)

        return {
          success: true,
          videoUrl,
          model: config.name,
          requestId,
          durationMs: elapsed,
        }
      }

      if (status.status === 'FAILED') {
        return { success: false, error: `${config.name} generation failed`, model: config.name, requestId }
      }

      // IN_QUEUE or IN_PROGRESS
      await sleep(pollInterval)
    } catch (err) {
      console.warn(`[FAL] Poll error:`, err)
      await sleep(pollInterval)
    }
  }

  return { success: false, error: `${config.name} timed out after ${maxWaitMs / 1000}s`, model: config.name, requestId }
}

/**
 * Download video to local storage
 */
async function downloadVideo(url: string, filename: string): Promise<string | null> {
  try {
    fs.mkdirSync(VIDEO_DIR, { recursive: true })
    const filepath = path.join(VIDEO_DIR, filename)

    console.log(`[FAL] Downloading video to ${filepath}...`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[FAL] Download failed: ${res.status}`)
      return null
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filepath, buffer)
    console.log(`[FAL] ✅ Downloaded: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`)

    return `/videos/generated/${filename}`
  } catch (err) {
    console.error(`[FAL] Download error:`, err)
    return null
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate a video using fal.ai models with cascading fallback:
 * Kling 1.6 → Minimax Hailuo → Wan 2.1
 */
export async function generateFalVideo(request: FalVideoRequest): Promise<FalVideoResult> {
  if (!FAL_KEY) {
    return { success: false, error: 'FAL_KEY not configured', model: 'none' }
  }

  const models: FalModel[] = request.model
    ? [request.model]
    : ['kling-1.6', 'minimax-hailuo', 'wan-2.1']

  for (const model of models) {
    console.log(`[FAL] Trying ${MODEL_CONFIGS[model].name}...`)

    const config = MODEL_CONFIGS[model]
    const duration = Math.min(request.duration || 5, config.maxDuration)

    // Build payload — varies by model
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      duration: `${duration}`,
      aspect_ratio: request.aspectRatio || '16:9',
    }

    if (request.negativePrompt) {
      payload.negative_prompt = request.negativePrompt
    }

    // Image-to-video if supported and provided
    if (request.imageUrl && config.supportsImageToVideo) {
      payload.image_url = request.imageUrl
    }

    const submitResult = await submitToQueue(model, payload)
    if ('error' in submitResult) {
      console.warn(`[FAL] ${config.name} failed to submit: ${submitResult.error}`)
      continue // Try next model
    }

    const result = await pollQueue(model, submitResult.requestId)

    if (result.success && result.videoUrl) {
      // Download locally
      const filename = `fal-${model}-${Date.now()}.mp4`
      const localUrl = await downloadVideo(result.videoUrl, filename)
      if (localUrl) {
        result.videoUrl = localUrl
      }
      return result
    }

    console.warn(`[FAL] ${config.name} failed: ${result.error}`)
    // Continue to next model
  }

  return { success: false, error: 'All fal.ai models failed', model: 'fallback-exhausted' }
}

/**
 * Generate video from an image (image-to-video)
 * Great for animating generated room/portrait images
 */
export async function generateImageToVideo(
  imageUrl: string,
  prompt: string,
  model: FalModel = 'kling-1.6'
): Promise<FalVideoResult> {
  return generateFalVideo({
    prompt,
    imageUrl,
    model,
    duration: 5,
    aspectRatio: '16:9',
  })
}

/**
 * Check if fal.ai is configured
 */
export function isFalConfigured(): boolean {
  return !!FAL_KEY
}
