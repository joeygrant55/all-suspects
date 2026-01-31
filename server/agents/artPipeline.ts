/**
 * Art Pipeline Agent
 * 
 * Progressive art generation for dynamically created mysteries.
 * Implements Option C: Start game immediately, generate art in background.
 * 
 * Priority order (what players see first):
 * 1. Title/case board backgrounds (player sees these during intro)
 * 2. First 2-3 character portraits (calm only — they're on the case board)
 * 3. Room backgrounds (generated as player explores)
 * 4. Evidence art (generated as player discovers items)
 * 5. Remaining portraits + mood variants (nervous/breaking)
 * 
 * Each asset is served as soon as it's ready — no waiting for the full set.
 */

import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'
import type { MysteryBlueprint } from '../../shared/types/MysteryBlueprint'
import { generateArtPrompts } from './mysteryGenerator'
import { generateImageToVideo, isFalConfigured } from '../video/falClient'
import { generateVideo as generateVeoVideo, getGenerationStatus } from '../video/veoClient'

// Lazy — dotenv may not have loaded yet at import time
function getGeminiKey() { return process.env.GEMINI_API_KEY || '' }

interface ArtAsset {
  id: string
  category: 'portrait' | 'room' | 'evidence' | 'ui' | 'video'
  characterId?: string
  mood?: 'calm' | 'nervous' | 'breaking'
  prompt: string
  status: 'pending' | 'generating' | 'complete' | 'failed'
  path?: string
  sourceImage?: string // For image-to-video: path to the source image
  priority: number // Lower = higher priority
}

interface PipelineState {
  mysteryId: string
  assets: ArtAsset[]
  outputDir: string
  onAssetReady?: (asset: ArtAsset) => void
}

/**
 * Start the art pipeline for a mystery
 * Returns immediately — assets generate in background
 */
export function startArtPipeline(
  blueprint: MysteryBlueprint,
  outputDir: string,
  onAssetReady?: (asset: ArtAsset) => void
): PipelineState {
  const prompts = generateArtPrompts(blueprint)
  const assets: ArtAsset[] = []
  let priority = 0

  // Priority 1: UI backgrounds (seen during intro)
  assets.push({
    id: 'title-screen',
    category: 'ui',
    prompt: prompts.titleScreen,
    status: 'pending',
    priority: priority++,
  })
  assets.push({
    id: 'case-board',
    category: 'ui',
    prompt: prompts.caseBoard,
    status: 'pending',
    priority: priority++,
  })

  // Priority 2: Character portraits (calm) — visible on case board
  for (const char of blueprint.characters) {
    if (prompts.portraits[char.id]) {
      assets.push({
        id: `portrait-${char.id}-calm`,
        category: 'portrait',
        characterId: char.id,
        mood: 'calm',
        prompt: prompts.portraits[char.id].calm,
        status: 'pending',
        priority: priority++,
      })
    }
  }

  // Priority 3: Room backgrounds — visible when exploring
  for (const loc of blueprint.locations) {
    if (prompts.rooms[loc.id]) {
      assets.push({
        id: `room-${loc.id}`,
        category: 'room',
        prompt: prompts.rooms[loc.id],
        status: 'pending',
        priority: priority++,
      })
    }
  }

  // Priority 4: Evidence art — visible when examining items
  for (const ev of blueprint.evidence) {
    if (prompts.evidence[ev.id]) {
      assets.push({
        id: `evidence-${ev.id}`,
        category: 'evidence',
        prompt: prompts.evidence[ev.id],
        status: 'pending',
        priority: priority++,
      })
    }
  }

  // Priority 5: Mood variants (nervous + breaking) — visible during interrogation
  for (const char of blueprint.characters) {
    if (prompts.portraits[char.id]) {
      assets.push({
        id: `portrait-${char.id}-nervous`,
        category: 'portrait',
        characterId: char.id,
        mood: 'nervous',
        prompt: prompts.portraits[char.id].nervous,
        status: 'pending',
        priority: priority++,
      })
      assets.push({
        id: `portrait-${char.id}-breaking`,
        category: 'portrait',
        characterId: char.id,
        mood: 'breaking',
        prompt: prompts.portraits[char.id].breaking,
        status: 'pending',
        priority: priority++,
      })
    }
  }

  const state: PipelineState = {
    mysteryId: blueprint.id,
    assets,
    outputDir,
    onAssetReady,
  }

  // Ensure output directories exist
  const dirs = ['portraits', 'rooms', 'evidence', 'ui', 'videos']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(outputDir, dir), { recursive: true })
  }

  // Start processing in background — Phase 1 (images), then Phase 2 (videos)
  processQueue(state).then(() => {
    startVideoPhase(state, blueprint)
  }).catch(err => {
    console.error('[ArtPipeline] Fatal error:', err)
  })

  return state
}

/**
 * Process the asset queue sequentially (respecting rate limits)
 */
