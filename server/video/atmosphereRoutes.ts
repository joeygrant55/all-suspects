/**
 * Room Atmosphere Video API Routes
 * 
 * Endpoints for generating and retrieving room atmosphere videos.
 */

import { Router } from 'express'
import {
  getRoomAtmosphere,
  checkAtmosphereStatus,
  pregenerateRoomAtmospheres,
  getAllCachedAtmospheres,
  buildRoomAtmospherePrompt,
  getRoomInfo,
  getAllRoomIds,
  type RoomId,
  type TimeOfDay,
  type WeatherCondition,
} from './roomAtmosphereGenerator'

const router = Router()

// Valid values for validation
const VALID_ROOMS: RoomId[] = ['study', 'parlor', 'dining', 'kitchen', 'hallway', 'garden']
const VALID_TIMES: TimeOfDay[] = ['night', 'dawn', 'dusk']
const VALID_WEATHER: WeatherCondition[] = ['clear', 'rain', 'storm', 'fog']

/**
 * GET /api/atmosphere/:roomId
 * Get or generate a room atmosphere video
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const timeOfDay = (req.query.time as TimeOfDay) || 'night'
    const weather = (req.query.weather as WeatherCondition) || 'rain'
    const tension = parseInt(req.query.tension as string) || 50
    
    // Validate room
    if (!VALID_ROOMS.includes(roomId as RoomId)) {
      return res.status(400).json({ 
        error: `Invalid room. Valid options: ${VALID_ROOMS.join(', ')}` 
      })
    }
    
    // Validate time of day
    if (!VALID_TIMES.includes(timeOfDay)) {
      return res.status(400).json({ 
        error: `Invalid time of day. Valid options: ${VALID_TIMES.join(', ')}` 
      })
    }
    
    // Validate weather
    if (!VALID_WEATHER.includes(weather)) {
      return res.status(400).json({ 
        error: `Invalid weather. Valid options: ${VALID_WEATHER.join(', ')}` 
      })
    }
    
    const result = await getRoomAtmosphere({
      roomId: roomId as RoomId,
      timeOfDay,
      weather,
      tension,
    })
    
    res.json(result)
    
  } catch (error) {
    console.error('[Atmosphere API] Error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get atmosphere' 
    })
  }
})

/**
 * GET /api/atmosphere/:roomId/status
 * Check status of an atmosphere generation
 */
router.get('/:roomId/status', (req, res) => {
  const { roomId } = req.params
  const timeOfDay = (req.query.time as TimeOfDay) || 'night'
  const weather = (req.query.weather as WeatherCondition) || 'rain'
  
  if (!VALID_ROOMS.includes(roomId as RoomId)) {
    return res.status(400).json({ error: 'Invalid room' })
  }
  
  const status = checkAtmosphereStatus(roomId as RoomId, timeOfDay, weather)
  
  if (!status) {
    return res.status(404).json({ error: 'No atmosphere generation found' })
  }
  
  res.json(status)
})

/**
 * GET /api/atmosphere/:roomId/info
 * Get room visual information (for UI display)
 */
router.get('/:roomId/info', (req, res) => {
  const { roomId } = req.params
  
  if (!VALID_ROOMS.includes(roomId as RoomId)) {
    return res.status(400).json({ error: 'Invalid room' })
  }
  
  const info = getRoomInfo(roomId as RoomId)
  
  if (!info) {
    return res.status(404).json({ error: 'Room info not found' })
  }
  
  res.json({
    roomId,
    ...info,
  })
})

/**
 * GET /api/atmosphere/rooms/list
 * Get list of all available rooms
 */
router.get('/rooms/list', (_req, res) => {
  const rooms = getAllRoomIds()
  const roomDetails = rooms.map(roomId => {
    const info = getRoomInfo(roomId)
    return {
      id: roomId,
      name: info?.name || roomId,
      description: info?.description || '',
    }
  })
  
  res.json({
    rooms: roomDetails,
    validTimes: VALID_TIMES,
    validWeather: VALID_WEATHER,
  })
})

/**
 * POST /api/atmosphere/pregenerate
 * Pre-generate atmospheres for specified conditions
 */
router.post('/pregenerate', async (req, res) => {
  try {
    const { timeOfDay, weather } = req.body as {
      timeOfDay?: TimeOfDay
      weather?: WeatherCondition
    }
    
    const targetTime = timeOfDay || 'night'
    const targetWeather = weather || 'rain'
    
    // Start pre-generation in background
    res.json({ 
      message: 'Pre-generation started',
      timeOfDay: targetTime,
      weather: targetWeather,
      rooms: VALID_ROOMS,
    })
    
    // Don't await - let it run in background
    pregenerateRoomAtmospheres(targetTime, targetWeather).catch(err => {
      console.error(`[Atmosphere] Pre-generation failed:`, err)
    })
    
  } catch (error) {
    console.error('[Atmosphere API] Pregenerate error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start pre-generation' 
    })
  }
})

/**
 * GET /api/atmosphere/cache
 * Get all cached atmospheres
 */
router.get('/cache/all', (_req, res) => {
  const cache = getAllCachedAtmospheres()
  res.json(cache)
})

/**
 * GET /api/atmosphere/prompt/:roomId
 * Get the prompt that would be used for an atmosphere (for debugging)
 */
router.get('/prompt/:roomId', (req, res) => {
  try {
    const { roomId } = req.params
    const timeOfDay = (req.query.time as TimeOfDay) || 'night'
    const weather = (req.query.weather as WeatherCondition) || 'rain'
    const tension = parseInt(req.query.tension as string) || 50
    
    if (!VALID_ROOMS.includes(roomId as RoomId)) {
      return res.status(400).json({ error: 'Invalid room' })
    }
    
    const prompt = buildRoomAtmospherePrompt(
      roomId as RoomId, 
      timeOfDay, 
      weather, 
      tension
    )
    
    res.json({ 
      roomId,
      timeOfDay,
      weather,
      tension,
      prompt,
    })
    
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to build prompt' 
    })
  }
})

export default router
