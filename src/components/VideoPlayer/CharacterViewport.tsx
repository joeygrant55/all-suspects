/**
 * CharacterViewport Component
 *
 * Cinematic character portrait with atmospheric noir effects.
 * Shows the character in dramatic lighting while awaiting questions.
 */

import { useState, useEffect, useRef } from 'react'

interface CharacterViewportProps {
  characterId: string
  characterName: string
  characterRole: string
  pressureLevel?: number
  isWaiting?: boolean
  onReady?: () => void
}

// Character visual descriptions for portrait atmosphere
const CHARACTER_VISUALS: Record<string, {
  color: string
  accent: string
  atmosphere: string
  silhouette: string
  props: string[]
}> = {
  victoria: {
    color: 'from-purple-950/80 via-purple-900/60 to-noir-black',
    accent: 'purple-400',
    atmosphere: 'Regal, cold, calculating',
    silhouette: 'Elegant posture, pearl necklace catching light',
    props: ['champagne glass', 'cigarette holder'],
  },
  thomas: {
    color: 'from-blue-950/80 via-blue-900/60 to-noir-black',
    accent: 'blue-400',
    atmosphere: 'Nervous, defensive, young',
    silhouette: 'Slouched, hands in pockets, looking away',
    props: ['loosened tie', 'whiskey glass'],
  },
  eleanor: {
    color: 'from-emerald-950/80 via-emerald-900/60 to-noir-black',
    accent: 'emerald-400',
    atmosphere: 'Professional, secretive, composed',
    silhouette: 'Straight posture, glasses reflecting light',
    props: ['documents', 'pen'],
  },
  marcus: {
    color: 'from-amber-950/80 via-amber-900/60 to-noir-black',
    accent: 'amber-400',
    atmosphere: 'Weathered, wise, hiding something',
    silhouette: 'Medical bag nearby, thoughtful pose',
    props: ['pocket watch', 'medical bag'],
  },
  lillian: {
    color: 'from-rose-950/80 via-rose-900/60 to-noir-black',
    accent: 'rose-400',
    atmosphere: 'Glamorous, mysterious, knowing',
    silhouette: 'Dramatic pose, fur stole, cigarette',
    props: ['cigarette', 'compact mirror'],
  },
  james: {
    color: 'from-slate-900/80 via-slate-800/60 to-noir-black',
    accent: 'slate-400',
    atmosphere: 'Formal, observant, loyal',
    silhouette: 'Standing at attention, white gloves visible',
    props: ['silver tray', 'white gloves'],
  },
}

export function CharacterViewport({
  characterId,
  characterName,
  characterRole,
  pressureLevel = 0,
  isWaiting = true,
  onReady,
}: CharacterViewportProps) {
  const [isEntering, setIsEntering] = useState(true)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [breathPhase, setBreathPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visual = CHARACTER_VISUALS[characterId] || CHARACTER_VISUALS.james

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false)
      onReady?.()
    }, 1500)
    return () => clearTimeout(timer)
  }, [onReady])

  // Breathing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Track mouse for eye follow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setMousePosition({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Calculate subtle movements based on breath and mouse
  const breathOffset = Math.sin(breathPhase * Math.PI / 180) * 2
  const eyeOffsetX = (mousePosition.x - 0.5) * 8
  const eyeOffsetY = (mousePosition.y - 0.5) * 4

  // Pressure affects visual state
  const isNervous = pressureLevel >= 3
  const isCracking = pressureLevel >= 4

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(180deg, ${visual.color.split(' ').join(', ').replace(/from-|via-|to-/g, '')})`,
      }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${visual.color}`} />

      {/* Dramatic spotlight from above */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, rgba(255,250,240,0.15) 0%, transparent 70%)`,
        }}
      />

      {/* Side light (interrogation lamp effect) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 30% 50% at 85% 50%, rgba(201, 162, 39, 0.1) 0%, transparent 60%)`,
        }}
      />

      {/* Animated dust particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-noir-cream/20 rounded-full"
            style={{
              left: `${10 + (i * 7) % 80}%`,
              top: `${(i * 13 + breathPhase / 2) % 100}%`,
              opacity: 0.1 + (i % 3) * 0.1,
              transform: `translateY(${Math.sin((breathPhase + i * 30) * Math.PI / 180) * 10}px)`,
              transition: 'transform 0.5s ease-out',
            }}
          />
        ))}
      </div>

      {/* Light rays from window */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full opacity-20"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(255,250,240,0.1) 20%, transparent 40%, rgba(255,250,240,0.05) 60%, transparent 80%)`,
          transform: `skewX(-15deg) translateX(20%)`,
        }}
      />

      {/* Character silhouette container */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
          isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          transform: `translateY(${breathOffset}px)`,
        }}
      >
        {/* Character portrait circle with glow */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className={`absolute -inset-8 rounded-full opacity-30 blur-xl transition-all duration-500 ${
              isCracking ? 'bg-noir-blood' : isNervous ? 'bg-amber-500' : `bg-${visual.accent}`
            }`}
            style={{
              transform: `scale(${1 + Math.sin(breathPhase * Math.PI / 180) * 0.05})`,
            }}
          />

          {/* Portrait container */}
          <div
            className="relative w-56 h-56 rounded-full overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(15,15,15,0.95) 100%)`,
              boxShadow: `
                0 0 60px rgba(0,0,0,0.8),
                inset 0 0 30px rgba(0,0,0,0.5),
                0 0 100px rgba(201, 162, 39, 0.1)
              `,
              border: '2px solid rgba(201, 162, 39, 0.2)',
            }}
          >
            {/* Inner gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${visual.color} opacity-60`} />

            {/* Character initials (large, dramatic) */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              <span
                className="text-7xl font-serif font-bold tracking-wider"
                style={{
                  color: `rgba(245, 240, 230, ${isNervous ? 0.4 : 0.25})`,
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                {characterName.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>

            {/* Subtle face highlight (implies features) */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 40% 30% at ${50 + eyeOffsetX}% ${40 + eyeOffsetY}%, rgba(255,250,240,0.08) 0%, transparent 60%)`,
              }}
            />

            {/* Nervous sweat drops (when under pressure) */}
            {isNervous && (
              <div
                className="absolute top-1/4 right-1/4 w-2 h-3 bg-gradient-to-b from-transparent via-white/20 to-white/10 rounded-full"
                style={{
                  transform: `translateY(${breathPhase % 60}px)`,
                  opacity: (60 - (breathPhase % 60)) / 60,
                }}
              />
            )}
          </div>

          {/* Character name plate */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
            <p
              className="text-noir-cream font-serif text-2xl tracking-wide"
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              {characterName}
            </p>
            <p className="text-noir-smoke text-sm mt-1 tracking-widest uppercase">
              {characterRole}
            </p>
          </div>
        </div>
      </div>

      {/* Waiting indicator with dramatic styling */}
      {isWaiting && !isEntering && (
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-noir-gold/50 to-transparent" />
            <p className="text-noir-gold/80 text-sm font-serif italic tracking-wide">
              Awaiting your question
            </p>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-noir-gold/50 to-transparent" />
          </div>

          {/* Subtle pulsing dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-noir-gold/40"
                style={{
                  animation: `pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Entrance spotlight animation */}
      {isEntering && (
        <div
          className="absolute inset-0 bg-noir-black"
          style={{
            animation: 'spotlightReveal 1.5s ease-out forwards',
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        @keyframes spotlightReveal {
          0% {
            clip-path: circle(0% at 50% 50%);
            opacity: 1;
          }
          100% {
            clip-path: circle(150% at 50% 50%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