async function processQueue(state: PipelineState): Promise<void> {
  // Sort by priority
  const queue = state.assets.filter(a => a.status === 'pending').sort((a, b) => a.priority - b.priority)

  console.log(`[ArtPipeline] Starting generation of ${queue.length} assets for mystery ${state.mysteryId}`)

  for (const asset of queue) {
    try {
      asset.status = 'generating'
      console.log(`[ArtPipeline] Generating ${asset.id} (priority ${asset.priority})...`)

      const outputPath = getOutputPath(state.outputDir, asset)
      await generateImage(asset.prompt, outputPath)

      asset.status = 'complete'
      asset.path = outputPath
      console.log(`[ArtPipeline] ✅ ${asset.id} → ${outputPath}`)

      // Notify listener
      if (state.onAssetReady) {
        state.onAssetReady(asset)
      }

      // Rate limit: wait between generations to avoid API throttling
      await sleep(2000)
    } catch (err) {
      asset.status = 'failed'
      console.error(`[ArtPipeline] ❌ ${asset.id} failed:`, err)
      // Continue with next asset — don't block the pipeline
    }
  }

  console.log(`[ArtPipeline] Pipeline complete. ${state.assets.filter(a => a.status === 'complete').length}/${state.assets.length} assets generated.`)
}

// Best → fastest fallback. Gemini 3 Pro Image is highest quality, 2.5 Flash is fast fallback.
const IMAGE_MODELS = [
  'gemini-3-pro-image-preview',   // Best quality (Nano Banana Pro)
  'gemini-2.5-flash-image',       // Fast + good quality (Nano Banana)
  'gemini-2.0-flash-exp-image-generation', // Legacy fallback
]

/**
 * Generate a single image using the best available Gemini image model
 */
async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: getGeminiKey() })

  let lastError: Error | null = null
  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ['image', 'text'],
        },
      })

      const parts = response.candidates?.[0]?.content?.parts
      if (!parts) throw new Error('No response parts')

      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64')
          fs.writeFileSync(outputPath, buffer)
          console.log(`[ArtPipeline] Used model: ${model}`)
          return
        }
      }
      throw new Error('No image data in response')
    } catch (err: any) {
      lastError = err
      console.log(`[ArtPipeline] Model ${model} failed, trying next...`)
      continue
    }
  }
  throw lastError || new Error('All image models failed')

}

/**
 * Get the output file path for an asset
 */
function getOutputPath(baseDir: string, asset: ArtAsset): string {
  switch (asset.category) {
    case 'portrait':
      return path.join(baseDir, 'portraits', `${asset.characterId}${asset.mood === 'calm' ? '' : `-${asset.mood}`}.png`)
    case 'room':
      return path.join(baseDir, 'rooms', `${asset.id.replace('room-', '')}.webp`)
    case 'evidence':
      return path.join(baseDir, 'evidence', `${asset.id.replace('evidence-', '')}.webp`)
    case 'ui':
      return path.join(baseDir, 'ui', `${asset.id}.png`)
    case 'video':
      return path.join(baseDir, 'videos', `${asset.id.replace('video-room-', '')}.mp4`)
    default:
      return path.join(baseDir, `${asset.id}.png`)
  }
}

/**
 * Phase 2: Generate atmosphere videos from completed room images
 * Takes each room's static image and creates a cinematic loop via image-to-video
 */
