/**
 * CinematicLoader Component
 *
 * Film noir loading screen with film reel animation.
 * Displays character recall text and optional initial voice playback.
 */

import { useState, useEffect } from 'react'

interface CinematicLoaderProps {
  characterName: string
  stage: 'analyzing' | 'generating-voice' | 'generating-video' | 'ready'
  progress?: number
  message?: string
}

export function CinematicLoader({
  characterName,
  stage,
  progress = 0,
  message,
}: CinematicLoaderProps) {
  const [dots, setDots] = useState('...')

  // Animate ellipsis
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  const getStageText = () => {
    switch (stage) {
      case 'analyzing':
        return 'Recalling memory'
      case 'generating-voice':
        return 'Finding words'
      case 'generating-video':
        return 'Visualizing'
      case 'ready':
        return 'Memory restored'
      default:
        return 'Processing'
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-noir-black overflow-hidden">
      {/* Sepia vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(15, 12, 8, 0.4) 0%, rgba(10, 10, 10, 1) 100%)',
        }}
      />

      {/* Film reel animation */}
      <div className="relative w-24 h-24 mb-8">
        {/* Outer ring - spinning */}
        <div
          className="absolute inset-0 border-4 border-noir-gold/30 rounded-full"
          style={{
            animation: 'spin 3s linear infinite',
          }}
        >
          {/* Sprocket holes */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-noir-black rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 45}deg) translateY(-44px) translate(-50%, -50%)`,
              }}
            />
          ))}
        </div>

        {/* Middle ring - counter-spinning */}
        <div
          className="absolute inset-4 border-2 border-t-noir-gold border-noir-slate/30 rounded-full"
          style={{
            animation: 'spin 1.5s linear infinite reverse',
          }}
        />

        {/* Inner circle - pulsing */}
        <div
          className="absolute inset-8 bg-noir-gold/20 rounded-full"
          style={{
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />

        {/* Center dot */}
        <div className="absolute inset-10 bg-noir-gold/40 rounded-full" />
      </div>

      {/* Character recall text */}
      <div className="text-center mb-6">
        <p className="text-noir-cream/50 text-xs uppercase tracking-[0.3em] mb-2">
          {getStageText()}{dots}
        </p>
        <p className="text-noir-cream font-serif text-lg italic">
          "{characterName} recalls{dots}"
        </p>
      </div>

      {/* Custom message if provided */}
      {message && (
        <p className="text-noir-smoke text-sm font-serif italic max-w-xs text-center mb-6">
          "{message}"
        </p>
      )}

      {/* Progress bar */}
      <div className="w-64 h-1 bg-noir-slate/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-noir-gold/60 via-noir-gold to-noir-gold/60 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress percentage */}
      <p className="text-noir-smoke text-xs mt-2">
        {Math.round(progress)}%
      </p>

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none animate-pulse"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative film strip borders */}
      <div className="absolute top-0 left-0 right-0 h-8 flex">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="flex-1 border-x border-noir-slate/20 flex items-center justify-center"
          >
            <div className="w-2 h-4 bg-noir-slate/10 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-8 flex">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="flex-1 border-x border-noir-slate/20 flex items-center justify-center"
          >
            <div className="w-2 h-4 bg-noir-slate/10 rounded-sm" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
