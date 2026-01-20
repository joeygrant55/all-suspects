/**
 * PsychologyOverlay Component
 *
 * Makes suspect psychology VISIBLE through dynamic visual effects.
 * Pressure level affects lighting, grain, shake, and additional effects.
 */

import { useState, useEffect, useRef } from 'react'

interface PsychologyOverlayProps {
  pressureLevel: 1 | 2 | 3 | 4 | 5
  isLying: boolean
  nervousTicks: string[] // ["sweating", "avoiding_eye_contact"]
  onLieDetected?: () => void
}

// Pressure level configuration
const PRESSURE_CONFIG = {
  1: {
    lighting: 'rgba(212, 175, 55, 0.08)', // Warm gold
    grain: 0.02,
    shake: 0,
    mood: 'calm',
  },
  2: {
    lighting: 'rgba(212, 175, 55, 0.12)', // Warm gold, slightly more
    grain: 0.02,
    shake: 0,
    mood: 'calm',
  },
  3: {
    lighting: 'rgba(74, 144, 164, 0.15)', // Cool blue
    grain: 0.04,
    shake: 1,
    mood: 'nervous',
  },
  4: {
    lighting: 'rgba(255, 255, 255, 0.12)', // Harsh white
    grain: 0.06,
    shake: 2,
    mood: 'stressed',
  },
  5: {
    lighting: 'rgba(255, 255, 255, 0.2)', // Extreme contrast
    grain: 0.1,
    shake: 4,
    mood: 'breaking',
  },
}

// Nervous tick visual mappings
const TICK_VISUALS: Record<string, { icon: string; label: string }> = {
  sweating: { icon: '💧', label: 'Sweating' },
  avoiding_eye_contact: { icon: '👀', label: 'Avoiding eye contact' },
  fidgeting: { icon: '🤲', label: 'Fidgeting' },
  rapid_breathing: { icon: '💨', label: 'Rapid breathing' },
  stuttering: { icon: '💬', label: 'Stuttering' },
  defensive_posture: { icon: '🛡️', label: 'Defensive posture' },
  micro_expressions: { icon: '😬', label: 'Micro-expressions' },
  voice_crack: { icon: '🎤', label: 'Voice cracking' },
}

