/**
 * Mystery Generation API
 * 
 * Endpoints for the infinite mystery system:
 * 
 * POST /api/mystery/generate — Start generating a new mystery
 *   Body: { era?, setting?, difficulty?, theme?, suspectCount?, playerHint? }
 *   Returns: { mysteryId, blueprint } (immediate — blueprint generates in ~5s)
 *
 * GET /api/mystery/:id/status — Check art pipeline progress
 *   Returns: { progress, assets: [...], currentlyGenerating }
 *
 * GET /api/mystery/:id/asset/:assetId — Get a generated asset
 *   Returns: image file if ready, 404 if not yet generated
 *
 * GET /api/mystery/:id/blueprint — Get the mystery blueprint
 *   Returns: MysteryBlueprint JSON
 */

import { Router } from 'express'
import * as path from 'path'
import * as fs from 'fs'
import { generateMystery, type MysteryRequest } from './mysteryGenerator'
import { startArtPipeline, getPipelineStatus, type GeneratedAssets } from './artPipeline'
import { talkToCharacter, getGreeting, resetSession, getSessionSummary } from './universalCharacterAgent'

const router = Router()

// In-memory store for active mysteries (in production, use a database)
const activeMysteries: Map<string, {
  blueprint: any
  pipeline: any
  createdAt: number
}> = new Map()

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated')

/**
 * POST /api/mystery/generate
 * Generate a new mystery — returns blueprint immediately, art generates in background
 */
