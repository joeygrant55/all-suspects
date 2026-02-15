/**
 * IntroVideo Component
 *
 * Shows a cinematic character portrait card when first approaching a suspect.
 * For generated mysteries, uses portrait from /generated/{mysteryId}/assets/portraits/
 * For hardwired mysteries, uses /portraits/{characterId}.png
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMysteryStore } from '../../game/mysteryState'

interface IntroVideoProps {
  characterId: string
  characterName: string
  characterRole: string
  onComplete?: () => void
  onSkip?: () => void
}

export function IntroVideo({
  characterId,
  characterName,
  characterRole,
  onComplete,
  onSkip,
}: IntroVideoProps) {
  const [portraitLoaded, setPortraitLoaded] = useState(false)
  const activeMystery = useMysteryStore((s) => s.activeMystery)
  const mysteryId = activeMystery?.id

  // Auto-advance after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, 3500)
    return () => clearTimeout(timer)
  }, [onComplete])

  // Build portrait path — try generated mystery path first, fallback to hardwired
  const portraitPath = mysteryId && mysteryId !== 'ashford-affair'
    ? `/generated/${mysteryId}/assets/portraits/${characterId}.png`
    : `/portraits/${characterId}.png`

  const handleSkip = () => {
    onSkip?.()
    onComplete?.()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center cursor-pointer"
      onClick={handleSkip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-noir-black/80 pointer-events-none" />

      {/* Portrait */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-full border-2 border-noir-gold/50 overflow-hidden mb-6 shadow-[0_0_60px_rgba(201,162,39,0.15)]">
          <img
            src={portraitPath}
            alt={characterName}
            className={`w-full h-full object-cover transition-opacity duration-500 ${portraitLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setPortraitLoaded(true)}
            onError={(e) => {
              // Try alternate path
              const img = e.target as HTMLImageElement
              if (!img.src.includes('/portraits/' + characterId + '.png')) {
                img.src = `/portraits/${characterId}.png`
              }
            }}
          />
          {!portraitLoaded && (
            <div className="w-full h-full bg-noir-charcoal flex items-center justify-center">
              <span className="text-noir-gold/40 text-4xl font-serif">
                {characterName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <motion.h2
          className="text-noir-gold font-serif text-2xl sm:text-3xl tracking-[0.2em] text-center mb-2"
          style={{ textShadow: '0 0 40px rgba(201, 162, 39, 0.3)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {characterName.toUpperCase()}
        </motion.h2>

        {/* Role */}
        <motion.p
          className="text-noir-smoke/70 text-sm sm:text-base tracking-widest text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          {characterRole}
        </motion.p>

        {/* Decorative line */}
        <motion.div
          className="mt-6 flex items-center gap-3"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <div className="w-12 h-px bg-noir-gold/30" />
          <div className="w-1.5 h-1.5 bg-noir-gold/50 rotate-45" />
          <div className="w-12 h-px bg-noir-gold/30" />
        </motion.div>
      </motion.div>

      {/* Tap to skip hint */}
      <motion.p
        className="absolute bottom-8 text-noir-smoke/30 text-xs tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        TAP TO CONTINUE
      </motion.p>
    </motion.div>
  )
}
