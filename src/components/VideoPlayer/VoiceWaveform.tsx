/**
 * VoiceWaveform Component
 *
 * Animated waveform visualization that plays during voice-only playback.
 * Shows a character portrait with animated audio bars.
 */

import { useState, useEffect, useRef } from 'react'

interface VoiceWaveformProps {
  characterId: string
  characterName: string
  isPlaying: boolean
  analyserNode?: AnalyserNode
}

export function VoiceWaveform({
  characterId,
  characterName,
  isPlaying,
  analyserNode,
}: VoiceWaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0.1))
  const animationRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // Set up audio analysis
  useEffect(() => {
    if (analyserNode) {
      // Use frequency bin count to set up data array
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount)
    }
  }, [analyserNode])

  // Animate bars based on audio or fake animation
  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(20).fill(0.1))
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = () => {
      if (analyserNode && dataArrayRef.current) {
        // Real audio analysis
        analyserNode.getByteFrequencyData(dataArrayRef.current)
        const newBars = Array.from(dataArrayRef.current)
          .slice(0, 20)
          .map((v) => Math.max(0.1, v / 255))
        setBars(newBars)
      } else {
        // Fake animation for when no audio context
        setBars((prev) =>
          prev.map(() => Math.max(0.1, Math.min(1, 0.3 + Math.random() * 0.7)))
        )
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, analyserNode])

  // Character portrait placeholder colors
  const portraitColors: Record<string, string> = {
    victoria: 'from-purple-900/60 to-purple-800/40',
    thomas: 'from-blue-900/60 to-blue-800/40',
    eleanor: 'from-emerald-900/60 to-emerald-800/40',
    marcus: 'from-amber-900/60 to-amber-800/40',
    lillian: 'from-rose-900/60 to-rose-800/40',
    james: 'from-slate-900/60 to-slate-800/40',
  }

  const portraitColor = portraitColors[characterId] || 'from-noir-charcoal to-noir-slate'

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-noir-black">
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Character portrait circle */}
      <div className={`relative w-48 h-48 rounded-full bg-gradient-to-br ${portraitColor} border-2 border-noir-gold/30 shadow-2xl mb-8`}>
        {/* Inner glow when speaking */}
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              boxShadow: '0 0 40px rgba(201, 162, 39, 0.3), inset 0 0 40px rgba(201, 162, 39, 0.1)',
            }}
          />
        )}

        {/* Character initials */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-serif text-noir-cream/60">
            {characterName.split(' ').map((n) => n[0]).join('')}
          </span>
        </div>

        {/* Decorative ring */}
        <div className="absolute -inset-2 rounded-full border border-noir-gold/20" />
        <div className="absolute -inset-4 rounded-full border border-noir-gold/10" />
      </div>

      {/* Character name */}
      <p className="text-noir-cream font-serif text-xl mb-6">{characterName}</p>

      {/* Waveform bars */}
      <div className="flex items-end gap-1 h-16 px-4">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-2 bg-gradient-to-t from-noir-gold/50 to-noir-gold rounded-full transition-all duration-75"
            style={{
              height: `${height * 100}%`,
              opacity: isPlaying ? 0.8 + height * 0.2 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Speaking indicator */}
      {isPlaying && (
        <div className="mt-4 flex items-center gap-2 text-noir-cream/60 text-sm">
          <div className="w-2 h-2 rounded-full bg-noir-gold animate-pulse" />
          <span className="font-serif italic">Speaking...</span>
        </div>
      )}

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
