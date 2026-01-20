/**
 * CinematicVideoPlayer Component
 *
 * Enhanced video player with film-like presentation for interrogation scenes.
 * Features film reel loading, Ken Burns portrait mode, and smooth video crossfades.
 */

import { useState, useEffect, useRef } from 'react'

interface CinematicVideoPlayerProps {
  videoUrl: string | null
  isLoading: boolean
  isPlayingVoice: boolean
  voiceWaveform?: number[] // Audio visualization data
  characterPortrait: string // Character ID for portrait
  characterName?: string
  onVideoEnd?: () => void
}

// Ken Burns animation presets
const KEN_BURNS_ANIMATIONS = [
  { from: 'scale-100 translate-x-0 translate-y-0', to: 'scale-110 translate-x-2 translate-y-1' },
  { from: 'scale-110 translate-x-2 translate-y-2', to: 'scale-100 translate-x-0 translate-y-0' },
  { from: 'scale-105 translate-x-1 translate-y-0', to: 'scale-115 -translate-x-1 translate-y-2' },
  { from: 'scale-100 -translate-x-1 translate-y-1', to: 'scale-108 translate-x-1 -translate-y-1' },
]

// Character portrait gradients
const CHARACTER_GRADIENTS: Record<string, string> = {
  victoria: 'from-purple-950 via-purple-900/80 to-noir-black',
  thomas: 'from-blue-950 via-blue-900/80 to-noir-black',
  eleanor: 'from-emerald-950 via-emerald-900/80 to-noir-black',
  marcus: 'from-amber-950 via-amber-900/80 to-noir-black',
  lillian: 'from-rose-950 via-rose-900/80 to-noir-black',
  james: 'from-slate-900 via-slate-800/80 to-noir-black',
}

