/**
 * Character Portrait Component
 * 
 * Displays a cinematic video portrait of the character being interrogated.
 * Automatically switches based on emotional state from the Agent SDK.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getCharacterPortrait,
  checkPortraitStatus,
  type EmotionalState,
  type PortraitResult,
} from '../../api/client'

interface CharacterPortraitProps {
  characterId: string
  characterName: string
  emotionalState: EmotionalState
  intensity?: number
  tells?: string[]
  observableHint?: string
  className?: string
}

// Fallback static images for when video isn't ready (future use)
// const CHARACTER_FALLBACK_IMAGES: Record<string, string> = {
//   victoria: '/portraits/victoria.jpg',
//   thomas: '/portraits/thomas.jpg',
//   eleanor: '/portraits/eleanor.jpg',
//   marcus: '/portraits/marcus.jpg',
//   lillian: '/portraits/lillian.jpg',
//   james: '/portraits/james.jpg',
// }

// Emotion-based overlay colors for visual feedback
const EMOTION_OVERLAYS: Record<EmotionalState, { color: string; pulse: boolean }> = {
  composed: { color: 'transparent', pulse: false },
  nervous: { color: 'rgba(255, 200, 100, 0.05)', pulse: true },
  defensive: { color: 'rgba(200, 100, 100, 0.08)', pulse: false },
  breaking: { color: 'rgba(150, 50, 50, 0.12)', pulse: true },
  relieved: { color: 'rgba(100, 200, 150, 0.05)', pulse: false },
  hostile: { color: 'rgba(255, 50, 50, 0.1)', pulse: false },
}

export function CharacterPortrait({
  characterId,
  characterName,
  emotionalState,
  intensity = 50,
  tells = [],
  observableHint,
  className = '',
}: CharacterPortraitProps) {
  const [portrait, setPortrait] = useState<PortraitResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch portrait when character or emotional state changes
  const fetchPortrait = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getCharacterPortrait(characterId, emotionalState, intensity)
      setPortrait(result)

      if (result.status === 'generating' || result.status === 'pending') {
        // Start polling for completion
        startPolling()
      } else if (result.status === 'ready' && result.videoUrl) {
        setIsLoading(false)
      } else if (result.status === 'error') {
        setError(result.error || 'Failed to generate portrait')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch portrait:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portrait')
      setIsLoading(false)
    }
  }, [characterId, emotionalState, intensity])

  // Poll for portrait generation status
  const startPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
    }

    pollInterval.current = setInterval(async () => {
      try {
        const status = await checkPortraitStatus(characterId, emotionalState)
        if (status) {
          setPortrait(status)
          if (status.status === 'ready' || status.status === 'error') {
            if (pollInterval.current) {
              clearInterval(pollInterval.current)
              pollInterval.current = null
            }
            setIsLoading(false)
            if (status.status === 'error') {
              setError(status.error || 'Generation failed')
            }
          }
        }
      } catch (err) {
        console.error('Error polling portrait status:', err)
      }
    }, 3000)
  }, [characterId, emotionalState])

  useEffect(() => {
    fetchPortrait()

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [fetchPortrait])

  // Show observable hint with delay
  useEffect(() => {
    if (observableHint) {
      const timer = setTimeout(() => setShowHint(true), 1500)
      return () => clearTimeout(timer)
    } else {
      setShowHint(false)
    }
  }, [observableHint])

  // Handle video playback
  useEffect(() => {
    if (portrait?.videoUrl && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's okay
      })
    }
  }, [portrait?.videoUrl])

  const overlay = EMOTION_OVERLAYS[emotionalState]

  return (
    <div className={`relative overflow-hidden rounded-lg bg-noir-charcoal ${className}`}>
      {/* Video or Fallback Image */}
      <div className="relative aspect-[4/3] w-full">
        {portrait?.status === 'ready' && portrait.videoUrl ? (
          <video
            ref={videoRef}
            src={portrait.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            onError={() => setError('Video playback failed')}
          />
        ) : (
          <div className="w-full h-full bg-noir-slate flex items-center justify-center">
            {/* Placeholder silhouette */}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-noir-charcoal/50 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-noir-cream/20"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <p className="text-noir-cream/40 text-sm font-serif">{characterName}</p>
              {isLoading && (
                <p className="text-noir-gold/60 text-xs mt-2 animate-pulse">
                  Visualizing...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Emotional State Overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${
            overlay.pulse ? 'animate-pulse' : ''
          }`}
          style={{ backgroundColor: overlay.color }}
        />

        {/* Film Grain Effect */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-noir-black/60" />

        {/* Bottom gradient for text */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-noir-black/80 to-transparent pointer-events-none" />
      </div>

      {/* Character Name Badge */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-noir-cream font-serif text-lg">{characterName}</h3>
            <p className="text-noir-smoke text-xs capitalize">
              {emotionalState !== 'composed' && (
                <span className={`${
                  emotionalState === 'breaking' ? 'text-noir-blood' :
                  emotionalState === 'hostile' ? 'text-red-400' :
                  emotionalState === 'nervous' ? 'text-yellow-400/70' :
                  'text-noir-smoke'
                }`}>
                  {emotionalState}
                </span>
              )}
            </p>
          </div>
          
          {/* Intensity indicator */}
          {intensity > 40 && (
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, Math.floor(intensity / 20)))].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    intensity > 80 ? 'bg-noir-blood' :
                    intensity > 60 ? 'bg-yellow-500' :
                    'bg-noir-gold/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Observable Tells */}
      {tells.length > 0 && (
        <div className="absolute top-3 right-3">
          <div className="bg-noir-black/70 rounded px-2 py-1 border border-noir-slate/30">
            {tells.slice(0, 2).map((tell, i) => (
              <p key={i} className="text-noir-cream/60 text-xs italic">
                {tell}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Observable Hint (Detective Insight) */}
      {showHint && observableHint && (
        <div className="absolute top-3 left-3 right-3 animate-fade-in">
          <div className="bg-noir-gold/20 border border-noir-gold/40 rounded px-3 py-2">
            <p className="text-noir-cream text-xs italic">
              💡 {observableHint}
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-noir-black/50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-noir-gold/30 border-t-noir-gold rounded-full animate-spin" />
            <p className="text-noir-cream/60 text-xs mt-2">Generating portrait...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute bottom-12 left-3 right-3">
          <p className="text-noir-blood/80 text-xs bg-noir-black/60 rounded px-2 py-1">
            {error}
          </p>
        </div>
      )}
    </div>
  )
}

export default CharacterPortrait
