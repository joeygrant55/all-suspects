import { useState, useRef, useEffect, useContext, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import { sendMessage, healthCheck } from '../../api/client'
import { VoiceContext } from '../../hooks/useVoice'
import { EVIDENCE_DIALOGUE_UNLOCKS } from '../../data/evidence'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [newContradiction, setNewContradiction] = useState<string | null>(null)
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

    // Base questions for each character
    const baseQuestions: Record<string, string[]> = {
      victoria: [
        'Where were you when Edmund died?',
        'How was your relationship with Edmund?',
        'Did you notice anything unusual tonight?',
      ],
      thomas: [
        'Where were you at 11:30 PM?',
        'I heard you argued with your father tonight.',
        'Tell me about your inheritance.',
      ],
      eleanor: [
        'What were you working on in the study?',
        'Did you see anyone near Edmund\'s office?',
        'What was Edmund\'s mood tonight?',
      ],
      marcus: [
        'Why did you arrive late tonight?',
        'What was Edmund\'s state of health?',
        'Did you prescribe any medications recently?',
      ],
      lillian: [
        'How long have you known the family?',
        'What were you doing in the garden?',
        'Did you see anyone else outside?',
      ],
      james: [
        'Walk me through your duties tonight.',
        'Who served Edmund his champagne?',
        'Did you notice anything out of place?',
      ],
    }

    // Add base questions
    const charQuestions = baseQuestions[currentConversation] || []
    suggestions.push(...charQuestions.slice(0, 2))

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

    // Limit to 3 suggestions max
    return suggestions.slice(0, 3)
  }, [currentConversation, collectedEvidence])

  // Handle clicking a suggested question
  const handleSuggestionClick = (question: string) => {
    setInput(question)
  }

  // Check API connection on mount
  useEffect(() => {
    healthCheck().then(setApiConnected)
  }, [])

  // Filter messages for current conversation
  const conversationMessages = messages.filter((m) => m.characterId === currentConversation)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

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

      // Handle any detected contradictions
      if (response.contradictions && response.contradictions.length > 0) {
        addContradictions(response.contradictions)
        // Show the first contradiction as a notification
        const firstContradiction = response.contradictions[0]
        setNewContradiction(firstContradiction.explanation)
        // Auto-dismiss after 6 seconds
        setTimeout(() => setNewContradiction(null), 6000)
      }

      // Update character pressure level
      if (response.pressure) {
        updateCharacterPressure(currentConversation, response.pressure)
      }

      // Trigger voice synthesis for character response
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

  // Stop voice when ending conversation
  const handleEndConversation = () => {
    voiceManager?.stop()
    endConversation()
  }

  if (!currentConversation || !currentCharacter) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-noir-ash p-6">
        <div
          className="w-16 h-16 rounded-sm mb-4 flex items-center justify-center"
          style={{
            border: '2px solid #4a4a4a',
            background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
          }}
        >
          <span className="text-3xl text-noir-gold" style={{ fontFamily: 'Georgia, serif' }}>
            ?
          </span>
        </div>
        <p className="text-center mb-2 text-noir-cream font-serif text-sm">No Suspect Selected</p>
        <p className="text-center text-xs text-noir-smoke">
          Select a suspect above to begin questioning.
        </p>
        {apiConnected === false && (
          <div className="mt-4 p-2 bg-noir-blood/20 rounded text-center">
            <p className="text-noir-blood text-xs">API Server Offline</p>
            <p className="text-xs text-noir-ash mt-1">Run: npm run server</p>
          </div>
        )}
        {apiConnected === true && (
          <div className="mt-4 text-green-600/80 text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
            AI Connected
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-noir-charcoal">
      {/* Compact header - just name and end button */}
      <div className="px-3 py-2 border-b border-noir-slate flex items-center justify-between bg-noir-black/30">
        <div className="flex items-center gap-2">
          <span
            className="text-noir-cream text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Interrogating
          </span>
          <span
            className="text-noir-gold font-medium"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {currentCharacter.name}
          </span>
          {/* Pressure indicator */}
          {currentCharacter.pressure && currentCharacter.pressure.level > 0 && (
            <div className="flex items-center gap-1" title={`Pressure: ${Math.round(currentCharacter.pressure.level)}%`}>
              <div className="w-16 h-1.5 bg-noir-slate/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentCharacter.pressure.level >= 80 ? 'bg-noir-blood animate-pulse' :
                    currentCharacter.pressure.level >= 60 ? 'bg-amber-500' :
                    currentCharacter.pressure.level >= 30 ? 'bg-amber-700' :
                    'bg-noir-gold/50'
                  }`}
                  style={{ width: `${currentCharacter.pressure.level}%` }}
                />
              </div>
              {currentCharacter.pressure.level >= 80 && (
                <span className="text-xs text-noir-blood animate-pulse">!</span>
              )}
            </div>
          )}
          {/* Voice indicator */}
          {voiceManager?.isPlaying && (
            <span className="flex items-center gap-1 text-xs text-noir-gold">
              <span className="w-1.5 h-1.5 bg-noir-gold rounded-full animate-pulse" />
              speaking
            </span>
          )}
          {voiceManager?.isLoading && (
            <span className="flex items-center gap-1 text-xs text-noir-smoke">
              <span className="w-1.5 h-1.5 bg-noir-smoke rounded-full animate-pulse" />
              loading voice
            </span>
          )}
        </div>
        <button
          onClick={handleEndConversation}
          className="px-2 py-1 text-xs border border-noir-slate text-noir-smoke hover:border-noir-gold hover:text-noir-gold transition-colors"
        >
          END
        </button>
      </div>

      {/* API Status */}
      {apiConnected === false && (
        <div className="px-3 py-1.5 bg-noir-blood/20 text-noir-blood text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-noir-blood rounded-full" />
          Server offline - run `npm run server`
        </div>
      )}

      {/* Contradiction notification */}
      {newContradiction && (
        <div
          className="px-3 py-2.5 bg-noir-blood/30 border-l-4 border-noir-blood text-noir-cream animate-pulse"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <div className="flex items-start gap-2">
            <span className="text-noir-blood text-lg shrink-0">!</span>
            <div>
              <p className="text-xs font-bold text-noir-blood uppercase tracking-wider mb-1">
                Contradiction Detected
              </p>
              <p className="text-sm">{newContradiction}</p>
            </div>
            <button
              onClick={() => setNewContradiction(null)}
              className="ml-auto text-noir-smoke hover:text-noir-cream text-lg shrink-0"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Messages - now has much more space */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-3"
        onWheel={(e) => e.stopPropagation()}
      >
        {conversationMessages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-noir-smoke italic text-sm">
              {currentCharacter.name} awaits your questions...
            </p>
          </div>
        )}
        {conversationMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] ${
                message.role === 'player' ? 'text-right' : 'text-left'
              }`}
            >
              {/* Speaker label */}
              <p
                className={`text-xs mb-0.5 ${
                  message.role === 'player' ? 'text-noir-gold' : 'text-noir-smoke'
                }`}
              >
                {message.role === 'player' ? 'You' : currentCharacter.name}
              </p>
              {/* Message bubble */}
              <div
                className={`px-3 py-2 rounded-sm ${
                  message.role === 'player'
                    ? 'bg-noir-gold/20 border border-noir-gold/40 text-noir-cream'
                    : 'bg-noir-slate/60 border border-noir-smoke/20 text-noir-cream'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
              {/* Replay voice button for character messages */}
              {message.role === 'character' && voiceManager?.voiceEnabled && (
                <button
                  onClick={() => voiceManager.speak(currentConversation!, message.content)}
                  disabled={voiceManager.isLoading || voiceManager.isPlaying}
                  className="mt-1 text-xs text-noir-smoke hover:text-noir-gold transition-colors disabled:opacity-50"
                  title="Replay voice"
                >
                  {voiceManager.isPlaying ? '...' : '🔊 replay'}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="text-left">
              <p className="text-xs mb-0.5 text-noir-smoke">{currentCharacter.name}</p>
              <div className="bg-noir-slate/60 border border-noir-smoke/20 text-noir-cream px-3 py-2 rounded-sm">
                <p className="text-sm animate-pulse text-noir-ash italic">thinking...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions - compact inline */}
      {suggestedQuestions.length > 0 && (
        <div className="px-3 py-1.5 border-t border-noir-slate/30 bg-noir-black/20 flex items-center gap-2 overflow-x-auto" onWheel={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-noir-smoke shrink-0">Try:</span>
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(question)}
              className="px-2 py-0.5 text-[11px] bg-noir-slate/30 hover:bg-noir-gold/20 text-noir-cream/70 hover:text-noir-cream rounded-sm shrink-0 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-noir-slate">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your question..."
            disabled={isLoading}
            className="flex-1 bg-noir-black/50 text-noir-cream placeholder-noir-smoke px-3 py-2 text-sm rounded-sm border border-noir-slate focus:outline-none focus:border-noir-gold transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-noir-gold text-noir-black rounded-sm hover:bg-noir-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
          >
            ASK
          </button>
        </div>
      </form>
    </div>
  )
}
