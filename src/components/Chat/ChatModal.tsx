import { useState, useRef, useEffect, useContext, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import { sendMessage, healthCheck } from '../../api/client'
import { VoiceContext } from '../../hooks/useVoice'
import { EVIDENCE_DIALOGUE_UNLOCKS } from '../../data/evidence'
import { CHARACTER_GREETINGS } from '../../../mysteries/ashford-affair/characters'

export function ChatModal() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [newContradiction, setNewContradiction] = useState<string | null>(null)
  const [hasShownGreeting, setHasShownGreeting] = useState<Set<string>>(new Set())
  const [showRetry, setShowRetry] = useState(false)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Suggested questions
  const suggestedQuestions = useMemo(() => {
    if (!currentConversation) return []

    const suggestions: string[] = []

    const baseQuestions: Record<string, string[]> = {
      victoria: ['Where were you when Edmund died?', 'How was your relationship with Edmund?'],
      thomas: ['Where were you at 11:30 PM?', 'Tell me about your relationship with your father.'],
      eleanor: ['What were you working on tonight?', 'Did you see anyone near Edmund\'s office?'],
      marcus: ['When did you last see Edmund alive?', 'What was Edmund\'s state of health?'],
      lillian: ['How long have you known the family?', 'What brought you here tonight?'],
      james: ['Walk me through your duties tonight.', 'Did you notice anything out of place?'],
    }

    const charQuestions = baseQuestions[currentConversation] || []
    suggestions.push(...charQuestions)

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

  // Check API connection
  useEffect(() => {
    healthCheck().then(setApiConnected)
  }, [])

  // Show greeting when conversation starts
  useEffect(() => {
    if (currentConversation && !hasShownGreeting.has(currentConversation)) {
      const greeting = CHARACTER_GREETINGS[currentConversation]
      if (greeting) {
        addMessage({
          role: 'character',
          characterId: currentConversation,
          content: greeting,
        })
        setHasShownGreeting(prev => new Set([...prev, currentConversation]))
      }
    }
  }, [currentConversation, hasShownGreeting, addMessage])

  // Focus input when modal opens
  useEffect(() => {
    if (currentConversation) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentConversation])

  // Filter messages for current conversation
  const conversationMessages = messages.filter((m) => m.characterId === currentConversation)

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  const sendQuestion = async (question: string, addPlayerMessage = true) => {
    if (!currentConversation || isLoading) return

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return

    setShowRetry(false)
    setLastQuestion(trimmedQuestion)

    if (addPlayerMessage) {
      setInput('')
      addMessage({
        role: 'player',
        characterId: currentConversation,
        content: trimmedQuestion,
      })
    }

    setIsLoading(true)

    try {
      const response = await sendMessage(currentConversation, trimmedQuestion)
      addMessage({
        role: 'character',
        characterId: currentConversation,
        content: response.message,
      })

      const contradictions = response.contradictions
      if (contradictions && contradictions.length > 0) {
        addContradictions(contradictions)
        setNewContradiction(contradictions[0].explanation)
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
        content: "The suspect doesn't seem to want to answer. Try again?",
      })
      setShowRetry(true)
      setApiConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentConversation || isLoading) return
    await sendQuestion(input, true)
  }

  const handleRetry = () => {
    if (lastQuestion) {
      sendQuestion(lastQuestion, false)
    }
  }

  const handleClose = () => {
    voiceManager?.stop()
    endConversation()
  }

  // Don't render if no conversation
  if (!currentConversation || !currentCharacter) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-noir-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full md:w-full md:max-w-2xl md:max-h-[85vh] md:h-auto md:min-h-0 flex flex-col bg-noir-charcoal border border-noir-slate/50 rounded-none md:rounded-lg shadow-2xl overflow-hidden">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-noir-gold to-transparent" />

        {/* Header */}
        <div className="relative px-4 sm:px-6 py-4 border-b border-noir-slate/30 bg-noir-black/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Character portrait placeholder */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-noir-slate to-noir-charcoal flex items-center justify-center border-2 border-noir-gold/40 shadow-lg">
                <span className="text-lg sm:text-xl font-serif text-noir-gold">
                  {currentCharacter.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-noir-gold font-serif text-lg sm:text-xl">{currentCharacter.name}</h2>
                <p className="text-noir-smoke text-sm">{currentCharacter.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Pressure meter */}
              {currentCharacter.pressure && currentCharacter.pressure.level > 0 && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-noir-smoke uppercase tracking-wider mb-1">Pressure</p>
                  <div className="w-20 h-2 bg-noir-slate/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentCharacter.pressure.level >= 80 ? 'bg-noir-blood animate-pulse' :
                        currentCharacter.pressure.level >= 50 ? 'bg-amber-500' :
                        'bg-noir-gold/60'
                      }`}
                      style={{ width: `${currentCharacter.pressure.level}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center text-noir-smoke hover:text-noir-gold hover:bg-noir-slate/50 rounded transition-all"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* API status */}
          {apiConnected === false && (
            <div className="mt-3 px-3 py-2 bg-noir-blood/20 rounded text-noir-blood text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-noir-blood rounded-full" />
              Server offline - run `npm run server`
            </div>
          )}
        </div>

        {/* Contradiction alert */}
        {newContradiction && (
          <div className="px-4 sm:px-6 py-3 bg-noir-blood/20 border-b border-noir-blood/30">
            <div className="flex items-start gap-3">
              <span className="text-noir-blood text-lg">⚠</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-noir-blood uppercase tracking-wider">Contradiction Detected</p>
                <p className="text-sm text-noir-cream mt-1">{newContradiction}</p>
              </div>
              <button onClick={() => setNewContradiction(null)} className="text-noir-smoke hover:text-noir-cream">✕</button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {conversationMessages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'player' ? 'flex justify-end' : ''}
            >
              {message.role === 'player' ? (
                <div className="max-w-[82%]">
                  <div className="px-4 py-3 bg-noir-gold/15 border border-noir-gold/30 rounded-2xl rounded-br-md">
                    <p className="text-sm text-noir-cream">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[84%]">
                  <div className="px-4 py-3 bg-noir-slate/30 border border-noir-slate/40 rounded-2xl rounded-bl-md">
                    <p className="text-sm text-noir-cream whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="max-w-[82%]">
              <div className="px-4 py-3 bg-noir-slate/30 border border-noir-slate/40 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-3 text-noir-ash">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-noir-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-noir-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-noir-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm italic">{currentCharacter.name} is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {showRetry && (
            <div className="px-4 sm:px-6 py-2">
              <p className="text-center text-noir-blood text-sm">The suspect doesn't seem to want to answer. Try again?</p>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-1.5 text-sm border border-noir-gold/50 text-noir-gold rounded-full hover:bg-noir-gold/20 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {suggestedQuestions.length > 0 && !isLoading && conversationMessages.length <= 2 && (
          <div className="px-4 sm:px-6 py-3 border-t border-noir-slate/20 bg-noir-black/30">
            <p className="text-[10px] text-noir-smoke uppercase tracking-wider mb-2">Ask about...</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => setInput(question)}
                  className="px-3 py-1.5 text-xs bg-noir-slate/30 hover:bg-noir-gold/20 text-noir-cream/70 hover:text-noir-cream rounded-full border border-noir-slate/40 hover:border-noir-gold/40 transition-all"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-noir-slate/30 bg-noir-black/40">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your question..."
              disabled={isLoading}
              className="flex-1 bg-noir-black/50 text-noir-cream placeholder-noir-smoke/50 px-4 py-3 text-sm rounded-full border border-noir-slate/40 focus:outline-none focus:border-noir-gold/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-noir-gold text-noir-black rounded-full hover:bg-noir-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-sm"
            >
              Ask
            </button>
          </div>
        </form>

        {/* Decorative bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-noir-gold/30 to-transparent" />
      </div>
    </div>
  )
}
