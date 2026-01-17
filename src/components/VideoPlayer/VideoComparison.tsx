/**
 * VideoComparison Component
 *
 * Side-by-side display of two testimony videos to highlight contradictions.
 * This is the "killer feature" - seeing the lie visually.
 */

import { useState } from 'react'
import { TestimonyVideo } from './TestimonyVideo'

interface Testimony {
  characterId: string
  characterName: string
  testimony: string
  question: string
}

interface VideoComparisonProps {
  testimony1: Testimony
  testimony2: Testimony
  contradictionExplanation: string
  contradictionType: 'timeline' | 'location' | 'witness' | 'factual' | 'behavioral'
  onClose?: () => void
}

export function VideoComparison({
  testimony1,
  testimony2,
  contradictionExplanation,
  contradictionType,
  onClose,
}: VideoComparisonProps) {
  const [highlightedSide, setHighlightedSide] = useState<'left' | 'right' | null>(null)
  const [video1Ready, setVideo1Ready] = useState(false)
  const [video2Ready, setVideo2Ready] = useState(false)

  const bothReady = video1Ready && video2Ready

  // Contradiction type icons and colors
  const contradictionStyles = {
    timeline: { icon: '🕐', color: 'text-yellow-400', label: 'Timeline Conflict' },
    location: { icon: '📍', color: 'text-blue-400', label: 'Location Conflict' },
    witness: { icon: '👁', color: 'text-green-400', label: 'Witness Conflict' },
    factual: { icon: '!', color: 'text-red-400', label: 'Factual Conflict' },
    behavioral: { icon: '🎭', color: 'text-purple-400', label: 'Behavioral Conflict' },
  }

  const style = contradictionStyles[contradictionType] || contradictionStyles.factual

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir-black/95 p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{style.icon}</span>
            <div>
              <h2 className="text-noir-gold text-xl font-serif">
                CONTRADICTION DETECTED
              </h2>
              <p className={`${style.color} text-sm`}>{style.label}</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-noir-cream/50 hover:text-noir-cream transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Explanation banner */}
        <div className="bg-noir-blood/20 border border-noir-blood/40 rounded-lg p-4 mb-6">
          <p className="text-noir-cream text-center font-serif italic">
            "{contradictionExplanation}"
          </p>
        </div>

        {/* Side-by-side videos */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left testimony */}
          <div
            className={`relative transition-all duration-300 ${highlightedSide === 'left' ? 'ring-2 ring-noir-gold scale-[1.02]' : ''}`}
            onMouseEnter={() => setHighlightedSide('left')}
            onMouseLeave={() => setHighlightedSide(null)}
          >
            <div className="mb-3">
              <h3 className="text-noir-cream font-serif text-lg">
                {testimony1.characterName}
              </h3>
              <p className="text-noir-cream/60 text-sm italic">
                "{testimony1.question}"
              </p>
            </div>

            <TestimonyVideo
              characterId={testimony1.characterId}
              characterName={testimony1.characterName}
              testimony={testimony1.testimony}
              question={testimony1.question}
              autoPlay={bothReady}
              onVideoReady={() => setVideo1Ready(true)}
            />

            <div className="mt-3 bg-noir-charcoal p-3 rounded-lg">
              <p className="text-noir-cream/80 text-sm">
                {testimony1.testimony}
              </p>
            </div>
          </div>

          {/* VS divider */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
            <div className="bg-noir-blood text-noir-cream w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
              VS
            </div>
          </div>

          {/* Right testimony */}
          <div
            className={`relative transition-all duration-300 ${highlightedSide === 'right' ? 'ring-2 ring-noir-gold scale-[1.02]' : ''}`}
            onMouseEnter={() => setHighlightedSide('right')}
            onMouseLeave={() => setHighlightedSide(null)}
          >
            <div className="mb-3">
              <h3 className="text-noir-cream font-serif text-lg">
                {testimony2.characterName}
              </h3>
              <p className="text-noir-cream/60 text-sm italic">
                "{testimony2.question}"
              </p>
            </div>

            <TestimonyVideo
              characterId={testimony2.characterId}
              characterName={testimony2.characterName}
              testimony={testimony2.testimony}
              question={testimony2.question}
              autoPlay={bothReady}
              onVideoReady={() => setVideo2Ready(true)}
            />

            <div className="mt-3 bg-noir-charcoal p-3 rounded-lg">
              <p className="text-noir-cream/80 text-sm">
                {testimony2.testimony}
              </p>
            </div>
          </div>
        </div>

        {/* Loading sync indicator */}
        {!bothReady && (
          <div className="mt-6 text-center">
            <p className="text-noir-cream/50 text-sm animate-pulse">
              Synchronizing memories for comparison...
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => {
              // TODO: Add to evidence board
              console.log('Adding contradiction to evidence')
            }}
            className="px-6 py-3 bg-noir-gold text-noir-black font-semibold rounded-lg hover:bg-noir-gold/90 transition-colors"
          >
            Add to Evidence Board
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3 bg-noir-slate text-noir-cream rounded-lg hover:bg-noir-slate/80 transition-colors"
          >
            Continue Investigation
          </button>
        </div>
      </div>
    </div>
  )
}
