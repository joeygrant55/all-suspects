/**
 * QuestionCards Component
 *
 * Card-based question selection for cinematic interrogations.
 * Features dramatic entrance animations and noir styling.
 */

import { useState, useEffect } from 'react'

interface QuestionCardsProps {
  questions: string[]
  onSelectQuestion: (question: string) => void
  onCustomQuestion: () => void
  isLoading: boolean
  characterName: string
}

export function QuestionCards({
  questions,
  onSelectQuestion,
  onCustomQuestion,
  isLoading,
  characterName,
}: QuestionCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [cardsRevealed, setCardsRevealed] = useState<boolean[]>([])
  const [isReady, setIsReady] = useState(false)

  // Staggered card entrance animation
  useEffect(() => {
    setCardsRevealed([])
    setIsReady(false)

    const timers: NodeJS.Timeout[] = []

    // Reveal cards one by one
    questions.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCardsRevealed((prev) => {
          const next = [...prev]
          next[index] = true
          return next
        })
      }, 150 + index * 100)
      timers.push(timer)
    })

    // Mark as ready after all cards revealed
    const readyTimer = setTimeout(() => {
      setIsReady(true)
    }, 150 + questions.length * 100 + 200)
    timers.push(readyTimer)

    return () => timers.forEach(clearTimeout)
  }, [questions])

  const handleSelect = (question: string, index: number) => {
    if (isLoading) return
    setSelectedIndex(index)
    onSelectQuestion(question)
  }

  return (
    <div className="border-t border-noir-slate/30 bg-gradient-to-t from-noir-black via-noir-black/95 to-noir-charcoal/50 p-6">
      {/* Section header with dramatic styling */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <div className="w-1.5 h-6 bg-noir-gold rounded-full" />
          <div className="absolute inset-0 w-1.5 h-6 bg-noir-gold rounded-full blur-sm" />
        </div>
        <span className="text-xs text-noir-cream/70 uppercase tracking-[0.3em] font-medium">
          Question {characterName}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-noir-gold/30 via-noir-slate/30 to-transparent" />
      </div>

      {/* Question cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {questions.slice(0, 4).map((question, index) => {
          const isRevealed = cardsRevealed[index]
          const isHovered = hoveredIndex === index
          const isSelected = selectedIndex === index

          return (
            <button
              key={index}
              onClick={() => handleSelect(question, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              disabled={isLoading || !isReady}
              className={`
                relative group text-left p-5 rounded-xl transition-all duration-300
                ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected ? 'scale-[0.98]' : ''}
              `}
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: `
                  translateY(${isRevealed ? 0 : 20}px)
                  translateX(${isHovered && !isLoading ? -2 : 0}px)
                  scale(${isSelected ? 0.98 : isHovered && !isLoading ? 1.02 : 1})
                `,
                transitionDelay: isRevealed ? '0ms' : `${index * 100}ms`,
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0.05) 100%)'
                  : isHovered
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.8) 0%, rgba(30, 30, 30, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(35, 35, 35, 0.6) 0%, rgba(25, 25, 25, 0.8) 100%)',
                border: isSelected
                  ? '1px solid rgba(201, 162, 39, 0.5)'
                  : isHovered
                    ? '1px solid rgba(201, 162, 39, 0.3)'
                    : '1px solid rgba(60, 60, 60, 0.4)',
                boxShadow: isHovered && !isLoading
                  ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(201, 162, 39, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Card number badge */}
              <div
                className={`
                  absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isHovered ? 'bg-noir-gold/20 text-noir-gold' : 'bg-noir-slate/30 text-noir-smoke'}
                `}
              >
                <span className="text-xs font-medium">{index + 1}</span>
              </div>

              {/* Question text */}
              <p
                className={`
                  font-serif text-sm leading-relaxed pr-10 transition-colors duration-300
                  ${isHovered ? 'text-noir-cream' : 'text-noir-cream/80'}
                `}
              >
                "{question}"
              </p>

              {/* Hover indicator line */}
              <div
                className="mt-4 h-0.5 rounded-full transition-all duration-300"
                style={{
                  width: isHovered ? '100%' : '0%',
                  background: 'linear-gradient(90deg, rgba(201, 162, 39, 0.6) 0%, rgba(201, 162, 39, 0.2) 100%)',
                }}
              />

              {/* Subtle corner accent */}
              <div
                className={`
                  absolute bottom-0 left-0 w-8 h-8 transition-opacity duration-300
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, transparent 50%)',
                  borderRadius: '0 0 0 12px',
                }}
              />

              {/* Paper texture overlay */}
              <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-xl"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Custom question button */}
      <button
        onClick={onCustomQuestion}
        disabled={isLoading || !isReady}
        className={`
          w-full py-4 px-5 rounded-xl border border-dashed
          transition-all duration-300 text-sm group
          ${isLoading || !isReady
            ? 'cursor-not-allowed opacity-50 border-noir-slate/30'
            : 'cursor-pointer border-noir-slate/40 hover:border-noir-gold/40 hover:bg-noir-gold/5'
          }
        `}
        style={{
          opacity: isReady ? 1 : 0,
          transform: `translateY(${isReady ? 0 : 10}px)`,
          transitionDelay: `${questions.length * 100 + 100}ms`,
        }}
      >
        <span className="flex items-center justify-center gap-3 text-noir-smoke group-hover:text-noir-cream transition-colors">
          <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="font-medium">Ask your own question</span>
        </span>
      </button>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-noir-black/80 flex items-center justify-center rounded-lg backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-4">
            {/* Spinning film reel */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-noir-gold/30 rounded-full" />
              <div
                className="absolute inset-1 border-2 border-t-noir-gold border-transparent rounded-full"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              <div className="absolute inset-3 bg-noir-gold/20 rounded-full" />
            </div>
            <p className="text-noir-cream text-sm font-serif">
              {characterName} is responding...
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/**
 * QuestionCardsSkeleton - Loading skeleton for question cards
 */
export function QuestionCardsSkeleton() {
  return (
    <div className="border-t border-noir-slate/30 bg-noir-black/60 p-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-1.5 h-6 bg-noir-slate/30 rounded-full animate-pulse" />
        <div className="h-3 w-32 bg-noir-slate/30 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-noir-slate/20 bg-noir-charcoal/30"
          >
            <div className="h-4 w-3/4 bg-noir-slate/20 rounded animate-pulse mb-2" />
            <div className="h-4 w-1/2 bg-noir-slate/20 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