router.post('/generate', async (req, res) => {
  try {
    const request: MysteryRequest = req.body || {}
    
    console.log('[MysteryAPI] Generating new mystery:', request)
    const startTime = Date.now()

    // Phase 1: Generate blueprint (fast — ~5-10 seconds)
    const blueprint = await generateMystery(request)
    const blueprintTime = Date.now() - startTime
    console.log(`[MysteryAPI] Blueprint generated in ${blueprintTime}ms: "${blueprint.title}"`)

    // Save blueprint
    const mysteryDir = path.join(GENERATED_DIR, blueprint.id)
    fs.mkdirSync(mysteryDir, { recursive: true })
    fs.writeFileSync(
      path.join(mysteryDir, 'blueprint.json'),
      JSON.stringify(blueprint, null, 2)
    )

    // Phase 2: Start art pipeline in background (Option C — progressive loading)
    const assetDir = path.join(mysteryDir, 'assets')
    const pipeline = startArtPipeline(blueprint, assetDir, (asset) => {
      console.log(`[MysteryAPI] Asset ready: ${asset.id}`)
    })

    // Store reference
    activeMysteries.set(blueprint.id, {
      blueprint,
      pipeline,
      createdAt: Date.now(),
    })

    // Return blueprint immediately — client starts the game now
    res.json({
      mysteryId: blueprint.id,
      blueprint,
      artStatus: {
        total: pipeline.assets.length,
        message: 'Art generation started — assets will load progressively',
      },
    })
  } catch (err: any) {
    console.error('[MysteryAPI] Generation failed:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/mystery/:id/status
 * Check art generation progress
 */
router.get('/:id/status', (req, res) => {
  const mystery = activeMysteries.get(req.params.id)
  if (!mystery) {
    return res.status(404).json({ error: 'Mystery not found' })
  }

  res.json(getPipelineStatus(mystery.pipeline))
})

/**
 * GET /api/mystery/:id/blueprint
 * Get the mystery blueprint
 */
router.get('/:id/blueprint', (req, res) => {
  const mystery = activeMysteries.get(req.params.id)
  if (!mystery) {
    // Try loading from disk
    const blueprintPath = path.join(GENERATED_DIR, req.params.id, 'blueprint.json')
    if (fs.existsSync(blueprintPath)) {
      return res.json(JSON.parse(fs.readFileSync(blueprintPath, 'utf-8')))
    }
    return res.status(404).json({ error: 'Mystery not found' })
  }

  res.json(mystery.blueprint)
})

/**
 * GET /api/mystery/:id/asset/:category/:filename
 * Serve a generated asset (returns placeholder if not yet ready)
 */
router.get('/:id/asset/:category/:filename', (req, res) => {
  const { id, category, filename } = req.params
  const assetPath = path.join(GENERATED_DIR, id, 'assets', category, filename)

  if (fs.existsSync(assetPath)) {
    return res.sendFile(assetPath)
  }

  // Asset not yet generated — return 202 (Accepted, still processing)
  res.status(202).json({
    status: 'generating',
    message: 'Asset is being generated. Try again shortly.',
  })
})

/**
 * GET /api/mystery/list
 * List available generated mysteries
 */
router.get('/list', (_req, res) => {
  const mysteries: any[] = []

  if (fs.existsSync(GENERATED_DIR)) {
    const dirs = fs.readdirSync(GENERATED_DIR, { withFileTypes: true })
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const blueprintPath = path.join(GENERATED_DIR, dir.name, 'blueprint.json')
        const portraitsDir = path.join(GENERATED_DIR, dir.name, 'assets', 'portraits')
        if (fs.existsSync(blueprintPath)) {
          // Only list mysteries that have at least some portrait art
          const hasPortraits = fs.existsSync(portraitsDir) && 
            fs.readdirSync(portraitsDir).filter(f => f.endsWith('.png')).length > 0
          if (!hasPortraits) continue

          try {
            const bp = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'))
            mysteries.push({
              id: bp.id || dir.name,
              title: bp.title,
              subtitle: bp.subtitle,
              era: bp.era,
              difficulty: bp.difficulty,
              setting: bp.setting?.location,
            })
          } catch {
            // Skip invalid blueprints
          }
        }
      }
    }
  }

  res.json(mysteries)
})

// ─── Interrogation / Chat Routes ───

/**
 * Helper to load a blueprint by mystery ID
 */
function loadBlueprint(mysteryId: string): any | null {
  const mystery = activeMysteries.get(mysteryId)
  if (mystery) return mystery.blueprint

  const blueprintPath = path.join(GENERATED_DIR, mysteryId, 'blueprint.json')
  if (fs.existsSync(blueprintPath)) {
    return JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'))
  }
  return null
}

/**
 * POST /api/mystery/:id/chat
 * Talk to a character in a mystery
 * Body: { characterId, message, evidenceId? }
 */
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params
    const { characterId, message, evidenceId } = req.body

    if (!characterId || !message) {
      return res.status(400).json({ error: 'characterId and message are required' })
    }

    const blueprint = loadBlueprint(id)
    if (!blueprint) {
      return res.status(404).json({ error: 'Mystery not found' })
    }

    console.log(`[MysteryAPI] Chat: ${characterId} in mystery ${id}`)
    const response = await talkToCharacter(id, blueprint, characterId, message, evidenceId)
    res.json(response)
  } catch (err: any) {
    console.error('[MysteryAPI] Chat error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/mystery/:id/character/:characterId/greeting
 * Get a character's initial greeting
 */
router.get('/:id/character/:characterId/greeting', async (req, res) => {
  try {
    const { id, characterId } = req.params
    const blueprint = loadBlueprint(id)
    if (!blueprint) return res.status(404).json({ error: 'Mystery not found' })

    const response = await getGreeting(id, blueprint, characterId)
    res.json(response)
  } catch (err: any) {
    console.error('[MysteryAPI] Greeting error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/mystery/:id/investigation
 * Get investigation progress summary
 */
router.get('/:id/investigation', (req, res) => {
  const summary = getSessionSummary(req.params.id)
  res.json(summary)
})

/**
 * POST /api/mystery/:id/reset
 * Reset all character conversations for a mystery
 */
router.post('/:id/reset', (req, res) => {
  resetSession(req.params.id)
  res.json({ ok: true })
})

export default router
