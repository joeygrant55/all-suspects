/**
 * Room Atmosphere Video Generator
 * 
 * Generates cinematic ambient video loops for each room in the manor.
 * These serve as immersive full-bleed backgrounds when the player enters a room.
 */

import { generateVideo, getGenerationStatus, type VideoGenerationResult } from './veoClient'

export type RoomId = 'study' | 'parlor' | 'dining' | 'kitchen' | 'hallway' | 'garden'
export type TimeOfDay = 'night' | 'dawn' | 'dusk'
export type WeatherCondition = 'clear' | 'rain' | 'storm' | 'fog'

export interface RoomAtmosphereRequest {
  roomId: RoomId
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  tension?: number // 0-100, affects how ominous the atmosphere feels
}

export interface RoomAtmosphereResult {
  roomId: RoomId
  videoUrl?: string
  generationId: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
  timeOfDay: TimeOfDay
  weather: WeatherCondition
}

// Room visual descriptions for atmospheric video generation
const ROOM_VISUALS: Record<RoomId, {
  name: string
  description: string
  keyElements: string[]
  lightSources: string[]
  sounds: string[] // For video prompt context
}> = {
  study: {
    name: 'Edmund\'s Study',
    description: 'A richly appointed Victorian study with dark wood paneling, floor-to-ceiling bookshelves, and a massive mahogany desk',
    keyElements: [
      'leather armchairs by the fireplace',
      'crystal decanters on a sideboard',
      'oil paintings in gilded frames',
      'Persian rugs on hardwood floors',
      'brass desk lamp with green glass shade',
      'scattered papers and documents',
    ],
    lightSources: ['crackling fireplace', 'dim desk lamp', 'moonlight through tall windows'],
    sounds: ['fire crackling', 'clock ticking', 'wind outside'],
  },
  parlor: {
    name: 'The Parlor',
    description: 'An elegant 1920s parlor with art deco furnishings, a baby grand piano, and velvet settees',
    keyElements: [
      'ornate fireplace with marble mantle',
      'crystal chandelier casting prismatic light',
      'art deco mirrors and sconces',
      'vintage phonograph in the corner',
      'champagne glasses on silver trays',
      'fresh flowers wilting in vases',
    ],
    lightSources: ['dim chandelier', 'candles on mantle', 'street lamp glow through curtains'],
    sounds: ['distant music', 'occasional creak', 'rain on windows'],
  },
  dining: {
    name: 'The Dining Room',
    description: 'A formal dining room with a long mahogany table set for dinner, interrupted mid-meal',
    keyElements: [
      'half-eaten dinner on fine china',
      'wine glasses, some knocked over',
      'tall candelabras with dripping wax',
      'portraits of ancestors on walls',
      'silver serving pieces',
      'a chair pushed back hastily',
    ],
    lightSources: ['flickering candles', 'dying embers in fireplace', 'lightning flashes'],
    sounds: ['silverware settling', 'wind howling', 'distant thunder'],
  },
  kitchen: {
    name: 'The Kitchen',
    description: 'A working Victorian kitchen with copper pots, stone floors, and servants\' quarters beyond',
    keyElements: [
      'cast iron range still warm',
      'copper pots hanging from rack',
      'butcher block with knife marks',
      'servants\' bells on the wall',
      'larder door slightly ajar',
      'abandoned tea service',
    ],
    lightSources: ['oil lamp on table', 'range fire glow', 'moonlight through small windows'],
    sounds: ['dripping tap', 'settling house', 'mice skittering'],
  },
  hallway: {
    name: 'The Grand Hallway',
    description: 'A sweeping entrance hall with a grand staircase, checkered marble floor, and family portraits',
    keyElements: [
      'curved staircase with worn carpet',
      'grandfather clock showing midnight',
      'umbrella stand by door',
      'ancestral portraits watching',
      'coat hooks with someone\'s coat',
      'mysterious footprints on floor',
    ],
    lightSources: ['single lamp on table', 'moonlight through fanlight', 'distant room light'],
    sounds: ['clock chiming', 'floorboards creaking', 'wind in chimney'],
  },
  garden: {
    name: 'The Garden',
    description: 'A formal English garden at night, with hedges, statuary, and a conservatory',
    keyElements: [
      'topiary hedges casting shadows',
      'stone benches with moss',
      'fountain no longer running',
      'greenhouse with fogged glass',
      'gravel paths leading into darkness',
      'a forgotten shawl on a bench',
    ],
    lightSources: ['manor windows glowing', 'moonlight through clouds', 'garden lanterns unlit'],
    sounds: ['wind in trees', 'owl calling', 'gravel crunching'],
  },
}

