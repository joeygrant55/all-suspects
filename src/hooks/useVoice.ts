import { useCallback, useEffect, useRef, useState } from 'react'
import { buildApiUrl } from '../api/client'

const VOICE_PREFERENCE_KEY = 'all-saints-voice-enabled'

interface VoiceStatusResponse {
  configured: boolean
  message: string
}

interface VoiceErrorResponse {
  error?: string
  code?: string
}

interface VoiceState {
  isPlaying: boolean
  isLoading: boolean
  isChecking: boolean
  voiceEnabled: boolean
  isConfigured: boolean
  statusMessage: string
  error: string | null
  activeUtteranceId: string | null
}

interface VoiceActions {
  speak: (saintId: string, text: string, utteranceId?: string) => Promise<void>
  stop: () => void
  toggleVoice: () => void
  clearError: () => void
  refreshStatus: () => Promise<void>
}

export type VoiceManager = VoiceState & VoiceActions

function getInitialVoicePreference(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const storedPreference = window.localStorage.getItem(VOICE_PREFERENCE_KEY)
  return storedPreference !== 'false'
}

async function getVoiceErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as VoiceErrorResponse
      if (payload.error?.trim()) {
        return payload.error.trim()
      }
    } catch {
      return 'Voice playback failed.'
    }
  }

  try {
    const text = (await response.text()).trim()
    return text || 'Voice playback failed.'
  } catch {
    return 'Voice playback failed.'
  }
}

export function useVoice(): VoiceManager {
  const [state, setState] = useState<VoiceState>({
    isPlaying: false,
    isLoading: false,
    isChecking: true,
    voiceEnabled: getInitialVoicePreference(),
    isConfigured: false,
    statusMessage: 'Checking voice availability...',
    error: null,
    activeUtteranceId: null,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const releaseAudioUrl = useCallback(() => {
    if (!audioUrlRef.current) {
      return
    }

    URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
  }, [])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }

    releaseAudioUrl()

    setState((currentState) => ({
      ...currentState,
      isPlaying: false,
      isLoading: false,
      activeUtteranceId: null,
    }))
  }, [releaseAudioUrl])

  const refreshStatus = useCallback(async () => {
    setState((currentState) => ({
      ...currentState,
      isChecking: true,
      error: null,
    }))

    try {
      const response = await fetch(buildApiUrl('/api/voice/status'))
      if (!response.ok) {
        throw new Error(await getVoiceErrorMessage(response))
      }

      const data = (await response.json()) as VoiceStatusResponse
      setState((currentState) => ({
        ...currentState,
        isChecking: false,
        isConfigured: data.configured,
        statusMessage: data.message,
      }))
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        isChecking: false,
        isConfigured: false,
        statusMessage: 'Voice playback is unavailable.',
        error:
          error instanceof Error ? error.message : 'Unable to check voice availability.',
      }))
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'

    const handleEnded = () => {
      releaseAudioUrl()
      setState((currentState) => ({
        ...currentState,
        isPlaying: false,
        isLoading: false,
        activeUtteranceId: null,
      }))
    }

    const handleError = () => {
      releaseAudioUrl()
      setState((currentState) => ({
        ...currentState,
        isPlaying: false,
        isLoading: false,
        activeUtteranceId: null,
        error: 'Audio playback failed.',
      }))
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audioRef.current = audio

    void refreshStatus()

    return () => {
      abortControllerRef.current?.abort()
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.src = ''
      audioRef.current = null
      releaseAudioUrl()
    }
  }, [refreshStatus, releaseAudioUrl])

  const speak = useCallback(
    async (saintId: string, text: string, utteranceId?: string) => {
      if (!state.voiceEnabled || !state.isConfigured) {
        return
      }

      const trimmedText = text.trim()
      if (!trimmedText) {
        return
      }

      stop()

      const audio = audioRef.current
      if (!audio) {
        setState((currentState) => ({
          ...currentState,
          error: 'Audio playback is not ready yet.',
        }))
        return
      }

      setState((currentState) => ({
        ...currentState,
        isLoading: true,
        error: null,
        activeUtteranceId: utteranceId ?? saintId,
      }))

      try {
        abortControllerRef.current = new AbortController()

        const response = await fetch(buildApiUrl('/api/voice'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ saintId, text: trimmedText }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(await getVoiceErrorMessage(response))
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        audioUrlRef.current = audioUrl

        audio.src = audioUrl
        audio.volume = 0.9
        await audio.play()

        setState((currentState) => ({
          ...currentState,
          isPlaying: true,
          isLoading: false,
        }))
      } catch (error) {
        releaseAudioUrl()

        if (error instanceof Error && error.name === 'AbortError') {
          setState((currentState) => ({
            ...currentState,
            isLoading: false,
          }))
          return
        }

        setState((currentState) => ({
          ...currentState,
          isPlaying: false,
          isLoading: false,
          activeUtteranceId: null,
          error:
            error instanceof Error ? error.message : 'Voice playback failed.',
        }))
      } finally {
        abortControllerRef.current = null
      }
    },
    [releaseAudioUrl, state.isConfigured, state.voiceEnabled, stop]
  )

  const toggleVoice = useCallback(() => {
    const nextEnabled = !state.voiceEnabled

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOICE_PREFERENCE_KEY, String(nextEnabled))
    }

    if (!nextEnabled) {
      stop()
    }

    setState((currentState) => ({
      ...currentState,
      voiceEnabled: nextEnabled,
    }))
  }, [state.voiceEnabled, stop])

  const clearError = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      error: null,
    }))
  }, [])

  return {
    ...state,
    speak,
    stop,
    toggleVoice,
    clearError,
    refreshStatus,
  }
}
