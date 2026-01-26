import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IntroSequenceProps {
  onComplete: () => void
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [scene, setScene] = useState(0)

  const scenes = [
    {
      text: "New Year's Eve, 1929",
      subtext: 'Ashford Manor',
    },
    {
      text: 'A grand party. Champagne flows.',
      subtext: 'Secrets lurk in every shadow.',
    },
    {
      text: 'At midnight, the clock strikes...',
      subtext: 'And Charles Ashford is found dead.',
    },
    {
      text: 'You are the detective.',
      subtext: 'Six suspects. One murderer.',
    },
  ]

  const handleNext = () => {
    if (scene < scenes.length - 1) {
      setScene(scene + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-noir-black z-50">
      {/* Film grain overlay */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-noir-black letterbox-border" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-noir-black letterbox-border" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center space-y-6"
          >
            {/* Main text */}
            <h1
              className="text-6xl font-serif text-noir-cream tracking-wider"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {scenes[scene].text}
            </h1>

            {/* Subtext */}
            <p className="text-2xl text-noir-gold font-serif italic">
              {scenes[scene].subtext}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-8">
        <motion.button
          onClick={handleSkip}
          className="px-6 py-3 text-noir-smoke hover:text-noir-cream transition-colors font-serif"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Skip
        </motion.button>

        <motion.button
          onClick={handleNext}
          className="px-8 py-3 bg-noir-gold/20 border border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 transition-colors font-serif"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {scene < scenes.length - 1 ? 'Continue' : 'Begin Investigation'}
        </motion.button>
      </div>

      {/* Scene indicator dots */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
        {scenes.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === scene ? 'bg-noir-gold' : 'bg-noir-slate'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
