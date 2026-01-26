import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from '../UI/CharacterPortrait'
import { sendMessage, analyzeWithWatson } from '../../api/client'

interface CharacterInterrogationProps {
  characterId: string
  onClose: () => void
}

// Evidence notification toast component
function EvidenceToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-noir-gold/90 text-noir-black px-6 py-3 rounded shadow-lg"
    >
      <p className="text-sm font-serif flex items-center gap-2">
        <span>📋</span> {message}
      </p>
    </motion.div>
  )
}

export function CharacterInterrogation({ characterId, onClose }: CharacterInterrogationProps) {
  const { 
    characters, 
    messages, 
    addMessage, 
    psychology,
    updatePsychology,
    addEvidence,
    addContradictions,
    updateCharacterPressure
  } = useGameStore()
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidenceToast, setEvidenceToast] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const character = characters.find((c) => c.id === characterId)
  const conversationMessages = messages.filter(
    (m) => m.characterId === characterId || (m.role === 'player' && !m.characterId)
  ).slice(-20) // Keep last 20 messages for this character

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping || !character) return

    const question = inputValue
    setInputValue('')
    setError(null)
    
    // Add player message
    addMessage({
      role: 'player',
      content: question,
      characterId,
    })

    setIsTyping(true)

    try {
      // Call the real AI backend
      const response = await sendMessage(characterId, question)
      
      // Add character response
      addMessage({
        role: 'character',
        characterId,
        content: response.message,
      })

      // Update pressure if returned
      if (response.pressure) {
        updateCharacterPressure(characterId, response.pressure)
        updatePsychology({ 
          pressureLevel: Math.min(5, Math.max(1, response.pressure.level)) as 1|2|3|4|5
        })
      }

      // Add evidence from conversation
      if (response.statementId) {
        addEvidence({
          type: 'testimony',
          description: `${character.name}: "${response.message.substring(0, 100)}..."`,
          source: `${characterId}-${response.statementId}`,
        })
        setEvidenceToast(`Testimony recorded from ${character.name}`)
      }

      // Handle contradictions
      if (response.contradictions && response.contradictions.length > 0) {
        addContradictions(response.contradictions)
        updatePsychology({ isLying: true })
      } else {
        updatePsychology({ isLying: false })
      }

      // Run Watson analysis in background
      analyzeWithWatson(
        characterId,
        character.name,
        response.message,
        question,
        response.pressure?.level || 0
      ).catch(console.error) // Don't block on Watson

    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to get response. Please try again.')
      // Add error message to chat for visibility
      addMessage({
        role: 'character',
        characterId,
        content: '*clears throat* I... I need a moment. Ask me again.',
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Suggested questions (character-specific)
  const getSuggestedQuestions = () => {
    const baseQuestions = [
      'Where were you at midnight when Charles was killed?',
      'What was your relationship with Charles Ashford?',
    ]
    
    const characterQuestions: Record<string, string[]> = {
      victoria: [
        'How was your marriage to Charles?',
        'Did you know about the will changes?',
        'Were you aware of any affairs?',
      ],
      thomas: [
        'What did your father think of your lifestyle?',
        'Were you in debt to anyone?',
        'Did you argue with your father recently?',
      ],
      eleanor: [
        'How long have you worked for the Ashfords?',
        'Did Charles confide in you about anything?',
        'Did you notice anything unusual in his papers?',
      ],
      marcus: [
        'What was Charles\'s health like?',
        'Did you prescribe him any medications?',
        'Were you treating anyone else at the manor?',
      ],
      lillian: [
        'How did you know Charles?',
        'When did you last see him before the party?',
        'What brought you to the manor tonight?',
      ],
      james: [
        'Who did you see enter and leave the study?',
        'Did you hear any arguments?',
        'Was anything out of place when you did your rounds?',
      ],
    }
    
    return [...baseQuestions, ...(characterQuestions[characterId] || [])]
  }
  
  const suggestedQuestions = getSuggestedQuestions()

  if (!character) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-noir-black z-50">
      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-noir-black letterbox-border" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-noir-black letterbox-border" />

      {/* Evidence toast */}
      <AnimatePresence>
        {evidenceToast && (
          <EvidenceToast 
            message={evidenceToast} 
            onDismiss={() => setEvidenceToast(null)} 
          />
        )}
      </AnimatePresence>

      {/* Back button - prominent */}
      <motion.button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 px-4 py-2 flex items-center gap-2 bg-noir-charcoal/90 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors font-serif text-sm"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ← Back to Investigation
      </motion.button>

      {/* Close X button */}
      <motion.button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-noir-charcoal/80 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        ✕
      </motion.button>

      {/* Main layout */}
      <div className="h-full flex flex-col pt-12 pb-12">
        {/* Character portrait section - more compact */}
        <div className="flex-shrink-0 flex items-center justify-center py-4 border-b border-noir-slate/30">
          <div className="flex items-center gap-6">
            <CharacterPortrait
              characterId={character.id}
              name={character.name}
              role={character.role}
              size="medium"
              isActive={true}
            />

            {/* Character info and emotional state */}
            <div className="text-left">
              <h2 className="text-noir-cream font-serif text-xl">{character.name}</h2>
              <p className="text-noir-smoke text-sm italic">{character.role}</p>
              
              {/* Pressure meter */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-noir-smoke text-xs">Pressure:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-2 h-3 ${
                        level <= psychology.pressureLevel
                          ? 'bg-noir-gold'
                          : 'bg-noir-slate'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {psychology.isLying && (
                <p className="text-xs text-noir-blood mt-1 italic">
                  Something feels off...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <AnimatePresence>
            {conversationMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-6 py-4 rounded ${
                    msg.role === 'player'
                      ? 'bg-noir-gold/20 border border-noir-gold/30 text-noir-cream'
                      : 'bg-noir-charcoal/50 border border-noir-slate/30 text-noir-cream'
                  }`}
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  <p className="text-base leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-2xl px-6 py-4 bg-noir-charcoal/50 border border-noir-slate/30 rounded">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-noir-gold animate-pulse" />
                  <div
                    className="w-2 h-2 rounded-full bg-noir-gold animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-noir-gold animate-pulse"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-8 py-2">
            <p className="text-noir-blood text-sm text-center">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 px-8 pb-6 space-y-4">
          {/* Suggested questions */}
          {conversationMessages.length === 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((question) => (
                <motion.button
                  key={question}
                  onClick={() => setInputValue(question)}
                  className="px-4 py-2 bg-noir-charcoal/50 border border-noir-slate/50 hover:border-noir-gold/50 text-noir-smoke hover:text-noir-cream text-sm transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {question}
                </motion.button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="flex gap-4 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-1 px-6 py-4 bg-noir-charcoal/50 border-2 border-noir-slate/50 focus:border-noir-gold/50 text-noir-cream placeholder-noir-smoke outline-none transition-colors font-serif"
              style={{ fontFamily: 'var(--font-serif)' }}
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-8 py-4 bg-noir-gold/20 border-2 border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif"
              whileHover={inputValue.trim() && !isTyping ? { scale: 1.05 } : {}}
              whileTap={inputValue.trim() && !isTyping ? { scale: 0.95 } : {}}
            >
              Ask
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
