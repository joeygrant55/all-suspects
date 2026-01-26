/**
 * Subtitles Component
 *
 * Typewriter-style subtitles that appear at the bottom of video viewport.
 * Supports word-by-word reveal synced to voice timing.
 */

import { useState, useEffect, useRef, useMemo } from 'react'

interface SubtitlesProps {
  text: string
  isPlaying: boolean
  typewriterMode?: boolean
  wordsPerSecond?: number
  maxLines?: number
  onComplete?: () => void
}

export function Subtitles({
  text,
  isPlaying,
  typewriterMode = true,
  wordsPerSecond = 3,
  maxLines = 2,
  onComplete,
}: SubtitlesProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse text into words (memoized to avoid recalculation)
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const totalWords = words.length

  // Reset when text changes
  useEffect(() => {
    setCurrentWordIndex(0)
    setDisplayedText('')
  }, [text])

  // Typewriter effect
  useEffect(() => {
    if (!isPlaying || !typewriterMode) {
      if (!typewriterMode) {
        setDisplayedText(text)
      }
      return
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const msPerWord = 1000 / wordsPerSecond

    intervalRef.current = setInterval(() => {
      setCurrentWordIndex((prev) => {
        const next = prev + 1
        if (next > totalWords) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onComplete?.()
          return prev
        }
        return next
      })
    }, msPerWord)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, typewriterMode, wordsPerSecond, onComplete, text, totalWords])

  // Update displayed text based on current word index
  useEffect(() => {
    if (typewriterMode) {
      const displayed = words.slice(0, currentWordIndex).join(' ')
      setDisplayedText(displayed)
    }
  }, [currentWordIndex, typewriterMode, words])

  // Truncate to fit max lines (rough approximation)
  const truncateToLines = (str: string): string => {
    const wordArr = str.split(' ')
    const wordsPerLine = 10 // Approximate
    const maxWords = maxLines * wordsPerLine

    if (wordArr.length <= maxWords) {
      return str
    }

    // Show last N words
    return '...' + wordArr.slice(-maxWords).join(' ')
  }

  // Check if still typing
  const isTyping = typewriterMode && isPlaying && currentWordIndex < totalWords

  if (!displayedText && !isPlaying) {
    return null
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 pointer-events-none">
      <div
        className="relative max-w-3xl px-6 py-3 rounded-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Subtitle text */}
        <p
          className="text-center font-serif text-lg leading-relaxed"
          style={{
            color: '#f5f0e6', // noir-cream
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
          }}
        >
          {truncateToLines(displayedText)}

          {/* Blinking cursor during typewriter */}
          {isTyping && (
            <span
              className="inline-block w-0.5 h-5 bg-noir-cream/80 ml-1 align-middle"
              style={{
                animation: 'blink 0.8s ease-in-out infinite',
              }}
            />
          )}
        </p>

        {/* Decorative underline */}
        <div className="absolute bottom-1 left-6 right-6 h-px bg-gradient-to-r from-transparent via-noir-gold/30 to-transparent" />
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
