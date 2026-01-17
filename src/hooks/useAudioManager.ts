import { useEffect, useRef, useCallback, useState } from 'react'

// Audio file paths (relative to public folder)
const AUDIO_PATHS = {
  // Background music
  music: '/audio/jazz-ambient.mp3',

  // Room ambience
  ambience: {
    parlor: '/audio/ambience-fireplace.mp3',
    study: '/audio/ambience-clock.mp3',
    'dining-room': '/audio/ambience-clock.mp3',
    hallway: '/audio/ambience-wind.mp3',
    kitchen: '/audio/ambience-kitchen.mp3',
    garden: '/audio/ambience-wind.mp3',
  } as Record<string, string>,

  // UI Sound effects
  sfx: {
    footstep: '/audio/sfx-footstep.mp3',
    click: '/audio/sfx-click.mp3',
    evidenceFound: '/audio/sfx-evidence.mp3',
    doorOpen: '/audio/sfx-door.mp3',
    conversationStart: '/audio/sfx-conversation.mp3',
  },
}

interface AudioManagerState {
  musicEnabled: boolean
  sfxEnabled: boolean
  ambienceEnabled: boolean
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  ambienceVolume: number
}

interface AudioManagerActions {
  playMusic: () => void
  stopMusic: () => void
  playSfx: (sound: keyof typeof AUDIO_PATHS.sfx) => void
  setRoomAmbience: (room: string | null) => void
  setMasterVolume: (volume: number) => void
  setMusicVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  setAmbienceVolume: (volume: number) => void
  toggleMusic: () => void
  toggleSfx: () => void
  toggleAmbience: () => void
  initializeAudio: () => void
}

export type AudioManager = AudioManagerState & AudioManagerActions

