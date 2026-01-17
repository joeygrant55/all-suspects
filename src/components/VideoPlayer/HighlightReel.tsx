/**
 * HighlightReel Component
 *
 * Creates an exportable summary of the investigation:
 * - Key evidence found
 * - Major contradictions detected
 * - The final accusation
 *
 * This is for demo/showcase purposes.
 */

import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../game/state'

interface HighlightReelProps {
  isOpen: boolean
  onClose: () => void
}

type ReelState = 'idle' | 'compiling' | 'playing' | 'complete'

interface Highlight {
  type: 'evidence' | 'contradiction' | 'accusation' | 'intro'
  title: string
  description: string
  timestamp: number
  characterId?: string
}

export function HighlightReel({ isOpen, onClose }: HighlightReelProps) {
  const [state, setState] = useState<ReelState>('idle')
  const [currentHighlight, setCurrentHighlight] = useState(0)
  const [highlights, setHighlights] = useState<Highlight[]>([])

  const collectedEvidence = useGameStore((s) => s.collectedEvidence)
  const contradictions = useGameStore((s) => s.contradictions)
  const messages = useGameStore((s) => s.messages)
  const gameComplete = useGameStore((s) => s.gameComplete)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Compile highlights from game state
  useEffect(() => {
    if (isOpen) {
      const compiled: Highlight[] = []

      // Add intro
      compiled.push({
        type: 'intro',
        title: 'The Ashford Affair',
        description: 'New Year\'s Eve, 1929. Edmund Ashford lies dead. Who killed him?',
        timestamp: 0,
      })

      // Add evidence discoveries
      collectedEvidence.forEach((evidence, index) => {
        compiled.push({
          type: 'evidence',
          title: evidence.description,
          description: `Evidence collected: ${evidence.type}`,
          timestamp: evidence.timestamp || Date.now() - (10000 * (collectedEvidence.length - index)),
        })
      })

      // Add contradictions
      contradictions.forEach((contradiction) => {
        compiled.push({
          type: 'contradiction',
          title: 'Contradiction Detected',
          description: contradiction.explanation,
          timestamp: contradiction.discoveredAt,
          characterId: contradiction.statement1.characterId,
        })
      })

      // Add final accusation if game is complete
      if (gameComplete) {
        compiled.push({
          type: 'accusation',
          title: 'Case Closed',
          description: 'The detective has identified the killer.',
          timestamp: Date.now(),
        })
      }

      // Sort by timestamp
      compiled.sort((a, b) => a.timestamp - b.timestamp)

      setHighlights(compiled)
    }
  }, [isOpen, collectedEvidence, contradictions, gameComplete])

  // Start the reel
  const startReel = () => {
    setState('playing')
    setCurrentHighlight(0)

    intervalRef.current = setInterval(() => {
      setCurrentHighlight((prev) => {
        if (prev >= highlights.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setState('complete')
          return prev
        }
        return prev + 1
      })
    }, 4000) // 4 seconds per highlight
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!isOpen) return null

  const current = highlights[currentHighlight]

  return (
    <div className="fixed inset-0 z-50 bg-noir-black flex items-center justify-center">
      {/* Idle state - ready to compile */}
      {state === 'idle' && (
        <div className="text-center">
          <h2 className="text-noir-gold text-3xl font-serif mb-4">
            Investigation Highlight Reel
          </h2>
          <p className="text-noir-cream/80 mb-8 max-w-md">
            Review the key moments of your investigation into the Ashford murder.
          </p>

          <div className="mb-8 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-noir-cream/60 mb-2">
              <span className="text-noir-gold">🔍</span>
              {collectedEvidence.length} pieces of evidence collected
            </div>
            <div className="flex items-center gap-2 text-noir-cream/60 mb-2">
              <span className="text-noir-blood">!</span>
              {contradictions.length} contradictions detected
            </div>
            <div className="flex items-center gap-2 text-noir-cream/60">
              <span className="text-green-500">✓</span>
              {messages.length} questions asked
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={startReel}
              disabled={highlights.length <= 1}
              className="px-6 py-3 bg-noir-gold text-noir-black font-semibold rounded hover:bg-noir-gold/90 transition-colors disabled:opacity-50"
            >
              Play Highlight Reel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-noir-slate text-noir-cream rounded hover:bg-noir-slate/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Playing state */}
      {(state === 'playing' || state === 'complete') && current && (
        <div className="w-full h-full relative">
          {/* Background effect based on highlight type */}
          <div
            className={`absolute inset-0 transition-colors duration-1000 ${
              current.type === 'evidence'
                ? 'bg-gradient-to-br from-noir-charcoal to-noir-black'
                : current.type === 'contradiction'
                  ? 'bg-gradient-to-br from-noir-blood/20 to-noir-black'
                  : current.type === 'accusation'
                    ? 'bg-gradient-to-br from-noir-gold/20 to-noir-black'
                    : 'bg-noir-black'
            }`}
          />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            {/* Type icon */}
            <div className="text-6xl mb-6 animate-fade-in">
              {current.type === 'intro' && '🎬'}
              {current.type === 'evidence' && '🔍'}
              {current.type === 'contradiction' && '⚠️'}
              {current.type === 'accusation' && '⚖️'}
            </div>

            {/* Title */}
            <h2 className="text-noir-gold text-4xl font-serif mb-4 text-center animate-fade-in">
              {current.title}
            </h2>

            {/* Description */}
            <p className="text-noir-cream text-xl text-center max-w-2xl animate-fade-in-delayed">
              {current.description}
            </p>

            {/* Progress */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {highlights.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentHighlight
                      ? 'bg-noir-gold'
                      : index < currentHighlight
                        ? 'bg-noir-gold/40'
                        : 'bg-noir-slate'
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  if (intervalRef.current) clearInterval(intervalRef.current)
                  setState('idle')
                  setCurrentHighlight(0)
                }}
                className="text-noir-cream/50 hover:text-noir-cream transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Skip buttons */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={() => {
                  if (currentHighlight > 0) {
                    setCurrentHighlight(currentHighlight - 1)
                  }
                }}
                disabled={currentHighlight === 0}
                className="text-noir-cream/50 hover:text-noir-cream transition-colors disabled:opacity-30"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  if (currentHighlight < highlights.length - 1) {
                    setCurrentHighlight(currentHighlight + 1)
                  } else {
                    setState('complete')
                  }
                }}
                className="text-noir-cream/50 hover:text-noir-cream transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Complete state overlay */}
          {state === 'complete' && (
            <div className="absolute inset-0 bg-noir-black/80 flex flex-col items-center justify-center">
              <h2 className="text-noir-gold text-4xl font-serif mb-4">
                Investigation Complete
              </h2>
              <p className="text-noir-cream/80 mb-8">
                Your investigation of the Ashford murder has been reviewed.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setState('playing')
                    setCurrentHighlight(0)
                    startReel()
                  }}
                  className="px-6 py-3 bg-noir-slate text-noir-cream rounded hover:bg-noir-slate/80 transition-colors"
                >
                  Watch Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-noir-gold text-noir-black font-semibold rounded hover:bg-noir-gold/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
