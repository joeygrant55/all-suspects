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

// Lazy — dotenv may not have loaded yet at import time
function getGeminiKey() { return process.env.GEMINI_API_KEY || '' }

interface ArtAsset {
  id: string
  category: 'portrait' | 'room' | 'evidence' | 'ui'
  characterId?: string
  mood?: 'calm' | 'nervous' | 'breaking'
  prompt: string
  status: 'pending' | 'generating' | 'complete' | 'failed'
  path?: string
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
  const dirs = ['portraits', 'rooms', 'evidence', 'ui']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(outputDir, dir), { recursive: true })
  }

  // Start processing in background
  processQueue(state).catch(err => {
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

/**
 * Generate a single image using Gemini (Nano Banana Pro)
 */
async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: getGeminiKey() })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: prompt,
    config: {
      responseModalities: ['image', 'text'],
    },
  })

  // Extract image data from response
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) throw new Error('No response parts')

  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      fs.writeFileSync(outputPath, buffer)
      return
    }
  }

  throw new Error('No image data in response')
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
    default:
      return path.join(baseDir, `${asset.id}.png`)
  }
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
