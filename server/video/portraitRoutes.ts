/**
 * Portrait Video API Routes
 * 
 * Endpoints for generating and retrieving character portrait videos.
 */

import { Router } from 'express'
import {
  getCharacterPortrait,
  checkPortraitStatus,
  pregenerateCharacterPortraits,
  getAllCachedPortraits,
  buildPortraitPrompt,
  type EmotionalState,
  type PortraitRequest,
} from './portraitGenerator'

const router = Router()

/**
 * GET /api/portraits/:characterId/:emotionalState
 * Get or generate a character portrait video
 */
router.get('/:characterId/:emotionalState', async (req, res) => {
  try {
    const { characterId, emotionalState } = req.params
    const intensity = parseInt(req.query.intensity as string) || 50
    const context = req.query.context as string | undefined
    
    // Validate emotional state
    const validStates: EmotionalState[] = ['composed', 'nervous', 'defensive', 'breaking', 'relieved', 'hostile']
    if (!validStates.includes(emotionalState as EmotionalState)) {
      return res.status(400).json({ 
        error: `Invalid emotional state. Valid options: ${validStates.join(', ')}` 
      })
    }
    
    const request: PortraitRequest = {
      characterId,
      emotionalState: emotionalState as EmotionalState,
      intensity,
      context,
    }
    
    const result = await getCharacterPortrait(request)
    res.json(result)
    
  } catch (error) {
    console.error('[Portrait API] Error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get portrait' 
    })
  }
})

/**
 * GET /api/portraits/:characterId/:emotionalState/status
 * Check status of a portrait generation
 */
router.get('/:characterId/:emotionalState/status', (req, res) => {
  const { characterId, emotionalState } = req.params
  
  const status = checkPortraitStatus(characterId, emotionalState as EmotionalState)
  
  if (!status) {
    return res.status(404).json({ error: 'No portrait generation found' })
  }
  
  res.json(status)
})

/**
 * POST /api/portraits/pregenerate
 * Pre-generate portraits for specified characters and states
 */
router.post('/pregenerate', async (req, res) => {
  try {
    const { characters, states } = req.body as {
      characters?: string[]
      states?: EmotionalState[]
    }
    
    const targetCharacters = characters || ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james']
    const targetStates = states || ['composed', 'nervous', 'defensive']
    
    // Start pre-generation in background
    res.json({ 
      message: 'Pre-generation started',
      characters: targetCharacters,
      states: targetStates,
    })
    
    // Don't await - let it run in background
    for (const characterId of targetCharacters) {
      pregenerateCharacterPortraits(characterId, targetStates).catch(err => {
        console.error(`[Portrait] Pre-generation failed for ${characterId}:`, err)
      })
    }
    
  } catch (error) {
    console.error('[Portrait API] Pregenerate error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start pre-generation' 
    })
  }
})

/**
 * GET /api/portraits/cache
 * Get all cached portraits
 */
router.get('/cache', (_req, res) => {
  const cache = getAllCachedPortraits()
  res.json(cache)
})

/**
 * GET /api/portraits/prompt/:characterId/:emotionalState
 * Get the prompt that would be used for a portrait (for debugging)
 */
router.get('/prompt/:characterId/:emotionalState', (req, res) => {
  try {
    const { characterId, emotionalState } = req.params
    const intensity = parseInt(req.query.intensity as string) || 50
    const context = req.query.context as string | undefined
    
    const prompt = buildPortraitPrompt(
      characterId, 
      emotionalState as EmotionalState, 
      intensity, 
      context
    )
    
    res.json({ prompt })
    
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to build prompt' 
    })
  }
})

export default router
