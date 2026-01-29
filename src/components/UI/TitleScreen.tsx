import { useContext } from 'react'
import { AudioContext } from '../../hooks/useAudioManager'

interface TitleScreenProps {
  onNewGame?: () => void
}

export function TitleScreen({ onNewGame }: TitleScreenProps) {
  const audioManager = useContext(AudioContext)

  const handleStart = () => {
    // Initialize audio on user interaction (required by browsers)
    audioManager?.initializeAudio()
    // Show mystery selection screen
    if (onNewGame) {
      onNewGame()
    }
  }

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Fog effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(201, 162, 39, 0.1) 50%, transparent 100%)',
          animation: 'fog 10s ease-in-out infinite',
        }}
      />

      {/* Title */}
      <div className="relative z-10 text-center">
        <h1
          className="text-7xl font-bold tracking-wider mb-2"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#c9a227',
            textShadow: '0 0 40px rgba(201, 162, 39, 0.5), 0 0 80px rgba(201, 162, 39, 0.3)',
          }}
        >
          ALL SUSPECTS
        </h1>
        <div
          className="text-noir-cream text-xl tracking-[0.3em] mb-12"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          A MURDER MYSTERY
        </div>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-noir-gold" />
          <div className="w-2 h-2 rotate-45 bg-noir-gold" />
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-noir-gold" />
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="group relative px-12 py-4 border-2 border-noir-gold text-noir-gold text-lg tracking-widest transition-all duration-300 hover:bg-noir-gold hover:text-noir-black"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          BEGIN INVESTIGATION
          <span className="absolute inset-0 bg-noir-gold opacity-0 group-hover:opacity-10 transition-opacity" />
        </button>

        {/* Subtitle */}
        <p className="text-noir-slate text-sm mt-16 tracking-wide">
          New Year's Eve, 1929 — Ashford Manor
        </p>
      </div>

      {/* Bottom attribution */}
      <div className="absolute bottom-6 text-noir-slate text-xs tracking-wider">
        Powered by Claude AI
      </div>

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-noir-gold opacity-50" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-noir-gold opacity-50" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-noir-gold opacity-50" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-noir-gold opacity-50" />
    </div>
  )
}
