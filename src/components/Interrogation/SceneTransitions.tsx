/**
 * SceneTransitions - Cinematic entrance/exit animations for interrogation
 *
 * Entry Sequence (1.5s total):
 * 0ms     - Container visible, pure black
 * 300ms   - Character name typewriter effect
 * 700ms   - Video fades in from black
 * 1200ms  - Question UI slides up from bottom
 *
 * Exit Sequence (800ms):
 * 0ms     - Questions slide down
 * 300ms   - Video fades to black
 * 600ms   - Container fades out
 * 800ms   - Component unmounts
 */

import { useState, useEffect } from 'react'
import type { Variants } from 'framer-motion'

// =============================================================================
// Animation Variants
// =============================================================================

/**
 * Main container - controls the letterbox reveal effect
 */
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    clipPath: 'inset(50% 0)',
  },
  visible: {
    opacity: 1,
    clipPath: 'inset(0% 0)',
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1], // Custom easing for cinematic feel
      when: 'beforeChildren',
      staggerChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    clipPath: 'inset(50% 0)',
    transition: {
      duration: 0.5,
      ease: [0.7, 0, 0.84, 0],
      when: 'afterChildren',
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
}

/**
 * Header bar - fades in and slides down slightly
 */
export const headerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
}

/**
 * Video theater - fades in from black with slight scale
 */
export const videoVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      delay: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.4,
      delay: 0.1,
      ease: 'easeIn',
    },
  },
}

/**
 * Footer question bar - slides up from bottom
 */
export const footerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
}

/**
 * Exit button - subtle fade in
 */
export const exitButtonVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: 1.0,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * Question card stagger animation
 */
export const questionCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: 1.0 + i * 0.1,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * Contradiction reveal - dramatic entrance for discoveries
 */
export const contradictionRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    rotateX: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.4,
    },
  },
}

/**
 * Psychology overlay pulse
 */
export const psychologyPulseVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(201, 162, 39, 0)',
  },
  alert: {
    boxShadow: [
      '0 0 0 0 rgba(201, 162, 39, 0.4)',
      '0 0 0 10px rgba(201, 162, 39, 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
    },
  },
}

// =============================================================================
// TypewriterText Component
// =============================================================================

interface TypewriterTextProps {
  text: string
  className?: string
  delay?: number
  speed?: number
  onComplete?: () => void
}

/**
 * Typewriter effect for character names and dramatic text reveals
 */
export function TypewriterText({
  text,
  className = '',
  delay = 0,
  speed = 50,
  onComplete,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    let charIndex = 0

    const startTyping = () => {
      const type = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1))
          charIndex++
          timeout = setTimeout(type, speed)
        } else {
          setIsComplete(true)
          onComplete?.()
        }
      }
      type()
    }

    // Delay before starting
    timeout = setTimeout(startTyping, delay)

    return () => clearTimeout(timeout)
  }, [text, delay, speed, onComplete])

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-[1em] bg-noir-gold ml-0.5 animate-pulse" />
      )}
    </span>
  )
}

// =============================================================================
// Scene Transition Hooks
// =============================================================================

/**
 * Hook to coordinate entrance animation timing
 */
export function useEntranceSequence() {
  const [phase, setPhase] = useState<'black' | 'name' | 'video' | 'questions' | 'complete'>('black')

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('name'), 0),
      setTimeout(() => setPhase('video'), 300),
      setTimeout(() => setPhase('questions'), 700),
      setTimeout(() => setPhase('complete'), 1200),
    ]

    return () => timers.forEach(clearTimeout)
  }, [])

  return phase
}

/**
 * Hook to handle exit animation and callback
 */
export function useExitSequence(onComplete: () => void) {
  const [isExiting, setIsExiting] = useState(false)

  const triggerExit = () => {
    if (isExiting) return
    setIsExiting(true)

    // Exit sequence timing
    setTimeout(() => {
      onComplete()
    }, 800)
  }

  return { isExiting, triggerExit }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate stagger delay for a list of items
 */
export function getStaggerDelay(index: number, baseDelay = 0, interval = 0.1): number {
  return baseDelay + index * interval
}

/**
 * Cinematic easing curves
 */
export const cinematicEasing = {
  // Smooth deceleration (for entrances)
  easeOut: [0.16, 1, 0.3, 1] as const,
  // Smooth acceleration (for exits)
  easeIn: [0.7, 0, 0.84, 0] as const,
  // Dramatic pause then release
  dramatic: [0.22, 1, 0.36, 1] as const,
  // Subtle bounce
  bounce: [0.34, 1.56, 0.64, 1] as const,
}
