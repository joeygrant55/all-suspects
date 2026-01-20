/**
 * QuestionCarousel Component
 *
 * Horizontal scrolling carousel for question selection.
 * Features cinematic animations, keyboard navigation, and touch support.
 */

import { useState, useRef, useEffect, useCallback } from 'react'

interface Question {
  id: string
  text: string
  category?: string
}

interface QuestionCarouselProps {
  questions: Question[]
  onSelectQuestion: (question: Question) => void
  onAskCustomQuestion: (text: string) => void
  disabled: boolean
  currentCharacter: string
  isHidden?: boolean
}

export function QuestionCarousel({
  questions,
  onSelectQuestion,
  onAskCustomQuestion,
  disabled,
  currentCharacter,
  isHidden = false,
}: QuestionCarouselProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [isSelecting, setIsSelecting] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)

  const carouselRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Include "Ask your own" as the last card
  const allCards = [...questions, { id: 'custom', text: '', category: 'custom' }]
  const totalCards = allCards.length

  // Reveal animation on mount
  useEffect(() => {
    if (!isHidden) {
      const timer = setTimeout(() => setIsRevealed(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsRevealed(false)
    }
  }, [isHidden])

  // Scroll to focused card
  useEffect(() => {
    if (carouselRef.current && isRevealed) {
      const container = carouselRef.current
      const cards = container.querySelectorAll('.carousel-card')
      const focusedCard = cards[focusedIndex] as HTMLElement

      if (focusedCard) {
        const containerWidth = container.offsetWidth
        const cardLeft = focusedCard.offsetLeft
        const cardWidth = focusedCard.offsetWidth
        const scrollTo = cardLeft - (containerWidth / 2) + (cardWidth / 2)

        container.scrollTo({
          left: scrollTo,
          behavior: 'smooth'
        })
      }
    }
  }, [focusedIndex, isRevealed])

  // Focus input when custom mode opens
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustomInput])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isHidden || showCustomInput) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedIndex(prev => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setFocusedIndex(prev => Math.min(totalCards - 1, prev + 1))
          break
        case 'Enter':
          e.preventDefault()
          handleConfirmSelection()
          break
        case 'Escape':
          if (showCustomInput) {
            setShowCustomInput(false)
            setCustomQuestion('')
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, isHidden, totalCards, focusedIndex, showCustomInput])

  const handleConfirmSelection = useCallback(() => {
    if (disabled) return

    const selectedCard = allCards[focusedIndex]

    if (selectedCard.id === 'custom') {
      setShowCustomInput(true)
      return
    }

    // Play selection animation
    setIsSelecting(true)
    setTimeout(() => {
      onSelectQuestion(selectedCard)
      setIsSelecting(false)
    }, 400)
  }, [disabled, focusedIndex, allCards, onSelectQuestion])

  const handleCardClick = useCallback((index: number) => {
    if (disabled) return

    if (index === focusedIndex) {
      // Already focused - confirm selection
      handleConfirmSelection()
    } else {
      // Focus this card
      setFocusedIndex(index)
    }
  }, [disabled, focusedIndex, handleConfirmSelection])

  const handleCustomSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (customQuestion.trim() && !disabled) {
      setIsSelecting(true)
      setTimeout(() => {
        onAskCustomQuestion(customQuestion.trim())
        setShowCustomInput(false)
        setCustomQuestion('')
        setIsSelecting(false)
      }, 400)
    }
  }, [customQuestion, disabled, onAskCustomQuestion])

  const navigateCarousel = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      setFocusedIndex(prev => Math.max(0, prev - 1))
    } else {
      setFocusedIndex(prev => Math.min(totalCards - 1, prev + 1))
    }
  }, [totalCards])

  if (isHidden) {
    return null
  }

  return (
    <div
      className={`
        relative w-full transition-all duration-500 ease-out
        ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${isSelecting ? 'pointer-events-none' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 mb-4">
        <div className="relative">
          <div className="w-1.5 h-5 bg-noir-gold rounded-full" />
          <div className="absolute inset-0 w-1.5 h-5 bg-noir-gold rounded-full blur-sm" />
        </div>
        <span className="text-xs text-noir-cream/60 uppercase tracking-[0.25em] font-medium">
          Question {currentCharacter}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-noir-gold/20 via-noir-slate/20 to-transparent" />
      </div>

      {/* Carousel Container */}
      <div className="relative px-4">
        {/* Left Arrow */}
        <button
          onClick={() => navigateCarousel('left')}
          disabled={focusedIndex === 0 || disabled}
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300
            ${focusedIndex === 0 || disabled
              ? 'opacity-20 cursor-not-allowed'
              : 'opacity-60 hover:opacity-100 hover:bg-noir-gold/10 cursor-pointer'
            }
          `}
        >
          <svg className="w-5 h-5 text-noir-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => navigateCarousel('right')}
          disabled={focusedIndex === totalCards - 1 || disabled}
          className={`
            absolute right-0 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-300
            ${focusedIndex === totalCards - 1 || disabled
              ? 'opacity-20 cursor-not-allowed'
              : 'opacity-60 hover:opacity-100 hover:bg-noir-gold/10 cursor-pointer'
            }
          `}
        >
          <svg className="w-5 h-5 text-noir-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Cards Container */}
        <div
          ref={carouselRef}
          className="
            flex gap-4 overflow-x-auto scrollbar-hide px-12 py-4
            snap-x snap-mandatory scroll-smooth
          "
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {allCards.map((card, index) => {
            const isFocused = index === focusedIndex
            const isCustomCard = card.id === 'custom'
            const dimmed = !isFocused && isRevealed

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(index)}
                disabled={disabled}
                className={`
                  carousel-card
                  flex-shrink-0 w-72 min-h-[8rem] p-5 rounded-xl
                  text-left snap-center
                  transition-all duration-300 ease-out
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${isSelecting && isFocused ? 'animate-question-select' : ''}
                `}
                style={{
                  transform: isFocused ? 'scale(1.1)' : 'scale(1)',
                  opacity: dimmed ? 0.5 : 1,
                  background: isFocused
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)'
                    : 'linear-gradient(135deg, rgba(35, 35, 35, 0.7) 0%, rgba(25, 25, 25, 0.8) 100%)',
                  border: isFocused
                    ? '1px solid rgba(201, 162, 39, 0.5)'
                    : '1px solid rgba(60, 60, 60, 0.3)',
                  boxShadow: isFocused
                    ? '0 0 30px rgba(212, 175, 55, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4)'
                    : '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                {isCustomCard ? (
                  // Custom Question Card
                  showCustomInput && isFocused ? (
                    <form onSubmit={handleCustomSubmit} className="w-full">
                      <input
                        ref={inputRef}
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="What do you want to ask?"
                        className="
                          w-full bg-transparent border-b-2 border-noir-gold
                          text-noir-cream placeholder-noir-smoke/50
                          py-2 text-sm focus:outline-none
                        "
                        disabled={disabled}
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomInput(false)
                            setCustomQuestion('')
                          }}
                          className="text-noir-smoke hover:text-noir-cream text-xs mr-3 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!customQuestion.trim()}
                          className={`
                            px-3 py-1 rounded text-xs font-medium transition-all
                            ${customQuestion.trim()
                              ? 'bg-noir-gold text-noir-black hover:bg-noir-gold/90'
                              : 'bg-noir-slate/30 text-noir-smoke cursor-not-allowed'
                            }
                          `}
                        >
                          Ask
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <span className="text-noir-gold text-lg mb-2">+</span>
                      <span className={`text-sm font-medium transition-colors ${isFocused ? 'text-noir-gold' : 'text-noir-cream/70'}`}>
                        Ask your own question
                      </span>
                      <p className="text-xs text-noir-smoke/60 mt-1">
                        Type a custom question
                      </p>
                    </div>
                  )
                ) : (
                  // Regular Question Card
                  <>
                    {/* Card number */}
                    <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-full
                      flex items-center justify-center text-xs font-medium
                      transition-colors duration-300
                      ${isFocused ? 'bg-noir-gold/20 text-noir-gold' : 'bg-noir-slate/30 text-noir-smoke'}
                    `}>
                      {index + 1}
                    </div>

                    {/* Question text */}
                    <p className={`
                      font-serif text-sm leading-relaxed pr-8
                      transition-colors duration-300
                      ${isFocused ? 'text-noir-cream' : 'text-noir-cream/70'}
                    `}>
                      "{card.text}"
                    </p>

                    {/* Focus indicator */}
                    <div
                      className="mt-4 h-0.5 rounded-full transition-all duration-300"
                      style={{
                        width: isFocused ? '100%' : '0%',
                        background: 'linear-gradient(90deg, rgba(201, 162, 39, 0.6) 0%, rgba(201, 162, 39, 0.2) 100%)',
                      }}
                    />

                    {/* Press Enter hint */}
                    {isFocused && (
                      <p className="text-xs text-noir-smoke/50 mt-2 text-center">
                        Press Enter to ask
                      </p>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Carousel Dots */}
      <div className="flex justify-center gap-2 mt-2">
        {allCards.map((_, index) => (
          <button
            key={index}
            onClick={() => setFocusedIndex(index)}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${index === focusedIndex
                ? 'bg-noir-gold w-4'
                : 'bg-noir-slate/40 hover:bg-noir-slate/60'
              }
            `}
          />
        ))}
      </div>

      {/* CSS for selection animation */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes question-select {
          0% { transform: scale(1.1); }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0; }
        }

        .animate-question-select {
          animation: question-select 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

/**
 * Adapter to convert string[] questions to Question[] format
 */
export function useQuestionsAdapter(questions: string[]): Question[] {
  return questions.map((text, index) => ({
    id: `question-${index}`,
    text,
  }))
}

export default QuestionCarousel
