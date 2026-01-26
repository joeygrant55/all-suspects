import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from '../UI/CharacterPortrait'

interface CharacterInterrogationProps {
  characterId: string
  onClose: () => void
}

export function CharacterInterrogation({ characterId, onClose }: CharacterInterrogationProps) {
  const { characters, messages, addMessage, psychology } = useGameStore()
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const character = characters.find((c) => c.id === characterId)
  const conversationMessages = messages.filter((m) => m.characterId === characterId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    // Add player message
    addMessage({
      role: 'player',
      content: inputValue,
    })

    const question = inputValue
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      addMessage({
        role: 'character',
        characterId,
        content: `[AI Response to: "${question}"]`,
      })
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Suggested questions (context-aware)
  const suggestedQuestions = [
    'Where were you at midnight?',
    'What was your relationship with Charles?',
    'Did you see anything unusual?',
  ]

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

      {/* Close button */}
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
        {/* Character portrait section */}
        <div className="flex-shrink-0 flex items-center justify-center py-8 border-b border-noir-slate/30">
          <div className="text-center">
            <CharacterPortrait
              characterId={character.id}
              name={character.name}
              role={character.role}
              size="large"
              isActive={true}
            />

            {/* Emotional state indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-noir-smoke">Pressure:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-2 h-4 ${
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
            </motion.div>
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
