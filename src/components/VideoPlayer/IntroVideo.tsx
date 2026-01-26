/**
 * IntroVideo Component
 *
 * Displays a cinematic character introduction video
 * when the player first approaches a suspect.
 */

import { useState, useEffect, useRef } from 'react'
import { generateIntroductionVideo } from '../../api/client'

interface IntroVideoProps {
  characterId: string
  characterName: string
  characterRole: string
  onComplete?: () => void
  onSkip?: () => void
}

type IntroState = 'loading' | 'playing' | 'complete' | 'error' | 'skipped'

export function IntroVideo({
  characterId,
  characterName,
  characterRole,
  onComplete,
  onSkip,
}: IntroVideoProps) {
  const [state, setState] = useState<IntroState>('loading')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [_error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadIntroVideo()
  }, [characterId])

  async function loadIntroVideo() {
    setState('loading')
    setError(null)

    try {
      const result = await generateIntroductionVideo(characterId)

      if (result.success && result.videoUrl) {
        setVideoUrl(result.videoUrl)
        setState('playing')
      } else {
        throw new Error(result.error || 'Failed to generate introduction')
      }
    } catch (err) {
      console.error('Intro video error:', err)
      // On error, just complete without video
      setState('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Auto-complete after showing error briefly
      setTimeout(() => {
        onComplete?.()
      }, 1500)
    }
  }

  function handleVideoEnd() {
    setState('complete')
    onComplete?.()
  }

  function handleSkip() {
    setState('skipped')
    onSkip?.()
    onComplete?.()
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center">
        {/* Dramatic opening curtain effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-noir-charcoal animate-slide-left" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-noir-charcoal animate-slide-right" />
        </div>

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-noir-gold/30 border-t-noir-gold rounded-full animate-spin mx-auto mb-6" />
          <p className="text-noir-gold font-serif text-xl tracking-widest">
            {characterName.toUpperCase()}
          </p>
          <p className="text-noir-cream/60 text-sm mt-2">
            {characterRole}
          </p>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 text-noir-cream/40 hover:text-noir-cream transition-colors text-sm"
        >
          Skip intro
        </button>
      </div>
    )
  }

  // Error state (brief display before auto-continuing)
  if (state === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center">
        <p className="text-noir-gold font-serif text-2xl mb-2">
          {characterName}
        </p>
        <p className="text-noir-cream/60 text-sm">
          {characterRole}
        </p>
      </div>
    )
  }

  // Playing/complete state
  if ((state === 'playing' || state === 'complete') && videoUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black">
        {/* Full-screen video */}
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onEnded={handleVideoEnd}
          onError={() => {
            setState('error')
            setError('Video playback failed')
            setTimeout(() => onComplete?.(), 1000)
          }}
        />

        {/* Noir overlay effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-noir-black/60" />

          {/* Letterbox bars for cinematic feel */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-noir-black" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-noir-black" />
        </div>

        {/* Character title card */}
        <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
          <div className="text-center animate-fade-in-up">
            <p className="text-noir-gold font-serif text-4xl tracking-widest mb-2">
              {characterName.toUpperCase()}
            </p>
            <p className="text-noir-cream/70 text-lg tracking-wide">
              {characterRole}
            </p>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute bottom-20 right-8 text-noir-cream/40 hover:text-noir-cream transition-colors text-sm z-10"
        >
          Skip
        </button>

        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
      </div>
    )
  }

  return null
}

// Add these animations to your CSS/Tailwind config
export const animationStyles = `
@keyframes slide-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes slide-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-left {
  animation: slide-left 1.5s ease-out forwards;
}

.animate-slide-right {
  animation: slide-right 1.5s ease-out forwards;
}

.animate-fade-in-up {
  animation: fade-in-up 1s ease-out 0.5s forwards;
  opacity: 0;
}
`
