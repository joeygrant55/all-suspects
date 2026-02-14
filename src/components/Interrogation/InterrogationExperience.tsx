/**
 * InterrogationExperience - Full-screen cinematic interrogation container
 *
 * Replaces the modal approach with a full-viewport theatrical experience.
 * Uses letterbox framing with:
 * - 10vh header (character name, scene info, exit)
 * - 70vh video theater
 * - 20vh question bar
 * 
 * NOW WITH: Live CharacterPortrait integration driven by Agent SDK emotional output
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useWatsonStore } from '../../game/watsonState'
import { useCharacterPortrait } from '../../hooks/useCharacterPortrait'
import { CharacterPortrait } from './CharacterPortrait'
import { sendMessage, type EmotionData, type ChatResponse, analyzeWithWatson } from '../../api/client'
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

// Typing indicator for cinematic effect
function TypingIndicator() {
  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-noir-gold/60"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </motion.div>
  )
}

// Character dialogue display with typewriter effect
function DialogueBox({ 
  message, 
  isLoading,
  characterName 
}: { 
  message: string | null
  isLoading: boolean
  characterName: string
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  useEffect(() => {
    if (!message) {
      setDisplayedText('')
      return
    }
    
    setIsTyping(true)
    setDisplayedText('')
    
    let index = 0
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText(message.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 30) // Typewriter speed
    
    return () => clearInterval(interval)
  }, [message])
  
  if (isLoading) {
    return (
      <div className="bg-noir-black/80 backdrop-blur-sm border border-noir-gold/20 rounded-lg p-4">
        <p className="text-noir-gold text-xs uppercase tracking-wider mb-2">{characterName}</p>
        <TypingIndicator />
      </div>
    )
  }
  
  if (!message) return null
  
  return (
    <motion.div
      className="bg-noir-black/80 backdrop-blur-sm border border-noir-gold/20 rounded-lg p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-noir-gold text-xs uppercase tracking-wider mb-2">{characterName}</p>
      <p className="text-noir-cream font-serif text-lg leading-relaxed">
        {displayedText}
        {isTyping && (
          <motion.span
            className="inline-block w-0.5 h-5 bg-noir-gold ml-0.5"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </p>
    </motion.div>
  )
}

export function InterrogationExperience({
  characterId,
  characterName,
  onExit,
  isOpen,
}: InterrogationExperienceProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [roundNumber, setRoundNumber] = useState(1)
  const [currentMessage, setCurrentMessage] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const customInputRef = useRef<HTMLInputElement | null>(null)

  // Get character data from game state
  const characters = useGameStore((state) => state.characters)
  const currentCharacter = characters.find((c) => c.id === characterId)
  const addContradictions = useGameStore((state) => state.addContradictions)
  const contradictions = useGameStore((state) => state.contradictions)
  
  // Watson state
  const showWhisper = useWatsonStore((state) => state.showWhisper)
  const openDesk = useWatsonStore((state) => state.openDesk)
  
  // Track last contradiction count to show badge for new ones
  const [lastContradictionCount, setLastContradictionCount] = useState(0)
  const hasNewContradictions = contradictions.length > lastContradictionCount
  
  // Portrait state management with emotional tracking
  const {
    currentEmotion,
    setEmotion,
    preloadPortrait,
  } = useCharacterPortrait({
    characterId,
    initialState: 'composed',
    preloadStates: ['composed', 'nervous', 'defensive', 'breaking'],
  })

  // Handle sending a question to the character
  const handleAskQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isThinking) return
    
    setIsThinking(true)
    setCurrentMessage(null)
    setShowCustomInput(false)
    setCustomQuestion('')
    setShowRetry(false)
    setLastQuestion(question)
    
    try {
      const response: ChatResponse = await sendMessage(characterId, question)
      
      setCurrentMessage(response.message)
      setRoundNumber(r => r + 1)
      
      // Update emotional state based on agent response
      if (response.emotion) {
        setEmotion(response.emotion)
        
        // Preload the next likely emotional states based on intensity
        if (response.emotion.intensity > 60) {
          preloadPortrait('defensive')
          preloadPortrait('breaking')
        }
      }
      
      // Process statement through Watson
      try {
        const watsonAnalysis = await analyzeWithWatson(
          characterId,
          characterName,
          response.message,
          question,
          response.pressure?.level || 0
        )
        
        if (watsonAnalysis.success) {
          const { newContradictions, observations } = watsonAnalysis.analysis
          
          // Store contradictions in game state
          if (newContradictions && newContradictions.length > 0) {
            const formattedContradictions = newContradictions.map((c: any) => ({
              id: c.id,
              statement1: {
                characterId: c.statement1.characterId,
                characterName: c.statement1.characterName,
                content: c.statement1.content,
                playerQuestion: '',
              },
              statement2: {
                characterId: c.statement2.characterId,
                characterName: c.statement2.characterName,
                content: c.statement2.content,
                playerQuestion: '',
              },
              explanation: c.explanation,
              severity: c.severity === 'critical' ? 'major' : c.severity,
              discoveredAt: Date.now(),
            }))
            
            addContradictions(formattedContradictions)
            
            // Show Watson whisper for significant contradictions
            const significantContradictions = newContradictions.filter((c: any) => 
              c.severity === 'significant' || c.severity === 'critical'
            )
            
            if (significantContradictions.length > 0) {
              showWhisper(`Detective, I've noticed something... ${significantContradictions[0].explanation}`)
            }
          }
          
          // Show Watson observation if interesting
          if (observations && observations.length > 0 && Math.random() < 0.3) {
            setTimeout(() => {
              showWhisper(observations[0])
            }, 3000)
          }
        }
      } catch (watsonError) {
        console.error('Watson analysis failed:', watsonError)
        // Non-critical failure - continue without Watson
      }
    } catch (error) {
      console.error('Failed to get response:', error)
      setCurrentMessage('The suspect doesn\'t seem to want to answer. Try again?')
      setShowRetry(true)
    } finally {
      setIsThinking(false)
    }
  }, [characterId, characterName, isThinking, setEmotion, preloadPortrait, addContradictions, showWhisper])

  const handleRetry = useCallback(() => {
    if (lastQuestion) {
      handleAskQuestion(lastQuestion)
    }
  }, [lastQuestion, handleAskQuestion])

  // Handle custom question submission
  const handleCustomSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (customQuestion.trim()) {
      handleAskQuestion(customQuestion)
    }
  }, [customQuestion, handleAskQuestion])

  // Handle escape key and Watson shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      
      if (e.key === 'Escape' && isOpen && !isExiting) {
        if (showCustomInput) {
          setShowCustomInput(false)
          setCustomQuestion('')
        } else {
          handleExit()
        }
      }
      
      // 'W' opens Watson's Desk
      if (e.key.toLowerCase() === 'w' && isOpen && !showCustomInput) {
        e.preventDefault()
        openDesk()
        setLastContradictionCount(contradictions.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExiting, showCustomInput, openDesk, contradictions.length])

  // Focus custom input when shown
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus()
    }
  }, [showCustomInput])

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
          className="fixed inset-0 z-50 bg-noir-black overflow-hidden flex flex-col"
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
            className="h-auto min-h-[10vh] flex items-center justify-between px-4 sm:px-8 py-3 sm:py-0 border-b border-noir-gold/20"
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
                  className="text-lg sm:text-2xl font-serif text-noir-cream tracking-wide"
                  delay={300}
                />
                <p className="text-sm text-noir-ash mt-0.5">
                  {currentCharacter?.role || 'Suspect'}
                </p>
              </div>
            </div>

            {/* Scene Info + Watson Button */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-noir-gold font-serif text-sm tracking-widest uppercase">
                  Interrogation
                </p>
                <p className="text-noir-ash text-xs mt-1">
                  Round {roundNumber}
                </p>
              </div>
              
              {/* Watson Notes Button */}
              <motion.button
                onClick={() => {
                  openDesk()
                  setLastContradictionCount(contradictions.length)
                }}
                className="group relative flex items-center gap-2 px-4 py-2 rounded border border-noir-gold/30 hover:border-noir-gold/60 transition-colors duration-300 bg-noir-charcoal/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Open Watson's Investigation Notes"
              >
                <span className="text-noir-gold text-lg font-serif">W</span>
                <span className="text-noir-cream group-hover:text-noir-gold text-sm transition-colors">
                  Watson's Notes
                </span>
                {hasNewContradictions && (
                  <motion.span
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    !
                  </motion.span>
                )}
              </motion.button>
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
            className="flex-1 flex items-center justify-center px-4 sm:px-8 py-4 overflow-hidden"
            variants={videoVariants}
          >
            <div className="max-w-[1400px] w-full h-full relative flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden">
              {/* Character Portrait (Left Side - 60%) */}
              <div className="flex-1 lg:flex-[3] h-full flex items-center justify-center">
                <div
                  className="relative bg-noir-charcoal rounded-sm overflow-hidden border border-noir-smoke/20 h-full w-full"
                  style={{ maxWidth: '800px' }}
                >
                  {/* Live Character Portrait */}
                  <CharacterPortrait
                    characterId={characterId}
                    characterName={characterName}
                    emotionalState={currentEmotion?.primary || 'composed'}
                    intensity={currentEmotion?.intensity || 30}
                    tells={currentEmotion?.tells || []}
                    observableHint={currentEmotion?.observableHint}
                    className="w-full h-full"
                  />

                  {/* Psychology Overlay - Pressure Indicator */}
                  <div className="absolute top-4 right-4 z-10">
                    <PsychologyOverlay 
                      emotionalState={currentEmotion?.primary || 'composed'}
                      intensity={currentEmotion?.intensity || 30}
                    />
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

              {/* Dialogue Panel (Right Side - 40%) */}
              <div className="flex-1 lg:flex-[2] h-full flex flex-col justify-end pb-4 lg:pb-8">
                {/* Observable tells from the character */}
                {currentEmotion?.tells && currentEmotion.tells.length > 0 && (
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-noir-ash text-xs uppercase tracking-wider mb-2">You observe...</p>
                    {currentEmotion.tells.slice(0, 3).map((tell, i) => (
                      <motion.p
                        key={i}
                        className="text-noir-cream/70 text-sm italic ml-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + i * 0.2 }}
                      >
                        • {tell}
                      </motion.p>
                    ))}
                  </motion.div>
                )}

                {/* Character dialogue */}
                <DialogueBox
                  message={currentMessage}
                  isLoading={isThinking}
                  characterName={characterName}
                />

                {/* Watson insight hint */}
                {currentEmotion?.observableHint && currentMessage && (
                  <motion.div
                    className="mt-4 bg-noir-gold/10 border border-noir-gold/30 rounded px-4 py-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 }}
                  >
                    <p className="text-noir-gold text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-noir-gold animate-pulse" />
                      Detective's Instinct
                    </p>
                    <p className="text-noir-cream/80 text-sm mt-1 italic">
                      {currentEmotion.observableHint}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.main>

          {/* Question Bar - 20vh */}
          <motion.footer
            className="h-auto min-h-[15vh] sm:min-h-[20vh] border-t border-noir-gold/20 px-4 sm:px-8 py-3 sm:py-4"
            variants={footerVariants}
            style={{
              background: 'linear-gradient(to top, rgba(201, 162, 39, 0.03), transparent)',
            }}
          >
            {showRetry && (
              <div className="mb-3 text-center">
                <p className="text-noir-blood text-sm">The suspect doesn't seem to want to answer. Try again?</p>
                <button
                  onClick={handleRetry}
                  className="mt-2 px-4 py-1.5 text-sm border border-noir-gold/50 text-noir-gold bg-noir-gold/20 hover:bg-noir-gold/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            <QuestionCarousel
              characterId={characterId}
              onQuestionSelect={handleAskQuestion}
              isLoading={isThinking}
              showCustomInput={showCustomInput}
              setShowCustomInput={setShowCustomInput}
              customQuestion={customQuestion}
              setCustomQuestion={setCustomQuestion}
              onCustomSubmit={handleCustomSubmit}
              customInputRef={customInputRef}
              currentEmotion={currentEmotion}
            />
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// Supporting Components
// =============================================================================

// Dynamic psychology overlay showing emotional state
function PsychologyOverlay({ 
  emotionalState, 
  intensity 
}: { 
  emotionalState: string
  intensity: number 
}) {
  const getStateColor = () => {
    switch (emotionalState) {
      case 'breaking': return 'bg-noir-blood'
      case 'hostile': return 'bg-red-500'
      case 'defensive': return 'bg-orange-500'
      case 'nervous': return 'bg-yellow-500'
      case 'relieved': return 'bg-green-500'
      default: return 'bg-noir-gold/60'
    }
  }

  const getStateLabel = () => {
    if (intensity > 80) return 'Critical'
    if (intensity > 60) return 'High Stress'
    if (intensity > 40) return 'Elevated'
    if (intensity > 20) return 'Alert'
    return 'Composed'
  }

  return (
    <div className="bg-noir-black/70 backdrop-blur-sm rounded px-3 py-2 border border-noir-smoke/30">
      <p className="text-noir-gold text-xs font-medium">{getStateLabel()}</p>
      <div className="w-28 h-1.5 bg-noir-charcoal rounded-full mt-1.5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getStateColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${intensity}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <p className="text-noir-smoke text-[10px] mt-1 capitalize">{emotionalState}</p>
    </div>
  )
}

// Question suggestions based on context and emotional state
const QUESTION_SETS: Record<string, string[]> = {
  opening: [
    "Where were you at 11:30 PM?",
    "What was your relationship with Edmund?",
    "When did you last see him alive?",
    "Tell me about that night.",
  ],
  nervous: [
    "You seem nervous. Why?",
    "What aren't you telling me?",
    "I noticed you hesitated. Explain.",
    "Let's go over that again, slowly.",
  ],
  defensive: [
    "Why are you getting defensive?",
    "I have evidence that contradicts you.",
    "Someone saw you that night.",
    "The timeline doesn't add up.",
  ],
  breaking: [
    "I know you're hiding something.",
    "This is your last chance to tell the truth.",
    "The evidence points to you.",
    "What really happened?",
  ],
  followup: [
    "Tell me more about that.",
    "Who else knew about this?",
    "What happened next?",
    "And where were the others?",
  ],
}

function QuestionCarousel({
  onQuestionSelect,
  isLoading,
  showCustomInput,
  setShowCustomInput,
  customQuestion,
  setCustomQuestion,
  onCustomSubmit,
  customInputRef,
  currentEmotion,
}: {
  characterId: string
  onQuestionSelect: (question: string) => void
  isLoading: boolean
  showCustomInput: boolean
  setShowCustomInput: (show: boolean) => void
  customQuestion: string
  setCustomQuestion: (q: string) => void
  onCustomSubmit: (e: React.FormEvent) => void
  customInputRef: React.RefObject<HTMLInputElement | null>
  currentEmotion: EmotionData | null
}) {
  // Select question set based on emotional state
  const getQuestionSet = () => {
    if (!currentEmotion) return QUESTION_SETS.opening
    
    const { primary, intensity } = currentEmotion
    
    if (primary === 'breaking' || intensity > 80) return QUESTION_SETS.breaking
    if (primary === 'defensive' || intensity > 60) return QUESTION_SETS.defensive
    if (primary === 'nervous' || intensity > 40) return QUESTION_SETS.nervous
    
    return QUESTION_SETS.opening
  }

  const questions = getQuestionSet()

  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-noir-ash text-xs uppercase tracking-wider mb-3">
        {isLoading ? 'Waiting for response...' : 'Ask a question'}
      </p>
      
      {showCustomInput ? (
        <form onSubmit={onCustomSubmit} className="flex gap-3">
          <input
            ref={customInputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-noir-charcoal border border-noir-gold/40 rounded text-noir-cream placeholder-noir-smoke focus:outline-none focus:border-noir-gold transition-colors"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !customQuestion.trim()}
            className="px-6 py-3 bg-noir-gold/20 hover:bg-noir-gold/30 border border-noir-gold/40 rounded text-noir-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Ask
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setShowCustomInput(false)}
            className="px-4 py-3 bg-noir-charcoal border border-noir-smoke/30 rounded text-noir-ash hover:text-noir-cream transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        </form>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-noir-gold/20">
          {questions.map((q, i) => (
            <motion.button
              key={i}
              onClick={() => onQuestionSelect(q)}
              disabled={isLoading}
              className="flex-shrink-0 px-6 py-3 bg-noir-charcoal hover:bg-noir-slate border border-noir-smoke/30 hover:border-noir-gold/40 rounded text-noir-cream text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isLoading ? 1 : 1.02, y: isLoading ? 0 : -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {q}
            </motion.button>
          ))}
          <motion.button
            onClick={() => setShowCustomInput(true)}
            disabled={isLoading}
            className="flex-shrink-0 px-6 py-3 bg-transparent border border-dashed border-noir-smoke/30 hover:border-noir-gold/40 rounded text-noir-ash hover:text-noir-cream text-sm transition-colors duration-200 disabled:opacity-50"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
          >
            + Custom question
          </motion.button>
        </div>
      )}
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
