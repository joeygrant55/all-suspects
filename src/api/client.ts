import type { Contradiction } from '../game/state'

const API_BASE = 'http://localhost:3001/api'

export interface PressureData {
  level: number
  confrontations: number
  evidencePresented: number
  contradictionsExposed: number
}

export interface ChatResponse {
  message: string
  characterName: string
  statementId?: string
  contradictions?: Contradiction[]
  pressure?: PressureData
}

export async function sendMessage(
  characterId: string,
  message: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, message }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

export async function resetConversation(characterId?: string): Promise<void> {
  await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId }),
  })
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}

// ============================================================
// VIDEO GENERATION API
// ============================================================

export interface VideoGenerationResponse {
  success: boolean
  cached?: boolean
  videoUrl?: string
  videoData?: string
  imageUrl?: string
  error?: string
  generationId?: string
  prompt?: string
  analysis?: {
    location: string
    timeOfDay: string
    characters: string[]
    actions: string[]
    objects: string[]
    mood: string
    keyVisualElements: string[]
  }
}

export interface VideoStatusResponse {
  generationId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  error?: string
}

export interface VideoCacheStats {
  configured: boolean
  cache: {
    size: number
    maxSize: number
    hitRate: number
    oldestEntry: number | null
    newestEntry: number | null
  }
}

/**
 * Generate a video from character testimony
 */
export async function generateTestimonyVideo(
  characterId: string,
  testimony: string,
  question?: string,
  testimonyId?: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/testimony`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, testimony, question, testimonyId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Video generation failed')
  }

  return response.json()
}

/**
 * Generate a character introduction video
 */
export async function generateIntroductionVideo(
  characterId: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/introduction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Video generation failed')
  }

  return response.json()
}

/**
 * Generate an image from testimony (faster fallback)
 */
export async function generateTestimonyImage(
  characterId: string,
  testimony: string,
  question?: string
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE}/video/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, testimony, question }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Image generation failed')
  }

  return response.json()
}

/**
 * Check the status of a video generation
 */
export async function checkVideoStatus(
  generationId: string
): Promise<VideoStatusResponse> {
  const response = await fetch(`${API_BASE}/video/status/${generationId}`)

  if (!response.ok) {
    throw new Error('Failed to check video status')
  }

  return response.json()
}

/**
 * Get video cache statistics
 */
export async function getVideoCacheStats(): Promise<VideoCacheStats> {
  const response = await fetch(`${API_BASE}/video/cache`)

  if (!response.ok) {
    throw new Error('Failed to get cache stats')
  }

  return response.json()
}

/**
 * Check if video generation is available
 */
export async function isVideoAvailable(): Promise<boolean> {
  try {
    const stats = await getVideoCacheStats()
    return stats.configured
  } catch {
    return false
  }
}
