import { motion } from 'framer-motion'
import { useEffect } from 'react'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    title: 'Interrogate suspects',
    text: 'Talk to each suspect by selecting them and asking questions in your notebook.',
    icon: '🗣️',
  },
  {
    title: 'Gather evidence',
    text: 'Inspect every room for clues. Small details can reveal big lies.',
    icon: '🔎',
  },
  {
    title: 'Use pressure wisely',
    text: 'Push suspects when they lie, but not so hard they shut down entirely.',
    icon: '📈',
  },
  {
    title: 'Make your accusation',
    text: 'Select one suspect and the right motive before the final reveal.',
    icon: '⚖️',
  },
]

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full h-full md:w-[680px] md:max-h-[92vh] md:h-auto bg-noir-charcoal border border-noir-slate/40 shadow-2xl overflow-hidden rounded-none md:rounded-lg"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-noir-slate/40 bg-noir-black/30 flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-serif text-noir-gold">How to Play</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-noir-slate hover:border-noir-gold text-noir-smoke hover:text-noir-gold transition-colors"
            aria-label="Close tutorial"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-90px)] sm:max-h-[86vh]">
          <p className="text-sm text-noir-smoke mb-6 leading-relaxed">
            You are the detective. Use interviews, clues, and pressure tactics to find the truth.
          </p>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="border border-noir-slate/40 p-4 bg-noir-black/30 rounded"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl mt-0.5">{step.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg text-noir-gold">{index + 1}. {step.title}</h3>
                    <p className="text-sm text-noir-cream leading-relaxed mt-1">{step.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm text-noir-smoke uppercase tracking-[0.16em] mb-2">Controls</h3>
            <ul className="text-sm text-noir-cream leading-relaxed space-y-2">
              <li>🎯 Click suspect cards to talk, use evidence panel in each room.</li>
              <li>👣 Tap evidence list cards for detailed info.</li>
              <li>📌 Finish investigation, then submit accusation.</li>
            </ul>
          </div>

          <div className="mt-8 flex">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-4 bg-noir-gold text-noir-black font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