// Weather visual modifiers
const WEATHER_MODIFIERS: Record<WeatherCondition, string> = {
  clear: 'clear night sky with stars visible, peaceful atmosphere',
  rain: 'steady rain visible through windows, water streaming down glass, puddles forming',
  storm: 'violent storm with lightning flashes, thunder audible, dramatic shadows',
  fog: 'thick fog pressing against windows, visibility limited, eerie mist',
}

// Time of day modifiers
const TIME_MODIFIERS: Record<TimeOfDay, string> = {
  night: 'deep night, most lights extinguished, shadows dominate',
  dawn: 'pre-dawn gray light mixing with artificial light, exhausted atmosphere',
  dusk: 'last light of day fading, lamps being lit, transitional mood',
}

// Tension level modifiers
function getTensionModifier(tension: number): string {
  if (tension > 80) return 'extremely ominous atmosphere, something terrible about to happen, oppressive dread'
  if (tension > 60) return 'highly tense atmosphere, danger feels imminent, shadows seem threatening'
  if (tension > 40) return 'unsettling atmosphere, something feels wrong, heightened alertness'
  if (tension > 20) return 'slightly uneasy atmosphere, subtle wrongness, watchful mood'
  return 'relatively calm atmosphere, quiet tension beneath the surface'
}

/**
 * Build the full prompt for a room atmosphere video
 */
export function buildRoomAtmospherePrompt(
  roomId: RoomId,
  timeOfDay: TimeOfDay = 'night',
  weather: WeatherCondition = 'rain',
  tension: number = 50
): string {
  const room = ROOM_VISUALS[roomId]
  
  const keyElementsList = room.keyElements.slice(0, 4).join(', ')
  const lightSourcesList = room.lightSources.join(' and ')
  
  let prompt = `Cinematic atmospheric video loop of ${room.description}. `
  prompt += `Key details: ${keyElementsList}. `
  prompt += `Lighting: ${lightSourcesList}. `
  prompt += `${TIME_MODIFIERS[timeOfDay]}. `
  prompt += `${WEATHER_MODIFIERS[weather]}. `
  prompt += `${getTensionModifier(tension)}. `
  prompt += `Slow subtle camera drift, slight movement in shadows, `
  prompt += `dust particles floating in light beams, atmospheric details. `
  prompt += `1920s period accurate, photorealistic, noir cinematography with film grain, `
  prompt += `15 seconds seamless loop, establishing shot.`
  
  return prompt
}

// Cache for generated room atmospheres
const atmosphereCache: Map<string, RoomAtmosphereResult> = new Map()

function getCacheKey(roomId: RoomId, timeOfDay: TimeOfDay, weather: WeatherCondition): string {
  return `${roomId}:${timeOfDay}:${weather}`
}

/**
 * Get or generate a room atmosphere video
 */
