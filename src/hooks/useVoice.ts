import { useCallback, useEffect, useRef, useState } from 'react'
import { buildApiUrl } from '../api/client'

const VOICE_PREFERENCE_KEY = 'all-saints-voice-enabled'
const VOICE_STATUS_TIMEOUT_MS = 8_000
const VOICE_REQUEST_TIMEOUT_MS = 20_000

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

function browserSupportsMpegPlayback(): boolean {
  if (typeof document === 'undefined') {
    return true
  }

  const audio = document.createElement('audio')
  return audio.canPlayType('audio/mpeg') !== ''
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

  const detachAudioUrl = useCallback(() => {
    const audioUrl = audioUrlRef.current
    audioUrlRef.current = null
    return audioUrl
  }, [])

  const revokeAudioUrl = useCallback((audioUrl: string | null) => {
    if (!audioUrl) {
      return
    }

    URL.revokeObjectURL(audioUrl)
  }, [])

  const disableVoice = useCallback((statusMessage: string) => {
    setState((currentState) => ({
      ...currentState,
      isPlaying: false,
      isLoading: false,
      isChecking: false,
      isConfigured: false,
      voiceEnabled: false,
      statusMessage,
      error: null,
      activeUtteranceId: null,
    }))
  }, [])

  const resetAudioElement = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.removeAttribute('src')
    audio.load()
  }, [])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    const audioUrl = detachAudioUrl()
    resetAudioElement()
    revokeAudioUrl(audioUrl)

    setState((currentState) => ({
      ...currentState,
      isPlaying: false,
      isLoading: false,
      activeUtteranceId: null,
    }))
  }, [detachAudioUrl, resetAudioElement, revokeAudioUrl])

  const refreshStatus = useCallback(async () => {
    setState((currentState) => ({
      ...currentState,
      isChecking: true,
      error: null,
    }))

    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, VOICE_STATUS_TIMEOUT_MS)

    try {
      const response = await fetch(buildApiUrl('/api/voice/status'), {
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(await getVoiceErrorMessage(response))
      }

      const data = (await response.json()) as VoiceStatusResponse
      const isPlayable = browserSupportsMpegPlayback()
      const isConfigured = data.configured && isPlayable
      const statusMessage = isPlayable
        ? data.message
        : 'Voice playback is unavailable in this browser.'

      setState((currentState) => ({
        ...currentState,
        isChecking: false,
        isConfigured,
        voiceEnabled: isConfigured ? currentState.voiceEnabled : false,
        statusMessage,
      }))
    } catch {
      setState((currentState) => ({
        ...currentState,
        isChecking: false,
        isConfigured: false,
        voiceEnabled: false,
        statusMessage: timedOut
          ? 'Voice playback is unavailable right now.'
          : 'Voice playback is unavailable.',
        error: null,
      }))
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'

    const handleEnded = () => {
      const audioUrl = detachAudioUrl()
      resetAudioElement()
      revokeAudioUrl(audioUrl)

      setState((currentState) => ({
        ...currentState,
        isPlaying: false,
        isLoading: false,
        activeUtteranceId: null,
      }))
    }

    const handleError = () => {
      if (!audioUrlRef.current) {
        return
      }

      const audioUrl = detachAudioUrl()
      resetAudioElement()
      revokeAudioUrl(audioUrl)

      disableVoice('Voice playback is unavailable on this device right now.')
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
      const audioUrl = detachAudioUrl()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      revokeAudioUrl(audioUrl)
    }
  }, [detachAudioUrl, disableVoice, refreshStatus, resetAudioElement, revokeAudioUrl])

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

      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        abortControllerRef.current?.abort()
      }, VOICE_REQUEST_TIMEOUT_MS)

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

        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.toLowerCase().startsWith('audio/')) {
          throw new Error(await getVoiceErrorMessage(response))
        }

        const audioBlob = await response.blob()
        if (audioBlob.size === 0) {
          throw new Error('Voice playback is unavailable right now.')
        }

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
        const audioUrl = detachAudioUrl()
        resetAudioElement()
        revokeAudioUrl(audioUrl)

        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOut) {
            disableVoice('Voice playback is unavailable right now.')
          } else {
            setState((currentState) => ({
              ...currentState,
              isLoading: false,
            }))
          }

          return
        }

        disableVoice(
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : 'Voice playback is unavailable right now.'
        )
      } finally {
        window.clearTimeout(timeoutId)
        abortControllerRef.current = null
      }
    },
    [
      detachAudioUrl,
      disableVoice,
      resetAudioElement,
      revokeAudioUrl,
      state.isConfigured,
      state.voiceEnabled,
      stop,
    ]
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
