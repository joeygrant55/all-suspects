import { useContext } from 'react'
import { AudioContext } from '../../hooks/useAudioManager'
import { FreeTierBadge } from './Paywall'

interface TitleScreenProps {
  onNewGame?: () => void
}

export function TitleScreen({ onNewGame }: TitleScreenProps) {
  const audioManager = useContext(AudioContext)

  const handleStart = () => {
    audioManager?.initializeAudio()
    audioManager?.toggleMusic()
    audioManager?.playSfx('click')
    if (onNewGame) {
      onNewGame()
    }
  }

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/ui/title-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.4,
        }}
      />
      <div className="absolute inset-0 bg-noir-black/60 pointer-events-none" />
      <div className="absolute inset-0 film-grain pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(201, 162, 39, 0.1) 50%, transparent 100%)',
          animation: 'fog 10s ease-in-out infinite',
        }}
      />

      <div className="relative z-10 text-center max-w-[90%]">
        <h1
          className="text-4xl sm:text-7xl md:text-8xl font-bold tracking-[0.2em] sm:tracking-[0.25em] mb-2"
          style={{
            fontFamily: 'Georgia, "Playfair Display", serif',
            color: '#c9a227',
            textShadow: '0 0 40px rgba(201, 162, 39, 0.5), 0 0 80px rgba(201, 162, 39, 0.3), 0 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '0.2em',
          }}
        >
          ALL SUSPECTS
        </h1>
        <div
          className="text-noir-cream/70 text-sm sm:text-base md:text-lg tracking-[0.14em] sm:tracking-[0.2em] italic mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Everyone has a secret. Nobody is innocent.
        </div>
        <div
          className="text-noir-cream text-base sm:text-xl tracking-[0.2em] sm:tracking-[0.3em] mb-10 sm:mb-12"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          A MURDER MYSTERY
        </div>

        <div className="flex items-center justify-center gap-4 mb-10 sm:mb-12">
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-noir-gold" />
          <div className="w-2 h-2 rotate-45 bg-noir-gold" />
          <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-noir-gold" />
        </div>

        <button
          onClick={handleStart}
          className="group relative w-full sm:w-auto px-6 sm:px-12 py-4 border-2 border-noir-gold text-noir-gold text-base sm:text-lg tracking-[0.12em] sm:tracking-widest transition-all duration-300 hover:bg-noir-gold hover:text-noir-black"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          BEGIN INVESTIGATION
          <span className="absolute inset-0 bg-noir-gold opacity-0 group-hover:opacity-10 transition-opacity" />
        </button>

        <p className="text-noir-slate text-xs sm:text-sm mt-10 sm:mt-16 tracking-wide">
          New Year's Eve, 1929 — Ashford Manor
        </p>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <FreeTierBadge />
      </div>

      <div className="absolute bottom-4 sm:bottom-6 text-noir-slate text-[11px] sm:text-xs tracking-wider">
        Powered by Claude AI
      </div>

      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 w-8 h-8 sm:w-16 sm:h-16 border-l-2 border-t-2 border-noir-gold opacity-50" />
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 w-8 h-8 sm:w-16 sm:h-16 border-r-2 border-t-2 border-noir-gold opacity-50" />
      <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 w-8 h-8 sm:w-16 sm:h-16 border-l-2 border-b-2 border-noir-gold opacity-50" />
      <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 w-8 h-8 sm:w-16 sm:h-16 border-r-2 border-b-2 border-noir-gold opacity-50" />
    </div>
  )
}
