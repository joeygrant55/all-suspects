import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssetLoader } from '../../hooks/useAssetLoader'

interface BlueprintPreview {
  title: string
  setting?: string
  era?: string
  suspectCount?: number
}

interface MysteryLoadingProps {
  mysteryId: string
  blueprint: BlueprintPreview | null
  onEnter: () => void
}

function TypewriterText({ text, speed = 60 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="animate-pulse text-noir-gold">|</span>
      )}
    </span>
  )
}

function Particles() {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    }))
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.current.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-noir-gold/20"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

const FLAVOR_TEXTS = [
  'Crafting suspects, weaving secrets, planting evidence...',
  'Forging alibis that almost hold up...',
  'Scattering red herrings across the scene...',
  'Writing confession letters that will never be sent...',
  'Placing fingerprints where they shouldn\'t be...',
  'Rehearsing lies until they sound like truth...',
  'Hiding the murder weapon in plain sight...',
  'Setting the clock to the time of death...',
  'Mixing poison into the evening cocktail...',
  'Drawing the curtains on a dark secret...',
  'Whispering rumors through the hallways...',
  'Locking doors that should stay open...',
]

export function MysteryLoading({ mysteryId, blueprint, onEnter }: MysteryLoadingProps) {
  const { progress, isReady, portraits, portraitsReady } = useAssetLoader(mysteryId)
  const [showTitle, setShowTitle] = useState(false)
  const [flavorIndex, setFlavorIndex] = useState(0)

  // Rotate flavor text every 4 seconds during generation
  useEffect(() => {
    if (blueprint) return // Stop rotating once blueprint arrives
    const interval = setInterval(() => {
      setFlavorIndex(i => (i + 1) % FLAVOR_TEXTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [blueprint])

  useEffect(() => {
    if (blueprint?.title) {
      const timer = setTimeout(() => setShowTitle(true), 500)
      return () => clearTimeout(timer)
    }
  }, [blueprint?.title])

  const portraitEntries = Object.entries(portraits)

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Particles */}
      <Particles />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201,162,39,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-noir-gold opacity-20" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-noir-gold opacity-20" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-noir-gold opacity-20" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-noir-gold opacity-20" />

      <div className="relative z-10 text-center max-w-2xl w-full px-8">
        {/* Generating state */}
        <AnimatePresence>
          {!blueprint && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <motion.div
                className="w-16 h-16 border-2 border-noir-gold border-t-transparent rounded-full mx-auto mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <h2
                className="text-2xl font-bold text-noir-gold mb-3 tracking-wider"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                THE MYSTERY ARCHITECT IS WORKING
              </h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={flavorIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5 }}
                  className="text-noir-smoke text-sm italic"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {FLAVOR_TEXTS[flavorIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blueprint arrived */}
        <AnimatePresence>
          {blueprint && (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Title */}
              {showTitle && (
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-5xl md:text-6xl font-bold mb-4"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#c9a227',
                    textShadow: '0 0 40px rgba(201,162,39,0.5)',
                  }}
                >
                  <TypewriterText text={blueprint.title} speed={80} />
                </motion.h1>
              )}

              {/* Meta info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="flex items-center justify-center gap-6 text-sm text-noir-smoke mb-8"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {blueprint.setting && <span>{blueprint.setting}</span>}
                {blueprint.era && (
                  <>
                    <span className="text-noir-gold/30">•</span>
                    <span>{blueprint.era}</span>
                  </>
                )}
                {blueprint.suspectCount && (
                  <>
                    <span className="text-noir-gold/30">•</span>
                    <span>{blueprint.suspectCount} Suspects</span>
                  </>
                )}
              </motion.div>

              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs text-noir-smoke mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  <span>Generating artwork...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 bg-noir-slate/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-noir-gold to-noir-gold/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Asset thumbnails */}
              {portraitEntries.length > 0 && (
                <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
                  {portraitEntries.map(([id, url]) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: url ? 1 : 0.3, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded border border-noir-slate/50 overflow-hidden bg-noir-slate/20"
                    >
                      {url ? (
                        <img src={url} alt={id} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-noir-slate text-lg">
                          👤
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Enter button */}
              <AnimatePresence>
                {isReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(201,162,39,0.6)' }}
                      whileTap={{ scale: 0.95 }}
                      animate={{ boxShadow: ['0 0 10px rgba(201,162,39,0.2)', '0 0 25px rgba(201,162,39,0.5)', '0 0 10px rgba(201,162,39,0.2)'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      onClick={onEnter}
                      className="px-12 py-4 bg-noir-gold text-noir-black text-lg font-bold tracking-widest hover:bg-opacity-90 transition-all duration-300"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      ✦ ENTER THE MYSTERY ✦
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skip waiting — enter with whatever's ready */}
              {!isReady && blueprint && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  onClick={onEnter}
                  className="mt-4 px-6 py-2 text-noir-smoke/50 text-xs tracking-wider hover:text-noir-gold transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  SKIP ARTWORK — ENTER NOW →
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