export function useAudioManager(): AudioManager {
  const [state, setState] = useState<AudioManagerState>({
    musicEnabled: false, // Disabled by default until audio files are added
    sfxEnabled: false,
    ambienceEnabled: false,
    masterVolume: 0.7,
    musicVolume: 0.4,
    sfxVolume: 0.6,
    ambienceVolume: 0.3,
  })

  // Audio element refs
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const ambienceRef = useRef<HTMLAudioElement | null>(null)
  const sfxPoolRef = useRef<HTMLAudioElement[]>([])
  const currentRoomRef = useRef<string | null>(null)
  const audioInitializedRef = useRef(false)

  // Create audio elements on mount
  useEffect(() => {
    // Create music audio element
    musicRef.current = new Audio()
    musicRef.current.loop = true
    musicRef.current.preload = 'auto'

    // Create ambience audio element
    ambienceRef.current = new Audio()
    ambienceRef.current.loop = true
    ambienceRef.current.preload = 'auto'

    // Create SFX pool (for overlapping sounds)
    sfxPoolRef.current = Array(5).fill(null).map(() => {
      const audio = new Audio()
      audio.preload = 'auto'
      return audio
    })

    return () => {
      musicRef.current?.pause()
      ambienceRef.current?.pause()
      sfxPoolRef.current.forEach(audio => audio.pause())
    }
  }, [])

  // Update volumes when state changes
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = state.musicEnabled
        ? state.masterVolume * state.musicVolume
        : 0
    }
    if (ambienceRef.current) {
      ambienceRef.current.volume = state.ambienceEnabled
        ? state.masterVolume * state.ambienceVolume
        : 0
    }
  }, [state.masterVolume, state.musicVolume, state.ambienceVolume, state.musicEnabled, state.ambienceEnabled])

  // Initialize audio (must be called from user interaction)
  const initializeAudio = useCallback(() => {
    if (audioInitializedRef.current) return

    // Try to load and play music
    if (musicRef.current && state.musicEnabled) {
      musicRef.current.src = AUDIO_PATHS.music
      musicRef.current.volume = state.masterVolume * state.musicVolume
      musicRef.current.play().catch(() => {
        // Audio file not found or blocked - silently fail
        console.log('Background music not loaded (file may not exist yet)')
      })
    }

    audioInitializedRef.current = true
  }, [state.musicEnabled, state.masterVolume, state.musicVolume])

  // Play background music
  const playMusic = useCallback(() => {
    if (!musicRef.current || !state.musicEnabled) return

    if (!musicRef.current.src) {
      musicRef.current.src = AUDIO_PATHS.music
    }

    musicRef.current.play().catch(() => {
      console.log('Could not play music')
    })
  }, [state.musicEnabled])

  // Stop background music
  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause()
      musicRef.current.currentTime = 0
    }
  }, [])

  // Play a sound effect
  const playSfx = useCallback((sound: keyof typeof AUDIO_PATHS.sfx) => {
    if (!state.sfxEnabled) return

    const path = AUDIO_PATHS.sfx[sound]
    if (!path) return

    // Find an available audio element from the pool
    const audio = sfxPoolRef.current.find(a => a.paused || a.ended) || sfxPoolRef.current[0]
    if (audio) {
      audio.src = path
      audio.volume = state.masterVolume * state.sfxVolume
      audio.currentTime = 0
      audio.play().catch(() => {
        // SFX file not found - silently fail
      })
    }
  }, [state.sfxEnabled, state.masterVolume, state.sfxVolume])

  // Set room ambience
  const setRoomAmbience = useCallback((room: string | null) => {
    if (!ambienceRef.current || !state.ambienceEnabled) return
    if (room === currentRoomRef.current) return

    currentRoomRef.current = room

    if (!room) {
      ambienceRef.current.pause()
      return
    }

    const ambiencePath = AUDIO_PATHS.ambience[room]
    if (!ambiencePath) {
      ambienceRef.current.pause()
      return
    }

    // Crossfade to new ambience
    const fadeOut = () => {
      if (ambienceRef.current && ambienceRef.current.volume > 0.01) {
        ambienceRef.current.volume = Math.max(0, ambienceRef.current.volume - 0.05)
        requestAnimationFrame(fadeOut)
      } else if (ambienceRef.current) {
        ambienceRef.current.src = ambiencePath
        ambienceRef.current.volume = 0
        ambienceRef.current.play().catch(() => {})

        // Fade in
        const fadeIn = () => {
          const targetVolume = state.masterVolume * state.ambienceVolume
          if (ambienceRef.current && ambienceRef.current.volume < targetVolume - 0.01) {
            ambienceRef.current.volume = Math.min(targetVolume, ambienceRef.current.volume + 0.02)
            requestAnimationFrame(fadeIn)
          }
        }
        fadeIn()
      }
    }

    if (ambienceRef.current.src) {
      fadeOut()
    } else {
      ambienceRef.current.src = ambiencePath
      ambienceRef.current.volume = state.masterVolume * state.ambienceVolume
      ambienceRef.current.play().catch(() => {})
    }
  }, [state.ambienceEnabled, state.masterVolume, state.ambienceVolume])

  // Volume setters
  const setMasterVolume = useCallback((volume: number) => {
    setState(s => ({ ...s, masterVolume: Math.max(0, Math.min(1, volume)) }))
  }, [])

  const setMusicVolume = useCallback((volume: number) => {
    setState(s => ({ ...s, musicVolume: Math.max(0, Math.min(1, volume)) }))
  }, [])

  const setSfxVolume = useCallback((volume: number) => {
    setState(s => ({ ...s, sfxVolume: Math.max(0, Math.min(1, volume)) }))
  }, [])

  const setAmbienceVolume = useCallback((volume: number) => {
    setState(s => ({ ...s, ambienceVolume: Math.max(0, Math.min(1, volume)) }))
  }, [])

  // Toggle functions
  const toggleMusic = useCallback(() => {
    setState(s => {
      const newEnabled = !s.musicEnabled
      if (newEnabled) {
        musicRef.current?.play().catch(() => {})
      } else {
        musicRef.current?.pause()
      }
      return { ...s, musicEnabled: newEnabled }
    })
  }, [])

  const toggleSfx = useCallback(() => {
    setState(s => ({ ...s, sfxEnabled: !s.sfxEnabled }))
  }, [])

  const toggleAmbience = useCallback(() => {
    setState(s => {
      const newEnabled = !s.ambienceEnabled
      if (!newEnabled) {
        ambienceRef.current?.pause()
      } else if (currentRoomRef.current) {
        setRoomAmbience(currentRoomRef.current)
      }
      return { ...s, ambienceEnabled: newEnabled }
    })
  }, [setRoomAmbience])

  return {
    ...state,
    playMusic,
    stopMusic,
    playSfx,
    setRoomAmbience,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setAmbienceVolume,
    toggleMusic,
    toggleSfx,
    toggleAmbience,
    initializeAudio,
  }
}

// Audio context for components
import { createContext, useContext } from 'react'

export const AudioContext = createContext<AudioManager | null>(null)

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
