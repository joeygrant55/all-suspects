import { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { useGameStore } from '../../game/state'
import { sendMessage, healthCheck } from '../../api/client'
import { VoiceContext } from '../../hooks/useVoice'
import { EVIDENCE_DIALOGUE_UNLOCKS } from '../../data/evidence'
import { CHARACTER_GREETINGS } from '../../../mysteries/ashford-affair/characters'

import { CinematicEffects, GoldBorder, ModalBackdrop } from './CinematicEffects'
import { CharacterPortrait } from './CharacterPortrait'
import { ConversationThread } from './ConversationThread'
import { QuestionInput } from './QuestionInput'

export function InterrogationModal() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [newContradiction, setNewContradiction] = useState<string | null>(null)
  const [hasShownGreeting, setHasShownGreeting] = useState<Set<string>>(new Set())

  // Game state
  const currentConversation = useGameStore((state) => state.currentConversation)
  const characters = useGameStore((state) => state.characters)
  const messages = useGameStore((state) => state.messages)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const addMessage = useGameStore((state) => state.addMessage)
  const addContradictions = useGameStore((state) => state.addContradictions)
  const updateCharacterPressure = useGameStore((state) => state.updateCharacterPressure)
  const endConversation = useGameStore((state) => state.endConversation)

  const voiceManager = useContext(VoiceContext)
  const currentCharacter = characters.find((c) => c.id === currentConversation)

  // Filter messages for current conversation
  const conversationMessages = useMemo(
    () => messages.filter((m) => m.characterId === currentConversation),
    [messages, currentConversation]
  )

  // Generate suggested questions based on evidence and character
  const suggestedQuestions = useMemo(() => {
    if (!currentConversation) return []

    const suggestions: string[] = []

    const baseQuestions: Record<string, string[]> = {
      victoria: [
        'Where were you when Edmund died?',
        'How was your relationship with Edmund?',
      ],
      thomas: [
        'Where were you at 11:30 PM?',
        'Tell me about your relationship with your father.',
      ],
      eleanor: [
        'What were you working on tonight?',
        "Did you see anyone near Edmund's office?",
      ],
      marcus: [
        'When did you last see Edmund alive?',
        "What was Edmund's state of health?",
      ],
      lillian: [
        'How long have you known the family?',
        'What brought you here tonight?',
      ],
      james: [
        'Walk me through your duties tonight.',
        'Did you notice anything out of place?',
      ],
    }

    const charQuestions = baseQuestions[currentConversation] || []
    suggestions.push(...charQuestions)

    // Add evidence-based questions
    collectedEvidence.forEach((evidence) => {
      const unlocks = EVIDENCE_DIALOGUE_UNLOCKS[evidence.source]
      if (unlocks) {
        unlocks.forEach((unlock) => {
          if (unlock.characterId === currentConversation && !suggestions.includes(unlock.prompt)) {
            suggestions.push(unlock.prompt)
          }
        })
      }
    })

    return suggestions.slice(0, 3)
  }, [currentConversation, collectedEvidence])

  // Check API connection on mount
  useEffect(() => {
    healthCheck().then(setApiConnected)
  }, [])

  // Show greeting when starting a new conversation
  useEffect(() => {
    if (currentConversation && !hasShownGreeting.has(currentConversation)) {
      const greeting = CHARACTER_GREETINGS[currentConversation]
      if (greeting) {
        addMessage({
          role: 'character',
          characterId: currentConversation,
          content: greeting,
        })
        setHasShownGreeting((prev) => new Set([...prev, currentConversation]))
      }
    }
  }, [currentConversation, hasShownGreeting, addMessage])

  const handleClose = useCallback(() => {
    voiceManager?.stop()
    endConversation()
  }, [voiceManager, endConversation])

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentConversation) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentConversation, handleClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentConversation || isLoading) return

    const playerMessage = input.trim()
    setInput('')

    addMessage({
      role: 'player',
      characterId: currentConversation,
      content: playerMessage,
    })

    setIsLoading(true)

    try {
      const response = await sendMessage(currentConversation, playerMessage)
      addMessage({
        role: 'character',
        characterId: currentConversation,
        content: response.message,
      })

      if (response.contradictions && response.contradictions.length > 0) {
        addContradictions(response.contradictions)
        const firstContradiction = response.contradictions[0]
        setNewContradiction(firstContradiction.explanation)
        setTimeout(() => setNewContradiction(null), 6000)
      }

      if (response.pressure) {
        updateCharacterPressure(currentConversation, response.pressure)
      }

      if (voiceManager?.voiceEnabled && response.message) {
        voiceManager.speak(currentConversation, response.message)
      }
    } catch (error) {
      console.error('Error:', error)
      addMessage({
        role: 'character',
        characterId: currentConversation,
        content: '*The connection seems to have been lost. Please ensure the server is running.*',
      })
      setApiConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if no conversation
  if (!currentConversation || !currentCharacter) {
    return null
  }

  // Show suggestions only for first 2 exchanges
  const showSuggestions = conversationMessages.length <= 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <ModalBackdrop onClick={handleClose} />

      {/* Modal container - 70% viewport */}
      <div
        className="relative w-full max-w-5xl h-[80vh] max-h-[800px] flex flex-col rounded-lg overflow-hidden animate-modalEnter"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.8), 0 0 100px rgba(201, 162, 39, 0.1)',
        }}
      >
        {/* Cinematic effects layer */}
        <CinematicEffects showGrain={true} showVignette={true} />

        {/* Gold decorative borders */}
        <GoldBorder position="top" />
        <GoldBorder position="bottom" />

        {/* Header section with character portrait */}
        <div className="relative z-20 px-8 py-6 border-b border-noir-slate/30 bg-noir-black/50">
          <CharacterPortrait character={currentCharacter} onClose={handleClose} />

          {/* API status warning */}
          {apiConnected === false && (
            <div className="mt-4 px-4 py-3 bg-noir-blood/20 rounded-lg border border-noir-blood/30 flex items-center gap-3">
              <span className="w-2 h-2 bg-noir-blood rounded-full animate-pulse" />
              <span className="text-sm text-noir-blood">
                Server offline - run `npm run server`
              </span>
            </div>
          )}
        </div>

        {/* Contradiction alert banner */}
        {newContradiction && (
          <div className="relative z-20 px-8 py-4 bg-noir-blood/20 border-b border-noir-blood/30 animate-slideDown">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-noir-blood/30 flex items-center justify-center">
                <span className="text-noir-blood text-xl">!</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-noir-blood uppercase tracking-widest mb-1">
                  Contradiction Detected
                </p>
                <p className="text-sm text-noir-cream leading-relaxed">{newContradiction}</p>
              </div>
              <button
                onClick={() => setNewContradiction(null)}
                className="text-noir-smoke hover:text-noir-cream transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Horizontal divider with decorative elements */}
        <div className="relative z-20 flex items-center px-8 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-noir-slate/50 to-transparent" />
        </div>

        {/* Conversation thread */}
        <ConversationThread
          messages={conversationMessages}
          characterName={currentCharacter.name}
          isLoading={isLoading}
        />

        {/* Question input */}
        <div className="relative z-20">
          <QuestionInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            suggestedQuestions={suggestedQuestions}
            showSuggestions={showSuggestions}
          />
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-modalEnter {
          animation: modalEnter 0.3s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