export function PsychologyOverlay({
  pressureLevel,
  isLying,
  nervousTicks,
  onLieDetected,
}: PsychologyOverlayProps) {
  const [lieFlash, setLieFlash] = useState(false)
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 })
  const [heartbeatPhase, setHeartbeatPhase] = useState(0)
  const [sweatDrops, setSweatDrops] = useState<Array<{ x: number; delay: number }>>([])
  const prevLyingRef = useRef(isLying)

  const config = PRESSURE_CONFIG[pressureLevel]

  // Trigger lie flash when isLying changes to true
  useEffect(() => {
    if (isLying && !prevLyingRef.current) {
      setLieFlash(true)
      onLieDetected?.()
      const timer = setTimeout(() => setLieFlash(false), 300)
      return () => clearTimeout(timer)
    }
    prevLyingRef.current = isLying
  }, [isLying, onLieDetected])

  // Camera shake effect
  useEffect(() => {
    if (config.shake === 0) {
      setShakeOffset({ x: 0, y: 0 })
      return
    }

    const interval = setInterval(() => {
      const amplitude = config.shake
      setShakeOffset({
        x: (Math.random() - 0.5) * 2 * amplitude,
        y: (Math.random() - 0.5) * 2 * amplitude,
      })
    }, 50)

    return () => clearInterval(interval)
  }, [config.shake])

  // Heartbeat vignette at level 5
  useEffect(() => {
    if (pressureLevel !== 5) {
      setHeartbeatPhase(0)
      return
    }

    const interval = setInterval(() => {
      setHeartbeatPhase((prev) => (prev + 1) % 100)
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [pressureLevel])

  // Sweat drops at level 4+
  useEffect(() => {
    if (pressureLevel < 4) {
      setSweatDrops([])
      return
    }

    const drops = Array.from({ length: pressureLevel === 5 ? 8 : 4 }, () => ({
      x: 10 + Math.random() * 80,
      delay: Math.random() * 2,
    }))
    setSweatDrops(drops)
  }, [pressureLevel])

  // Calculate heartbeat intensity (simulates pulse)
  const heartbeatIntensity = pressureLevel === 5
    ? 0.3 + 0.2 * Math.sin((heartbeatPhase / 100) * Math.PI * 2 * 1.2) // ~72 BPM feeling
    : 0

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
      }}
    >
      {/* Color overlay based on pressure */}
      <div
        className="absolute inset-0 mix-blend-overlay transition-colors duration-1000"
        style={{ backgroundColor: config.lighting }}
      />

      {/* Film grain overlay (intensity varies) */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: config.grain,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Heartbeat vignette at level 5 */}
      {pressureLevel === 5 && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            boxShadow: `inset 0 0 ${100 + heartbeatIntensity * 50}px rgba(139, 0, 0, ${heartbeatIntensity})`,
          }}
        />
      )}

      {/* Lie detection flash */}
      {lieFlash && (
        <div className="absolute inset-0 bg-red-900/30 animate-lie-flash" />
      )}

      {/* Micro-expression highlight (eyes glow when lying) */}
      {isLying && (
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="relative w-32 h-8">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Sweat drops at level 4+ */}
      {sweatDrops.map((drop, index) => (
        <div
          key={index}
          className="absolute animate-sweat-drop"
          style={{
            left: `${drop.x}%`,
            top: '-10px',
            animationDelay: `${drop.delay}s`,
          }}
        >
          <div className="w-1.5 h-3 bg-gradient-to-b from-blue-200/60 to-blue-400/40 rounded-full blur-[0.5px]" />
        </div>
      ))}

      {/* Nervous ticks indicator */}
      {nervousTicks.length > 0 && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          {nervousTicks.slice(0, 3).map((tick) => {
            const visual = TICK_VISUALS[tick] || { icon: '❓', label: tick }
            return (
              <div
                key={tick}
                className="flex items-center gap-2 px-2 py-1 bg-noir-black/60 backdrop-blur-sm rounded text-xs text-noir-gold/70 animate-fade-in"
              >
                <span className="text-sm">{visual.icon}</span>
                <span className="font-mono uppercase tracking-wider">{visual.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pressure level indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`w-2 h-6 rounded-sm transition-all duration-500 ${
                level <= pressureLevel
                  ? level <= 2
                    ? 'bg-noir-gold/70'
                    : level === 3
                    ? 'bg-blue-400/70'
                    : level === 4
                    ? 'bg-amber-400/70'
                    : 'bg-red-500/80 animate-pulse'
                  : 'bg-noir-cream/20'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-noir-cream/50 uppercase tracking-widest">
          {config.mood}
        </span>
      </div>

      {/* Watson whisper trigger zone */}
      {isLying && (
        <div className="absolute bottom-4 right-4 animate-watson-whisper">
          <div className="px-3 py-2 bg-noir-black/80 border border-amber-600/30 rounded-lg">
            <p className="text-xs text-amber-400/90 font-mono italic">
              "Something doesn't add up, sir..."
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lie-flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        .animate-lie-flash {
          animation: lie-flash 0.3s ease-out;
        }

        @keyframes sweat-drop {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(400px);
            opacity: 0;
          }
        }

        .animate-sweat-drop {
          animation: sweat-drop 3s ease-in infinite;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        @keyframes watson-whisper {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }

        .animate-watson-whisper {
          animation: watson-whisper 4s ease-in-out forwards;
        }

        @keyframes heartbeat-vignette {
          0%, 100% { box-shadow: inset 0 0 100px rgba(139, 0, 0, 0.3); }
          15% { box-shadow: inset 0 0 150px rgba(139, 0, 0, 0.5); }
          30% { box-shadow: inset 0 0 100px rgba(139, 0, 0, 0.3); }
          45% { box-shadow: inset 0 0 130px rgba(139, 0, 0, 0.4); }
        }

        @keyframes camera-shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, 2px); }
        }
      `}</style>
    </div>
  )
}
