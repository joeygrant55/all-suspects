/**
 * ContradictionReveal - Dramatic full-screen contradiction detection
 *
 * Animation Timeline (2s total):
 * 0ms     - Screen flashes red
 * 100ms   - Video drains to B&W
 * 400ms   - "CONTRADICTION DETECTED" slams in
 * 600ms   - Red line strikes through
 * 800ms   - Explanation types out
 * 1500ms  - Compare button pulses in
 * 2000ms  - Stable, waiting for user
 */

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TypewriterText } from './SceneTransitions'

export interface Contradiction {
  statement1: string
  statement2: string
  character: string
  explanation: string
}

export interface ContradictionRevealProps {
  isTriggered: boolean
  contradiction: Contradiction | null
  onComplete: () => void
  onCompareVideos: () => void
}

export function ContradictionReveal({
  isTriggered,
  contradiction,
  onComplete,
  onCompareVideos,
}: ContradictionRevealProps) {
  const [phase, setPhase] = useState<
    'flash' | 'bw' | 'title' | 'line' | 'explain' | 'button' | 'stable'
  >('flash')
  const [showButton, setShowButton] = useState(false)

  // Reset state when triggered changes
  useEffect(() => {
    if (isTriggered) {
      setPhase('flash')
      setShowButton(false)

      // Animation sequence
      const timers = [
        setTimeout(() => setPhase('bw'), 100),
        setTimeout(() => setPhase('title'), 400),
        setTimeout(() => setPhase('line'), 600),
        setTimeout(() => setPhase('explain'), 800),
        setTimeout(() => {
          setPhase('button')
          setShowButton(true)
        }, 1500),
        setTimeout(() => setPhase('stable'), 2000),
      ]

      return () => timers.forEach(clearTimeout)
    }
  }, [isTriggered])

  // Handle escape to dismiss
  useEffect(() => {
    if (!isTriggered) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTriggered, onComplete])

  const handleCompare = useCallback(() => {
    onCompareVideos()
    onComplete()
  }, [onCompareVideos, onComplete])

  if (!isTriggered || !contradiction) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Red flash overlay */}
        <motion.div
          className="absolute inset-0 bg-noir-blood pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === 'flash' ? [0, 0.8, 0.3] : 0,
          }}
          transition={{ duration: 0.2 }}
        />

        {/* B&W + desaturated background */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            filter: phase !== 'flash' ? 'grayscale(100%) brightness(0.7)' : 'none',
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
          }}
        />

        {/* Scan line effect */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
            animation: 'scan-down 8s linear infinite',
          }}
        />

        {/* Main content container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
          {/* Title slam */}
          <motion.div
            initial={{ y: -150, opacity: 0, scale: 1.2 }}
            animate={
              phase === 'flash'
                ? { y: -150, opacity: 0, scale: 1.2 }
                : {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                  }
            }
            transition={{
              type: 'spring',
              damping: 12,
              stiffness: 200,
              delay: 0.2,
            }}
            className="relative"
          >
            <h1
              className="text-5xl md:text-7xl font-bold text-noir-blood tracking-[0.2em] uppercase"
              style={{
                textShadow: '0 0 30px rgba(114, 47, 55, 0.8), 0 0 60px rgba(114, 47, 55, 0.4)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              CONTRADICTION
            </h1>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-noir-cream tracking-[0.3em] uppercase text-center mt-2"
            >
              DETECTED
            </motion.h2>
          </motion.div>

          {/* Strike line */}
          <motion.div
            className="h-1 bg-noir-blood mt-6 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: phase === 'flash' || phase === 'bw' ? 0 : '60%' }}
            transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              boxShadow: '0 0 20px rgba(114, 47, 55, 0.6)',
              maxWidth: '600px',
            }}
          />

          {/* Character name */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'explain' || phase === 'button' || phase === 'stable' ? 1 : 0 }}
            transition={{ delay: 0.2 }}
            className="text-noir-gold text-lg tracking-wider uppercase mt-8"
          >
            {contradiction.character}
          </motion.p>

          {/* Contradiction statements */}
          <div className="max-w-3xl mt-6 space-y-4">
            {/* Statement 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: phase === 'explain' || phase === 'button' || phase === 'stable' ? 1 : 0,
                x: 0,
              }}
              transition={{ delay: 0.3 }}
              className="bg-noir-charcoal/60 border-l-4 border-noir-gold/60 px-6 py-4 rounded-r"
            >
              <p className="text-noir-ash text-xs uppercase tracking-wider mb-2">First stated:</p>
              <p className="text-noir-cream text-lg leading-relaxed italic">
                "{contradiction.statement1}"
              </p>
            </motion.div>

            {/* VS indicator */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{
                scale: phase === 'explain' || phase === 'button' || phase === 'stable' ? 1 : 0,
              }}
              transition={{ type: 'spring', delay: 0.4 }}
              className="flex justify-center"
            >
              <span className="text-noir-blood text-2xl font-bold">VS</span>
            </motion.div>

            {/* Statement 2 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: phase === 'explain' || phase === 'button' || phase === 'stable' ? 1 : 0,
                x: 0,
              }}
              transition={{ delay: 0.5 }}
              className="bg-noir-charcoal/60 border-l-4 border-noir-blood/60 px-6 py-4 rounded-r"
            >
              <p className="text-noir-ash text-xs uppercase tracking-wider mb-2">Then stated:</p>
              <p className="text-noir-cream text-lg leading-relaxed italic">
                "{contradiction.statement2}"
              </p>
            </motion.div>
          </div>

          {/* Explanation typewriter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'explain' || phase === 'button' || phase === 'stable' ? 1 : 0,
            }}
            className="mt-8 max-w-2xl text-center"
          >
            {(phase === 'explain' || phase === 'button' || phase === 'stable') && (
              <TypewriterText
                text={contradiction.explanation}
                className="text-noir-cream/90 text-lg leading-relaxed"
                delay={200}
                speed={30}
              />
            )}
          </motion.div>

          {/* Action buttons */}
          <AnimatePresence>
            {showButton && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.2 }}
                className="flex gap-4 mt-10"
              >
                <motion.button
                  onClick={handleCompare}
                  className="px-8 py-4 bg-noir-gold text-noir-black font-bold text-lg uppercase tracking-wider rounded"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(201, 162, 39, 0.3)',
                      '0 0 40px rgba(201, 162, 39, 0.6)',
                      '0 0 20px rgba(201, 162, 39, 0.3)',
                    ],
                  }}
                  transition={{
                    boxShadow: {
                      duration: 1.5,
                      repeat: Infinity,
                    },
                  }}
                >
                  Compare Videos
                </motion.button>

                <motion.button
                  onClick={onComplete}
                  className="px-8 py-4 bg-transparent border border-noir-smoke/50 text-noir-cream font-medium text-lg uppercase tracking-wider rounded hover:border-noir-gold/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Corner accents */}
        <CornerAccent position="top-left" />
        <CornerAccent position="top-right" />
        <CornerAccent position="bottom-left" />
        <CornerAccent position="bottom-right" />

        {/* Dismiss hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showButton ? 0.5 : 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-noir-smoke text-sm"
        >
          Press ESC to dismiss
        </motion.p>
      </motion.div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes scan-down {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
      `}</style>
    </AnimatePresence>
  )
}

// Corner accent decoration
function CornerAccent({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4 rotate-90',
    'bottom-left': 'bottom-4 left-4 -rotate-90',
    'bottom-right': 'bottom-4 right-4 rotate-180',
  }

  return (
    <motion.div
      className={`absolute ${positionClasses[position]} w-16 h-16 pointer-events-none`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.6 }}
      transition={{ delay: 0.8 }}
    >
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" className="text-noir-blood/60">
        <path d="M0 32 L0 0 L32 0" strokeWidth="2" />
        <path d="M8 24 L8 8 L24 8" strokeWidth="1" opacity="0.5" />
      </svg>
    </motion.div>
  )
}

export default ContradictionReveal