export function CinematicVideoPlayer({
  videoUrl,
  isLoading,
  isPlayingVoice,
  voiceWaveform = [],
  characterPortrait,
  characterName = '',
  onVideoEnd,
}: CinematicVideoPlayerProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [kenBurnsIndex, setKenBurnsIndex] = useState(0)
  const [dustParticles, setDustParticles] = useState<Array<{ x: number; y: number; size: number; speed: number }>>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const gradient = CHARACTER_GRADIENTS[characterPortrait] || CHARACTER_GRADIENTS.james

  // Initialize dust particles
  useEffect(() => {
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      speed: 0.5 + Math.random() * 1.5,
    }))
    setDustParticles(particles)
  }, [])

  // Ken Burns animation cycle
  useEffect(() => {
    if (isPlayingVoice && !videoUrl) {
      const interval = setInterval(() => {
        setKenBurnsIndex((prev) => (prev + 1) % KEN_BURNS_ANIMATIONS.length)
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [isPlayingVoice, videoUrl])

  // Film countdown when loading completes
  useEffect(() => {
    if (isLoading) {
      setCountdown(null)
      setShowVideo(false)
      setVideoReady(false)
    }
  }, [isLoading])

  // Handle video URL change - trigger countdown
  useEffect(() => {
    if (videoUrl && !isLoading && !showVideo) {
      // Start film countdown
      setCountdown(3)
    }
  }, [videoUrl, isLoading])

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 600)
      return () => clearTimeout(timer)
    } else {
      // Countdown finished, show video
      setShowVideo(true)
      if (videoRef.current) {
        videoRef.current.play().catch(console.error)
      }
    }
  }, [countdown])

  // Handle video load
  const handleVideoCanPlay = () => {
    setVideoReady(true)
  }

  const handleVideoEnded = () => {
    onVideoEnd?.()
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-noir-black rounded-lg"
    >
      {/* Film sprocket holes (sides) */}
      <div className="absolute left-0 top-0 bottom-0 w-6 z-20 pointer-events-none">
        <div className="h-full film-sprockets opacity-60" />
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-6 z-20 pointer-events-none">
        <div className="h-full film-sprockets opacity-60" />
      </div>

      {/* Letterbox bars */}
      <div className="absolute inset-x-0 top-0 h-[8%] bg-noir-black z-10" />
      <div className="absolute inset-x-0 bottom-0 h-[8%] bg-noir-black z-10" />

      {/* Loading State - Film Reel Animation */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
          {/* Reel indicator */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-noir-gold/30 rounded-full animate-spin-slow">
              <div className="absolute inset-2 border-2 border-noir-gold/20 rounded-full" />
              <div className="absolute inset-4 border border-noir-gold/10 rounded-full" />
              {/* Sprocket holes on reel */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-noir-black rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-28px)`,
                  }}
                />
              ))}
            </div>
            {/* Center hub */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-noir-gold/40 rounded-full" />
            </div>
          </div>

          {/* Reel text */}
          <div className="text-noir-gold/60 text-sm tracking-[0.3em] uppercase font-mono animate-flicker">
            REEL 1
          </div>

          {/* Film strip decoration */}
          <div className="mt-4 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-8 h-6 border border-noir-gold/20 rounded-sm"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Countdown Display */}
      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-noir-black">
          <div className="relative">
            {/* Circle countdown */}
            <svg className="w-32 h-32" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(201, 162, 39, 0.3)"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#C9A227"
                strokeWidth="2"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * (3 - countdown)) / 3}
                transform="rotate(-90 50 50)"
                className="transition-all duration-500"
              />
            </svg>
            {/* Number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-5xl font-bold text-noir-gold font-mono animate-countdown-pulse"
                key={countdown}
              >
                {countdown}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Portrait with Ken Burns (Voice-only mode) */}
      {!showVideo && !isLoading && countdown === null && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Ken Burns animated background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-[8000ms] ease-linear`}
            style={{
              transform: `scale(${1 + kenBurnsIndex * 0.02}) translate(${(kenBurnsIndex % 2) * 2}%, ${(kenBurnsIndex % 3) * 1}%)`,
            }}
          >
            {/* Character portrait/silhouette */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="text-[12rem] font-serif font-bold text-white/10 transition-transform duration-[8000ms]"
                style={{
                  transform: `scale(${1.1 + kenBurnsIndex * 0.05}) translate(${(kenBurnsIndex % 2 - 0.5) * 10}px, ${(kenBurnsIndex % 3 - 1) * 5}px)`,
                }}
              >
                {characterName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            </div>

            {/* Light rays */}
            <div
              className="absolute top-0 right-0 w-1/2 h-full opacity-10"
              style={{
                background:
                  'linear-gradient(135deg, transparent 0%, rgba(255,250,240,0.1) 20%, transparent 40%)',
                transform: 'skewX(-15deg)',
              }}
            />
          </div>

          {/* Dust particles / light motes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {dustParticles.map((particle, i) => (
              <div
                key={i}
                className="absolute bg-noir-cream/20 rounded-full animate-float-dust"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animationDuration: `${10 / particle.speed}s`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Voice waveform visualization */}
          {isPlayingVoice && (
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex items-end gap-1 h-16">
              {(voiceWaveform.length > 0 ? voiceWaveform : Array(20).fill(0.3)).map((amplitude, i) => (
                <div
                  key={i}
                  className="w-1 bg-noir-gold/60 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, amplitude * 60)}px`,
                    opacity: 0.4 + amplitude * 0.6,
                  }}
                />
              ))}
            </div>
          )}

          {/* Character name */}
          {characterName && (
            <div className="absolute bottom-[20%] left-0 right-0 text-center">
              <p className="text-noir-cream/80 text-xl font-serif tracking-wider">
                {characterName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      {videoUrl && (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            showVideo && videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onCanPlay={handleVideoCanPlay}
            onEnded={handleVideoEnded}
            playsInline
            muted={false}
          />
        </div>
      )}

      {/* Film grain overlay (always present) */}
      <div
        className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.015]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      <style>{`
        .film-sprockets {
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 8px,
            #1a1a1a 8px,
            #1a1a1a 12px,
            transparent 12px,
            transparent 20px
          );
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        @keyframes flicker {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.4; }
          52% { opacity: 0.7; }
          54% { opacity: 0.5; }
        }

        .animate-flicker {
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes countdown-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); }
          100% { transform: scale(0.9); opacity: 0.8; }
        }

        .animate-countdown-pulse {
          animation: countdown-pulse 0.6s ease-out;
        }

        @keyframes float-dust {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-20px) translateX(5px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-10px) translateX(-5px);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-30px) translateX(3px);
            opacity: 0.5;
          }
        }

        .animate-float-dust {
          animation: float-dust 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
