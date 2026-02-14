import { useState, useRef, useEffect, useContext, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import { sendMessage, healthCheck } from '../../api/client'
import { VoiceContext } from '../../hooks/useVoice'
import { EVIDENCE_DIALOGUE_UNLOCKS } from '../../data/evidence'
import { CHARACTER_GREETINGS } from '../../../mysteries/ashford-affair/characters'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [newContradiction, setNewContradiction] = useState<string | null>(null)
  const [hasShownGreeting, setHasShownGreeting] = useState<Set<string>>(new Set())
  const [showRetry, setShowRetry] = useState(false)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        'Did you see anyone near Edmund\'s office?',
      ],
      marcus: [
        'When did you last see Edmund alive?',
        'What was Edmund\'s state of health?',
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

    return suggestions.slice(0, 4)
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
        // Add the greeting as a character message
        addMessage({
          role: 'character',
          characterId: currentConversation,
          content: greeting,
        })
        setHasShownGreeting(prev => new Set([...prev, currentConversation]))
      }
    }
  }, [currentConversation, hasShownGreeting, addMessage])

  // Filter messages for current conversation
  const conversationMessages = messages.filter((m) => m.characterId === currentConversation)

  // Scroll to bottom on new messages
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

  const handleEndConversation = () => {
    voiceManager?.stop()
    endConversation()
  }

  if (!currentConversation || !currentCharacter) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-noir-ash p-6 bg-noir-charcoal">
        <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center border-2 border-noir-slate bg-noir-black/50">
          <span className="text-4xl text-noir-gold/50">?</span>
        </div>
        <p className="text-center mb-2 text-noir-cream/60 font-serif text-lg">Select a Suspect</p>
        <p className="text-center text-sm text-noir-smoke">
          Click on a character in the scene to begin questioning.
        </p>
        {apiConnected === false && (
          <div className="mt-6 p-3 bg-noir-blood/20 rounded border border-noir-blood/30 text-center">
            <p className="text-noir-blood text-sm font-medium">Server Offline</p>
            <p className="text-xs text-noir-ash mt-1">Run: npm run server</p>
          </div>
        )}
        {apiConnected === true && (
          <div className="mt-6 text-green-500/80 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AI Connected
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-noir-charcoal">
      {/* Header with character info */}
      <div className="px-4 py-3 border-b border-noir-slate/50 bg-gradient-to-r from-noir-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Character avatar */}
            <div className="w-12 h-12 rounded-full bg-noir-slate flex items-center justify-center border-2 border-noir-gold/30">
              <span className="text-lg font-serif text-noir-gold">
                {currentCharacter.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="text-noir-gold font-serif text-lg">{currentCharacter.name}</h3>
              <p className="text-noir-smoke text-xs">{currentCharacter.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pressure indicator */}
            {currentCharacter.pressure && currentCharacter.pressure.level > 0 && (
              <div className="flex flex-col items-end" title={`Pressure: ${Math.round(currentCharacter.pressure.level)}%`}>
                <span className="text-[10px] text-noir-smoke mb-1">PRESSURE</span>
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

            <button
              onClick={handleEndConversation}
              className="px-3 py-1.5 text-xs border border-noir-slate text-noir-smoke hover:border-noir-gold hover:text-noir-gold transition-colors rounded"
            >
              END
            </button>
          </div>
        </div>
      </div>

      {/* API Status */}
      {apiConnected === false && (
        <div className="px-4 py-2 bg-noir-blood/20 text-noir-blood text-sm flex items-center gap-2 border-b border-noir-blood/30">
          <span className="w-2 h-2 bg-noir-blood rounded-full" />
          Server offline - run `npm run server`
        </div>
      )}

      {/* Contradiction notification */}
      {newContradiction && (
        <div className="px-4 py-3 bg-noir-blood/20 border-b border-noir-blood/50 animate-pulse">
          <div className="flex items-start gap-3">
            <span className="text-noir-blood text-xl">⚠</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-noir-blood uppercase tracking-wider mb-1">
                Contradiction Detected
              </p>
              <p className="text-sm text-noir-cream">{newContradiction}</p>
            </div>
            <button
              onClick={() => setNewContradiction(null)}
              className="text-noir-smoke hover:text-noir-cream"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onWheel={(e) => e.stopPropagation()}
      >
        {conversationMessages.map((message) => (
          <div
            key={message.id}
            className={`${message.role === 'player' ? 'flex justify-end' : ''}`}
          >
            {message.role === 'player' ? (
              /* Player message - right aligned */
              <div className="max-w-[85%]">
                <div className="px-4 py-2.5 bg-noir-gold/20 border border-noir-gold/40 rounded-lg rounded-br-sm">
                  <p className="text-sm text-noir-cream">{message.content}</p>
                </div>
              </div>
            ) : (
              /* Character message - left aligned */
              <div className="max-w-[90%]">
                <div className="px-4 py-3 bg-noir-slate/40 border border-noir-slate/60 rounded-lg rounded-bl-sm">
                  <p className="text-sm text-noir-cream whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="max-w-[85%]">
            <div className="px-4 py-3 bg-noir-slate/40 border border-noir-slate/60 rounded-lg rounded-bl-sm">
              <div className="flex items-center gap-2 text-noir-ash">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-noir-gold/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-noir-gold/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-noir-gold/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm italic">{currentCharacter.name} is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {showRetry && (
          <div className="px-4 py-2">
            <p className="text-center text-noir-blood text-sm">The suspect doesn't seem to want to answer. Try again?</p>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-1.5 text-sm border border-noir-gold/50 text-noir-gold rounded hover:bg-noir-gold/20 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {suggestedQuestions.length > 0 && !isLoading && (
        <div
          className="px-4 py-2 border-t border-noir-slate/30 bg-noir-black/30"
          onWheel={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] text-noir-smoke uppercase tracking-wider mb-2">Suggested Questions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="px-3 py-1.5 text-xs bg-noir-slate/40 hover:bg-noir-gold/20 text-noir-cream/80 hover:text-noir-cream rounded border border-noir-slate/50 hover:border-noir-gold/50 transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-noir-slate/50 bg-noir-black/30">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your question..."
            disabled={isLoading}
            className="flex-1 bg-noir-black/60 text-noir-cream placeholder-noir-smoke/50 px-4 py-3 text-sm rounded-lg border border-noir-slate/50 focus:outline-none focus:border-noir-gold transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-noir-gold text-noir-black rounded-lg hover:bg-noir-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
          >
            ASK
          </button>
        </div>
      </form>
    </div>
  )
}
