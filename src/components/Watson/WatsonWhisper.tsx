/**
 * WatsonWhisper Component
 * Subtle inline hints that overlay on video without obstructing
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface WatsonWhisperProps {
  hint: string | null
  isActive: boolean
  onDismiss: () => void
  onExpandToDesk: () => void
}

export function WatsonWhisper({
  hint,
  isActive,
  onDismiss,
  onExpandToDesk,
}: WatsonWhisperProps) {
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (hint && isActive) {
      // Clear any existing timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }

      // Set new timer
      dismissTimerRef.current = setTimeout(() => {
        onDismiss()
      }, 5000)

      return () => {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current)
        }
      }
    }
  }, [hint, isActive, onDismiss])

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key.toLowerCase() === 'w' && hint && isActive) {
        e.preventDefault()
        onExpandToDesk()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hint, isActive, onExpandToDesk])

  return (
    <AnimatePresence>
      {hint && isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 5, x: '-50%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute bottom-4 left-1/2 z-30 max-w-md"
        >
          <div
            className="bg-noir-charcoal/85 backdrop-blur-sm px-6 py-3 rounded-full
                       border border-noir-gold/30 shadow-lg shadow-noir-black/50
                       flex items-center gap-4"
          >
            {/* Watson icon */}
            <span
              className="text-noir-gold text-lg font-serif"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              W
            </span>

            {/* Hint text */}
            <span
              className="text-noir-fog/90 italic text-sm flex-1"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {hint}
            </span>

            {/* Expand button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExpandToDesk()
              }}
              className="text-noir-gold text-xs hover:text-noir-gold/80
                         transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <span>See more</span>
              <kbd className="text-[10px] px-1 py-0.5 bg-noir-slate/50 rounded">
                W
              </kbd>
            </button>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="text-noir-smoke/60 hover:text-noir-smoke transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          <motion.div
            className="absolute bottom-0 left-6 right-6 h-0.5 bg-noir-gold/20 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-noir-gold/60"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
