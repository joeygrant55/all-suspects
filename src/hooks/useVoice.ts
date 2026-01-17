import { useState, useCallback, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface VoiceState {
  isPlaying: boolean
  isLoading: boolean
  voiceEnabled: boolean
  error: string | null
}

interface VoiceActions {
  speak: (characterId: string, text: string) => Promise<void>
  stop: () => void
  toggleVoice: () => void
  setVoiceEnabled: (enabled: boolean) => void
}

export type VoiceManager = VoiceState & VoiceActions

export function useVoice(): VoiceManager {
  const [state, setState] = useState<VoiceState>({
    isPlaying: false,
    isLoading: false,
    voiceEnabled: true,
    error: null,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Create audio element on first use
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => {
        setState(s => ({ ...s, isPlaying: false }))
      })
      audioRef.current.addEventListener('error', () => {
        setState(s => ({ ...s, isPlaying: false, error: 'Audio playback failed' }))
      })
    }
    return audioRef.current
  }, [])

  // Speak text with character voice
  const speak = useCallback(async (characterId: string, text: string) => {
    if (!state.voiceEnabled) return

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Stop any playing audio
    const audio = getAudio()
    audio.pause()
    audio.currentTime = 0

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_URL}/api/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ characterId, text }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || error.error || 'Voice synthesis failed')
      }

      const data = await response.json()

      // Convert base64 to blob and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      )
      const audioUrl = URL.createObjectURL(audioBlob)

      audio.src = audioUrl
      audio.volume = 0.8

      await audio.play()
      setState(s => ({ ...s, isPlaying: true, isLoading: false }))

      // Clean up blob URL when done
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        setState(s => ({ ...s, isPlaying: false }))
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, not an error
        setState(s => ({ ...s, isLoading: false }))
        return
      }

      console.log('Voice synthesis not available:', error)
      setState(s => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Voice synthesis failed',
      }))
    }
  }, [state.voiceEnabled, getAudio])

  // Stop audio playback
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const audio = getAudio()
    audio.pause()
    audio.currentTime = 0
    setState(s => ({ ...s, isPlaying: false, isLoading: false }))
  }, [getAudio])

  // Toggle voice on/off
  const toggleVoice = useCallback(() => {
    setState(s => {
      if (s.voiceEnabled) {
        // Turning off - stop any playing audio
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        return { ...s, voiceEnabled: false, isPlaying: false }
      }
      return { ...s, voiceEnabled: true }
    })
  }, [])

  // Set voice enabled state
  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setState(s => {
      if (!enabled && audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      return { ...s, voiceEnabled: enabled, isPlaying: enabled ? s.isPlaying : false }
    })
  }, [])

  return {
    ...state,
    speak,
    stop,
    toggleVoice,
    setVoiceEnabled,
  }
}

// Voice context for components
import { createContext, useContext } from 'react'

export const VoiceContext = createContext<VoiceManager | null>(null)

export function useVoiceContext() {
  const context = useContext(VoiceContext)
  if (!context) {
    throw new Error('useVoiceContext must be used within a VoiceProvider')
  }
  return context
}
