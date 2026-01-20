/**
 * InterrogationExperience - Full-screen cinematic interrogation container
 *
 * Replaces the modal approach with a full-viewport theatrical experience.
 * Uses letterbox framing with:
 * - 10vh header (character name, scene info, exit)
 * - 70vh video theater
 * - 20vh question bar
 */

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../game/state'
import {
  containerVariants,
  headerVariants,
  videoVariants,
  footerVariants,
  exitButtonVariants,
  TypewriterText,
} from './SceneTransitions'

export interface InterrogationExperienceProps {
  characterId: string
  characterName: string
  onExit: () => void
  isOpen: boolean
}

export function InterrogationExperience({
  characterId,
  characterName,
  onExit,
  isOpen,
}: InterrogationExperienceProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [roundNumber, setRoundNumber] = useState(1)

  // Get character data from game state
  const characters = useGameStore((state) => state.characters)
  const currentCharacter = characters.find((c) => c.id === characterId)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExiting) {
        handleExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExiting])

  // Graceful exit with animation
  const handleExit = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)

    // Allow exit animation to complete before unmounting
    setTimeout(() => {
      onExit()
      setIsExiting(false)
    }, 800)
  }, [onExit, isExiting])

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-noir-black overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate={isExiting ? 'exit' : 'visible'}
          exit="exit"
          style={{
            // Film grain overlay
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundBlendMode: 'overlay',
          }}
        >
          {/* Letterbox top bar - 10vh */}
          <motion.header
            className="h-[10vh] flex items-center justify-between px-8 border-b border-noir-gold/20"
            variants={headerVariants}
            style={{
              background: 'linear-gradient(to bottom, rgba(201, 162, 39, 0.05), transparent)',
            }}
          >
            {/* Character Name with typewriter effect */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-noir-charcoal border-2 border-noir-gold/40 flex items-center justify-center overflow-hidden">
                {currentCharacter?.portrait ? (
                  <img
                    src={currentCharacter.portrait}
                    alt={characterName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-noir-gold text-lg font-serif">
                    {characterName.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <TypewriterText
                  text={characterName}
                  className="text-2xl font-serif text-noir-cream tracking-wide"
                  delay={300}
                />
                <p className="text-sm text-noir-ash mt-0.5">
                  {currentCharacter?.role || 'Suspect'}
                </p>
              </div>
            </div>

            {/* Scene Info */}
            <div className="text-center">
              <p className="text-noir-gold font-serif text-sm tracking-widest uppercase">
                Interrogation
              </p>
              <p className="text-noir-ash text-xs mt-1">
                Round {roundNumber}
              </p>
            </div>

            {/* Exit Button */}
            <motion.button
              onClick={handleExit}
              className="group flex items-center gap-2 px-4 py-2 rounded border border-noir-smoke/30 hover:border-noir-gold/50 transition-colors duration-300"
              variants={exitButtonVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isExiting}
            >
              <span className="text-noir-ash group-hover:text-noir-cream text-sm transition-colors">
                End Session
              </span>
              <span className="text-noir-smoke group-hover:text-noir-gold transition-colors">
                <EscapeKeyIcon />
              </span>
            </motion.button>
          </motion.header>

          {/* Video Theater - 70vh */}
          <motion.main
            className="h-[70vh] flex items-center justify-center px-8 py-4"
            variants={videoVariants}
          >
            <div className="max-w-[1400px] w-full h-full relative">
              {/* 16:9 Video Container */}
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="relative bg-noir-charcoal rounded-sm overflow-hidden border border-noir-smoke/20"
                  style={{
                    aspectRatio: '16 / 9',
                    maxHeight: '100%',
                    width: 'auto',
                    height: '100%',
                  }}
                >
                  {/* Placeholder for CinematicVideoPlayer (T3 will build) */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VideoPlaceholder characterName={characterName} />
                  </div>

                  {/* Placeholder for PsychologyOverlay */}
                  <div className="absolute top-4 right-4">
                    <PsychologyOverlayPlaceholder />
                  </div>

                  {/* Placeholder for WatsonWhisper (T5 will build) */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <WatsonWhisperPlaceholder />
                  </div>

                  {/* Cinematic vignette overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10, 10, 10, 0.4) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.main>

          {/* Question Bar - 20vh */}
          <motion.footer
            className="h-[20vh] border-t border-noir-gold/20 px-8 py-4"
            variants={footerVariants}
            style={{
              background: 'linear-gradient(to top, rgba(201, 162, 39, 0.03), transparent)',
            }}
          >
            {/* Placeholder for QuestionCarousel (T4 will build) */}
            <QuestionCarouselPlaceholder
              characterId={characterId}
              onQuestionSelect={(q) => {
                console.log('Question selected:', q)
                setRoundNumber((r) => r + 1)
              }}
            />
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// Placeholder Components (to be replaced by other terminals)
// =============================================================================

function VideoPlaceholder({ characterName }: { characterName: string }) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-noir-slate/50 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-noir-gold/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-noir-ash text-sm">
        Video feed for <span className="text-noir-cream">{characterName}</span>
      </p>
      <p className="text-noir-smoke text-xs mt-1">
        CinematicVideoPlayer slot (T3)
      </p>
    </div>
  )
}

function PsychologyOverlayPlaceholder() {
  return (
    <div className="bg-noir-black/60 backdrop-blur-sm rounded px-3 py-2 border border-noir-smoke/30">
      <p className="text-noir-gold text-xs font-medium">Stress Level</p>
      <div className="w-24 h-1.5 bg-noir-charcoal rounded-full mt-1 overflow-hidden">
        <div className="w-1/3 h-full bg-noir-gold/60 rounded-full" />
      </div>
    </div>
  )
}

function WatsonWhisperPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="bg-noir-black/70 backdrop-blur-sm rounded px-4 py-2 border border-noir-gold/20"
    >
      <p className="text-noir-gold text-xs font-medium flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-noir-gold/60 animate-pulse" />
        Watson
      </p>
      <p className="text-noir-cream/80 text-sm mt-1">
        Observation slot - T5 will build WatsonWhisper component
      </p>
    </motion.div>
  )
}

function QuestionCarouselPlaceholder({
  characterId,
  onQuestionSelect,
}: {
  characterId: string
  onQuestionSelect: (question: string) => void
}) {
  const sampleQuestions = [
    'Where were you at 11:30 PM?',
    'What did you see in the hallway?',
    'Tell me about your relationship with Edmund.',
    'Who else was present?',
  ]

  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-noir-ash text-xs uppercase tracking-wider mb-3">
        Ask a question
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sampleQuestions.map((q, i) => (
          <motion.button
            key={i}
            onClick={() => onQuestionSelect(q)}
            className="flex-shrink-0 px-6 py-3 bg-noir-charcoal hover:bg-noir-slate border border-noir-smoke/30 hover:border-noir-gold/40 rounded text-noir-cream text-sm transition-colors duration-200"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {q}
          </motion.button>
        ))}
        <motion.button
          className="flex-shrink-0 px-6 py-3 bg-transparent border border-dashed border-noir-smoke/30 hover:border-noir-gold/40 rounded text-noir-ash hover:text-noir-cream text-sm transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
        >
          + Custom question
        </motion.button>
      </div>
      <p className="text-noir-smoke text-xs mt-2">
        QuestionCarousel slot (T4) - for {characterId}
      </p>
    </div>
  )
}

function EscapeKeyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth="1.5" />
      <text x="12" y="14" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none">
        ESC
      </text>
    </svg>
  )
}

export default InterrogationExperience
