/**
 * IntroVideo Component
 *
 * Shows a cinematic character portrait card with voiced intro line
 * when first approaching a suspect. Uses ElevenLabs TTS via VoiceContext.
 */

import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { motion } from 'framer-motion'
import { useMysteryStore } from '../../game/mysteryState'
import { VoiceContext } from '../../hooks/useVoice'

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
  const [voiceStarted, setVoiceStarted] = useState(false)
  const [voiceDone, setVoiceDone] = useState(false)
  const hasTriggeredVoice = useRef(false)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMystery = useMysteryStore((s) => s.activeMystery)
  const mysteryId = activeMystery?.id

  // Use context directly — null if not wrapped in provider
  const voiceManager = useContext(VoiceContext)

  // Find intro line from blueprint (fall back to greeting)
  const blueprintChar = activeMystery?.blueprint?.characters?.find(
    (c) => c.id === characterId
  )
  const introLine = blueprintChar?.introLine || blueprintChar?.greeting

  // Play voice intro once portrait is loaded
  useEffect(() => {
    if (!portraitLoaded || hasTriggeredVoice.current) return
    hasTriggeredVoice.current = true

    if (voiceManager?.voiceEnabled && introLine) {
      setVoiceStarted(true)
      voiceManager.speak(characterId, introLine).then(() => {
        setVoiceDone(true)
      }).catch(() => {
        setVoiceDone(true)
      })
    } else {
      // No voice — use timer fallback
      setVoiceDone(true)
    }
  }, [portraitLoaded, characterId, introLine, voiceManager])

  // Auto-advance when voice finishes (or after fallback delay)
  useEffect(() => {
    if (!voiceDone) return

    // Small delay after voice ends for the moment to land
    fallbackTimerRef.current = setTimeout(() => {
      onComplete?.()
    }, voiceStarted ? 800 : 3500) // If voice played, short pause. If no voice, original 3.5s

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [voiceDone, voiceStarted, onComplete])

  // Build portrait path
  const portraitPath = mysteryId && mysteryId !== 'ashford-affair'
    ? `/generated/${mysteryId}/assets/portraits/${characterId}.png`
    : `/portraits/${characterId}.png`

  const handleSkip = useCallback(() => {
    // Stop voice if playing
    voiceManager?.stop()
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    onSkip?.()
    onComplete?.()
  }, [voiceManager, onSkip, onComplete])

  // Detect when voice playback is actively playing (for waveform animation)
  const isVoicePlaying = voiceManager?.isPlaying ?? false

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
        {/* Portrait with voice glow */}
        <div className="relative">
          <div className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full border-2 overflow-hidden mb-6 transition-all duration-300 ${
            isVoicePlaying
              ? 'border-noir-gold shadow-[0_0_80px_rgba(201,162,39,0.3)]'
              : 'border-noir-gold/50 shadow-[0_0_60px_rgba(201,162,39,0.15)]'
          }`}>
            <img
              src={portraitPath}
              alt={characterName}
              className={`w-full h-full object-cover transition-opacity duration-500 ${portraitLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setPortraitLoaded(true)}
              onError={(e) => {
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

          {/* Pulsing ring when speaking */}
          {isVoicePlaying && (
            <>
              <motion.div
                className="absolute inset-0 w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-noir-gold/40"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 w-40 h-40 sm:w-52 sm:h-52 rounded-full border border-noir-gold/20"
                animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />
            </>
          )}
        </div>

        {/* Waveform bars when speaking */}
        {isVoicePlaying && (
          <motion.div
            className="flex items-end gap-1 h-8 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-noir-gold/50 to-noir-gold rounded-full"
                animate={{
                  height: [4, 8 + Math.random() * 20, 4],
                }}
                transition={{
                  duration: 0.3 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: i * 0.05,
                }}
              />
            ))}
          </motion.div>
        )}

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

        {/* Intro line subtitle */}
        {introLine && voiceStarted && (
          <motion.p
            className="mt-4 text-noir-cream/60 text-sm sm:text-base font-serif italic text-center max-w-md px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            &ldquo;{introLine}&rdquo;
          </motion.p>
        )}

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
