/**
 * Character Portrait Hook
 * 
 * Manages portrait video state and preloading for smooth transitions
 * between emotional states during interrogation.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getCharacterPortrait,
  checkPortraitStatus,
  pregeneratePortraits,
  type EmotionalState,
  type PortraitResult,
  type EmotionData,
} from '../api/client'

interface UseCharacterPortraitOptions {
  characterId: string
  initialState?: EmotionalState
  preloadStates?: EmotionalState[]
}

interface UseCharacterPortraitReturn {
  currentPortrait: PortraitResult | null
  currentEmotion: EmotionData | null
  isLoading: boolean
  error: string | null
  setEmotion: (emotion: EmotionData) => void
  preloadPortrait: (state: EmotionalState) => Promise<void>
  refreshPortrait: () => Promise<void>
}

// Default states to preload
const DEFAULT_PRELOAD_STATES: EmotionalState[] = ['composed', 'nervous', 'defensive']

export function useCharacterPortrait({
  characterId,
  initialState = 'composed',
  preloadStates = DEFAULT_PRELOAD_STATES,
}: UseCharacterPortraitOptions): UseCharacterPortraitReturn {
  const [currentPortrait, setCurrentPortrait] = useState<PortraitResult | null>(null)
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cache of loaded portraits
  const portraitCache = useRef<Map<string, PortraitResult>>(new Map())
  const pollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // Get cache key
  const getCacheKey = (charId: string, state: EmotionalState) => `${charId}:${state}`

  // Fetch a portrait (uses cache if available)
  const fetchPortrait = useCallback(async (
    state: EmotionalState,
    intensity?: number
  ): Promise<PortraitResult | null> => {
    const cacheKey = getCacheKey(characterId, state)
    
    // Check cache first
    const cached = portraitCache.current.get(cacheKey)
    if (cached?.status === 'ready' && cached.videoUrl) {
      return cached
    }

    try {
      const result = await getCharacterPortrait(characterId, state, intensity)
      
      if (result.status === 'ready' && result.videoUrl) {
        portraitCache.current.set(cacheKey, result)
        return result
      }

      // Start polling if still generating
      if (result.status === 'generating' || result.status === 'pending') {
        startPolling(cacheKey, state)
      }

      return result
    } catch (err) {
      console.error(`Failed to fetch portrait ${cacheKey}:`, err)
      return null
    }
  }, [characterId])

  // Start polling for a specific portrait
  const startPolling = useCallback((cacheKey: string, state: EmotionalState) => {
    // Don't start duplicate polls
    if (pollIntervals.current.has(cacheKey)) return

    const interval = setInterval(async () => {
      try {
        const status = await checkPortraitStatus(characterId, state)
        if (status) {
          if (status.status === 'ready' && status.videoUrl) {
            portraitCache.current.set(cacheKey, status)
            clearInterval(interval)
            pollIntervals.current.delete(cacheKey)
            
            // Update current if this is the active state
            if (currentEmotion?.primary === state) {
              setCurrentPortrait(status)
              setIsLoading(false)
            }
          } else if (status.status === 'error') {
            clearInterval(interval)
            pollIntervals.current.delete(cacheKey)
          }
        }
      } catch (err) {
        console.error(`Error polling portrait ${cacheKey}:`, err)
      }
    }, 3000)

    pollIntervals.current.set(cacheKey, interval)
  }, [characterId, currentEmotion])

  // Set the current emotional state (triggers portrait switch)
  const setEmotion = useCallback(async (emotion: EmotionData) => {
    setCurrentEmotion(emotion)
    setIsLoading(true)
    setError(null)

    const portrait = await fetchPortrait(emotion.primary, emotion.intensity)
    
    if (portrait) {
      setCurrentPortrait(portrait)
      if (portrait.status === 'ready' || portrait.status === 'error') {
        setIsLoading(false)
      }
      if (portrait.status === 'error') {
        setError(portrait.error || 'Failed to load portrait')
      }
    } else {
      setIsLoading(false)
      setError('Failed to fetch portrait')
    }
  }, [fetchPortrait])

  // Preload a specific portrait state
  const preloadPortrait = useCallback(async (state: EmotionalState) => {
    await fetchPortrait(state)
  }, [fetchPortrait])

  // Refresh the current portrait
  const refreshPortrait = useCallback(async () => {
    if (currentEmotion) {
      // Clear cache for this state
      const cacheKey = getCacheKey(characterId, currentEmotion.primary)
      portraitCache.current.delete(cacheKey)
      
      // Refetch
      await setEmotion(currentEmotion)
    }
  }, [characterId, currentEmotion, setEmotion])

  // Initial load and preload
  useEffect(() => {
    // Load initial state
    setEmotion({
      primary: initialState,
      intensity: 30,
      tells: [],
      voice: { pace: 'normal', tremor: false, volume: 'normal', breaks: false },
    })

    // Preload other states in background
    preloadStates.forEach(state => {
      if (state !== initialState) {
        setTimeout(() => preloadPortrait(state), 1000)
      }
    })

    // Cleanup polling on unmount
    return () => {
      pollIntervals.current.forEach(interval => clearInterval(interval))
      pollIntervals.current.clear()
    }
  }, [characterId]) // Only run when character changes

  return {
    currentPortrait,
    currentEmotion,
    isLoading,
    error,
    setEmotion,
    preloadPortrait,
    refreshPortrait,
  }
}

/**
 * Preload portraits for multiple characters (e.g., at game start)
 */
export async function preloadAllCharacterPortraits(
  characterIds: string[] = ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james'],
  states: EmotionalState[] = ['composed', 'nervous']
): Promise<void> {
  try {
    await pregeneratePortraits(characterIds, states)
    console.log('[Portrait] Pre-generation started for all characters')
  } catch (err) {
    console.error('[Portrait] Failed to start pre-generation:', err)
  }
}

export default useCharacterPortrait
