import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EvidenceRevealProps {
  evidence: {
    id: string
    name: string
    description: string
    type: 'testimony' | 'contradiction' | 'physical' | 'document'
    image?: string
  }
  onClose: () => void
  onCollect?: () => void
}

const EVIDENCE_ICONS: Record<string, string> = {
  testimony: '💬',
  contradiction: '⚠️',
  physical: '🔍',
  document: '📄',
}

export function EvidenceReveal({ evidence, onClose, onCollect }: EvidenceRevealProps) {
  const [isCollected, setIsCollected] = useState(false)

  const handleCollect = () => {
    setIsCollected(true)
    onCollect?.()
    // Auto-close after a brief moment
    setTimeout(() => {
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-noir-black/95 z-50 flex items-center justify-center">
      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none animate-vignette-pulse"
      />

      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative max-w-3xl w-full mx-8"
        >
          {/* Evidence card */}
          <div className="bg-noir-charcoal border-2 border-noir-gold shadow-2xl overflow-hidden">
            {/* Header with icon */}
            <div className="bg-noir-black/50 border-b border-noir-gold/30 p-6 text-center">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl mb-4"
              >
                {EVIDENCE_ICONS[evidence.type]}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-serif text-noir-gold tracking-wider"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Evidence Discovered
              </motion.h2>
            </div>

            {/* Evidence content */}
            <div className="p-8 space-y-6">
              {/* Evidence image/photo */}
              {evidence.image && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative overflow-hidden bg-noir-black border-2 border-noir-slate"
                >
                  <img
                    src={evidence.image}
                    alt={evidence.name}
                    className="w-full h-64 object-contain"
                  />
                  {/* Photo corners */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-noir-gold" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-noir-gold" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-noir-gold" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-noir-gold" />
                </motion.div>
              )}

              {/* Evidence name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <h3
                  className="text-2xl font-serif text-noir-cream"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {evidence.name}
                </h3>
                <p className="text-sm text-noir-gold italic mt-1">
                  {evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1)}
                </p>
              </motion.div>

              {/* Evidence description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-noir-black/30 border border-noir-slate/30 p-6 rounded"
              >
                <p
                  className="text-noir-cream text-base leading-relaxed"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {evidence.description}
                </p>
              </motion.div>

              {/* Significance badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-2 text-sm text-noir-smoke italic"
              >
                <span className="text-noir-gold">●</span>
                <span>This evidence may be crucial to solving the case</span>
                <span className="text-noir-gold">●</span>
              </motion.div>
            </div>

            {/* Actions */}
            <div className="bg-noir-black/50 border-t border-noir-gold/30 p-6 flex gap-4 justify-center">
              <motion.button
                onClick={onClose}
                className="px-6 py-3 border border-noir-slate hover:border-noir-gold text-noir-smoke hover:text-noir-cream transition-colors font-serif"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Dismiss
              </motion.button>

              <motion.button
                onClick={handleCollect}
                disabled={isCollected}
                className={`px-8 py-3 border-2 font-serif transition-all ${
                  isCollected
                    ? 'bg-noir-gold/50 border-noir-gold text-noir-black cursor-default'
                    : 'bg-noir-gold/20 border-noir-gold text-noir-gold hover:bg-noir-gold/30'
                }`}
                whileHover={!isCollected ? { scale: 1.05 } : {}}
                whileTap={!isCollected ? { scale: 0.95 } : {}}
              >
                {isCollected ? '✓ Added to Evidence Board' : 'Add to Evidence Board'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