export async function getRoomAtmosphere(
  request: RoomAtmosphereRequest
): Promise<RoomAtmosphereResult> {
  const timeOfDay = request.timeOfDay || 'night'
  const weather = request.weather || 'rain'
  const cacheKey = getCacheKey(request.roomId, timeOfDay, weather)
  
  // Check cache first
  const cached = atmosphereCache.get(cacheKey)
  if (cached && cached.status === 'ready' && cached.videoUrl) {
    return cached
  }
  
  // If already generating, return current status
  if (cached && (cached.status === 'pending' || cached.status === 'generating')) {
    // Check if generation completed
    const status = getGenerationStatus(cached.generationId)
    if (status?.status === 'completed' && status.videoUrl) {
      const result: RoomAtmosphereResult = {
        ...cached,
        status: 'ready',
        videoUrl: status.videoUrl,
      }
      atmosphereCache.set(cacheKey, result)
      return result
    }
    return cached
  }
  
  // Generate new atmosphere video
  const prompt = buildRoomAtmospherePrompt(
    request.roomId,
    timeOfDay,
    weather,
    request.tension || 50
  )
  
  const result: RoomAtmosphereResult = {
    roomId: request.roomId,
    generationId: '',
    status: 'pending',
    timeOfDay,
    weather,
  }
  
  try {
    const videoResult = await generateVideo({
      prompt,
      characterId: `room:${request.roomId}`,
      testimonyId: `atmosphere:${timeOfDay}:${weather}`,
      duration: 15,
      aspectRatio: '16:9',
    })
    
    result.generationId = videoResult.generationId
    result.status = videoResult.success ? 'generating' : 'error'
    
    if (videoResult.videoUrl) {
      result.status = 'ready'
      result.videoUrl = videoResult.videoUrl
    }
    
    if (videoResult.error) {
      result.error = videoResult.error
    }
    
  } catch (error) {
    result.status = 'error'
    result.error = error instanceof Error ? error.message : 'Generation failed'
  }
  
  atmosphereCache.set(cacheKey, result)
  return result
}

/**
 * Check status of an atmosphere generation
 */
export function checkAtmosphereStatus(
  roomId: RoomId,
  timeOfDay: TimeOfDay = 'night',
  weather: WeatherCondition = 'rain'
): RoomAtmosphereResult | null {
  const cacheKey = getCacheKey(roomId, timeOfDay, weather)
  const cached = atmosphereCache.get(cacheKey)
  
  if (!cached) return null
  
  // If still generating, check for updates
  if (cached.status === 'generating' && cached.generationId) {
    const status = getGenerationStatus(cached.generationId)
    if (status?.status === 'completed' && status.videoUrl) {
      cached.status = 'ready'
      cached.videoUrl = status.videoUrl
      atmosphereCache.set(cacheKey, cached)
    } else if (status?.status === 'failed') {
      cached.status = 'error'
      cached.error = status.error
      atmosphereCache.set(cacheKey, cached)
    }
  }
  
  return cached
}

/**
 * Pre-generate all room atmospheres for a given time/weather combo
 */
export async function pregenerateRoomAtmospheres(
  timeOfDay: TimeOfDay = 'night',
  weather: WeatherCondition = 'rain'
): Promise<void> {
  const rooms: RoomId[] = ['study', 'parlor', 'dining', 'kitchen', 'hallway', 'garden']
  
  console.log(`[Atmosphere] Pre-generating atmospheres for ${timeOfDay}/${weather}`)
  
  for (const roomId of rooms) {
    await getRoomAtmosphere({ roomId, timeOfDay, weather })
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

/**
 * Get all cached atmospheres
 */
export function getAllCachedAtmospheres(): Record<string, RoomAtmosphereResult> {
  const result: Record<string, RoomAtmosphereResult> = {}
  atmosphereCache.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Get room info (for UI display)
 */
export function getRoomInfo(roomId: RoomId): typeof ROOM_VISUALS[RoomId] | null {
  return ROOM_VISUALS[roomId] || null
}

/**
 * Get all room IDs
 */
export function getAllRoomIds(): RoomId[] {
  return Object.keys(ROOM_VISUALS) as RoomId[]
}

/**
 * Clear atmosphere cache
 */
export function clearAtmosphereCache(): void {
  atmosphereCache.clear()
}