async function startVideoPhase(state: PipelineState, blueprint: MysteryBlueprint): Promise<void> {
  // DISABLED: Auto video generation turned off to save fal.ai credits
  // Videos will be generated on-demand when users actually enter rooms
  // This allows us to measure real demand through actual usage
  console.log('[ArtPipeline] ⏭️  Phase 2: Skipping auto video generation (on-demand only)')
  return

  // Original code below (kept for reference, but unreachable)
  if (!isFalConfigured()) {
    console.log('[ArtPipeline] Skipping video phase — FAL_KEY not configured')
    return
  }

  // Find completed room images
  const completedRooms = state.assets.filter(
    a => a.category === 'room' && a.status === 'complete' && a.path
  )

  if (completedRooms.length === 0) {
    console.log('[ArtPipeline] No room images to animate — skipping video phase')
    return
  }

  console.log(`[ArtPipeline] 🎬 Phase 2: Generating ${completedRooms.length} room atmosphere videos...`)

  for (const room of completedRooms) {
    const roomId = room.id.replace('room-', '')
    const videoAssetId = `video-room-${roomId}`

    // Skip if video already exists
    const videoPath = getOutputPath(state.outputDir, { id: videoAssetId, category: 'video', prompt: '', status: 'pending', priority: 0 })
    if (fs.existsSync(videoPath)) {
      console.log(`[ArtPipeline] 🎬 Video already exists for ${roomId}, skipping`)
      continue
    }

    // Find location data from blueprint
    const location = blueprint.locations.find(l => l.id === roomId)
    const locationName = location?.name || roomId.replace(/-/g, ' ')
    const locationDesc = location?.description || ''

    // Build cinematic prompt for the atmosphere loop
    const videoPrompt = `Slow cinematic camera movement through ${locationName}. ${locationDesc}. ` +
      `Subtle atmospheric details: flickering light, dust motes, gentle shadows moving. ` +
      `Mystery noir atmosphere, moody lighting. No people, empty room. ` +
      `Smooth slow pan or dolly movement. Cinematic 24fps look.`

    // Create the video asset tracker
    const videoAsset: ArtAsset = {
      id: videoAssetId,
      category: 'video',
      prompt: videoPrompt,
      sourceImage: room.path,
      status: 'generating',
      priority: 100 + state.assets.length,
    }
    state.assets.push(videoAsset)

    try {
      console.log(`[ArtPipeline] 🎬 Animating ${roomId}...`)

      // Try fal.ai first (best quality/speed)
      const imageUrl = room.path!

      let result = await generateImageToVideo(
        imageUrl,
        videoPrompt,
        'kling-1.6' // Best quality for room atmospheres
      )

      // If fal.ai failed (balance exhausted or other error), fall back to Veo 3
      if (!result.success || !result.videoUrl) {
        console.log(`[ArtPipeline] 🎬 fal.ai failed, falling back to Veo 3...`)
        
        try {
          const veoResult = await generateVeoVideo({
            prompt: videoPrompt,
            characterId: `room-${roomId}`,
            testimonyId: 'atmosphere',
            duration: 5,
            aspectRatio: '16:9',
          })

          if (veoResult.success && veoResult.generationId) {
            // Wait for Veo to complete
            console.log(`[ArtPipeline] 🎬 Veo generation started for ${roomId}, waiting for completion...`)
            const videoUrl = await waitForVeoCompletion(veoResult.generationId, 120000)
            
            if (videoUrl) {
              result = {
                success: true,
                videoUrl,
                model: 'veo-3',
                error: undefined,
              }
            } else {
              throw new Error('Veo generation timed out or failed')
            }
          } else {
            throw new Error(veoResult.error || 'Veo generation failed')
          }
        } catch (veoErr) {
          console.error(`[ArtPipeline] 🎬 ❌ Veo fallback also failed:`, veoErr)
          throw veoErr
        }
      }

      if (result.success && result.videoUrl) {
        // Copy/move from the fal download location to our asset dir
        const sourcePath = path.join(process.cwd(), 'public', result.videoUrl.replace(/^\//, ''))
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, videoPath)
          console.log(`[ArtPipeline] 🎬 ✅ Room video: ${roomId} → ${videoPath}`)
        } else {
          // Already at the right location or external URL
          videoAsset.path = result.videoUrl
        }

        videoAsset.status = 'complete'
        videoAsset.path = videoPath

        if (state.onAssetReady) {
          state.onAssetReady(videoAsset)
        }
      } else {
        videoAsset.status = 'failed'
        console.warn(`[ArtPipeline] 🎬 ❌ Room video failed for ${roomId}: ${result.error}`)
      }
    } catch (err) {
      videoAsset.status = 'failed'
      console.error(`[ArtPipeline] 🎬 ❌ Room video error for ${roomId}:`, err)
    }

    // Rate limit between video generations
    await sleep(3000)
  }

  const videoAssets = state.assets.filter(a => a.category === 'video')
  const completed = videoAssets.filter(a => a.status === 'complete').length
  console.log(`[ArtPipeline] 🎬 Video phase complete: ${completed}/${videoAssets.length} room videos generated`)
}

/**
 * Get current pipeline status (for progress UI)
 */
export function getPipelineStatus(state: PipelineState) {
  const total = state.assets.length
  const complete = state.assets.filter(a => a.status === 'complete').length
  const failed = state.assets.filter(a => a.status === 'failed').length
  const generating = state.assets.find(a => a.status === 'generating')

  return {
    mysteryId: state.mysteryId,
    total,
    complete,
    failed,
    progress: Math.round((complete / total) * 100),
    currentlyGenerating: generating?.id || null,
    assets: state.assets.map(a => ({
      id: a.id,
      category: a.category,
      status: a.status,
      path: a.path,
    })),
  }
}

/**
 * Check if a specific asset is ready
 */
export function isAssetReady(state: PipelineState, assetId: string): boolean {
  const asset = state.assets.find(a => a.id === assetId)
  return asset?.status === 'complete'
}

/**
 * Get the path for a ready asset, or null if not yet generated
 */
export function getAssetPath(state: PipelineState, assetId: string): string | null {
  const asset = state.assets.find(a => a.id === assetId)
  return asset?.status === 'complete' ? asset.path || null : null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait for Veo generation to complete (with timeout)
 */
async function waitForVeoCompletion(generationId: string, maxWaitMs: number = 120000): Promise<string | null> {
  const startTime = Date.now()
  const pollInterval = 5000

  while (Date.now() - startTime < maxWaitMs) {
    const status = getGenerationStatus(generationId)
    
    if (!status) {
      console.warn(`[ArtPipeline] Veo generation ${generationId} not found`)
      return null
    }

    if (status.status === 'completed' && status.videoUrl) {
      console.log(`[ArtPipeline] ✅ Veo completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      return status.videoUrl
    }

    if (status.status === 'failed') {
      console.error(`[ArtPipeline] Veo generation failed: ${status.error}`)
      return null
    }

    // Still processing
    await sleep(pollInterval)
  }

  console.warn(`[ArtPipeline] Veo generation timed out after ${maxWaitMs / 1000}s`)
  return null
}
