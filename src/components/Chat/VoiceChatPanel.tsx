/**
 * VoiceChatPanel - Voice-enabled interrogation interface
 * 
 * Full-duplex voice conversation with NPCs using PersonaPlex.
 * Players can speak naturally and hear responses in character-unique voices.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoiceChat } from '../../hooks/useVoiceChat'

interface VoiceChatPanelProps {
  characterId: string
  characterName: string
  onClose: () => void
  onTranscript?: (speaker: 'player' | 'npc', text: string) => void
  personaPlexUrl?: string
}

export function VoiceChatPanel({
  characterId,
  characterName,
  onClose,
  onTranscript,
  personaPlexUrl,
}: VoiceChatPanelProps) {
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [textInput, setTextInput] = useState('')
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    sendText,
    error,
  } = useVoiceChat({
    characterId,
    personaPlexUrl,
    onTranscript: (entry) => {
      onTranscript?.(entry.speaker, entry.text)
    },
  })

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // Handle text submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim()) {
      sendText(textInput.trim())
      setTextInput('')
    }
  }

  // Push-to-talk handlers
  const handlePushToTalkStart = () => {
    if (!isListening) {
      startListening()
    }
  }

  const handlePushToTalkEnd = () => {
    if (isListening) {
      stopListening()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-4 bottom-4 md:inset-auto md:right-4 md:bottom-4 md:w-96 bg-noir-charcoal rounded-lg shadow-2xl border border-noir-slate overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-noir-slate bg-noir-black/50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <div>
            <h3 className="font-medium text-noir-cream">{characterName}</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={() => setMode(mode === 'voice' ? 'text' : 'voice')}
            className="p-2 rounded-lg hover:bg-noir-slate transition-colors text-gray-400 hover:text-noir-cream"
            title={mode === 'voice' ? 'Switch to text' : 'Switch to voice'}
          >
            {mode === 'voice' ? '⌨️' : '🎤'}
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-noir-slate transition-colors text-gray-400 hover:text-noir-cream"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-noir-black/30">
        {transcript.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-4xl mb-2">🎭</p>
            <p>
              {mode === 'voice' 
                ? 'Hold the microphone button to speak' 
                : 'Type your questions below'
              }
            </p>
          </div>
        )}
        
        <AnimatePresence>
          {transcript.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${entry.speaker === 'player' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  entry.speaker === 'player'
                    ? 'bg-noir-gold/20 text-noir-cream'
                    : 'bg-noir-slate text-noir-cream'
                }`}
              >
                <p className="text-sm">{entry.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-noir-slate rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-noir-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-noir-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-noir-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={transcriptEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-noir-slate bg-noir-black/50">
        {error && (
          <div className="mb-3 p-2 bg-noir-blood/20 border border-noir-blood rounded text-sm text-red-300">
            {error.message}
          </div>
        )}

        {mode === 'voice' ? (
          /* Voice mode - Push to talk */
          <div className="flex flex-col items-center gap-3">
            <motion.button
              onMouseDown={handlePushToTalkStart}
              onMouseUp={handlePushToTalkEnd}
              onMouseLeave={handlePushToTalkEnd}
              onTouchStart={handlePushToTalkStart}
              onTouchEnd={handlePushToTalkEnd}
              whileTap={{ scale: 0.95 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-noir-gold text-noir-black shadow-lg shadow-noir-gold/30'
                  : 'bg-noir-slate text-noir-cream hover:bg-noir-gold/20'
              }`}
              disabled={!isConnected}
            >
              <span className="text-3xl">{isListening ? '🔴' : '🎤'}</span>
            </motion.button>
            
            <p className="text-xs text-gray-400">
              {isListening ? 'Listening...' : 'Hold to speak'}
            </p>

            {/* Audio visualization when listening */}
            {isListening && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [4, 16, 4],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-noir-gold rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Text mode - Type input */
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-noir-slate border border-noir-slate focus:border-noir-gold rounded-lg px-3 py-2 text-noir-cream placeholder-gray-500 outline-none transition-colors"
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !textInput.trim()}
              className="px-4 py-2 bg-noir-gold text-noir-black rounded-lg font-medium hover:bg-noir-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </form>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Floating voice button that opens the voice chat
 */
export function VoiceChatButton({
  onClick,
  isActive,
}: {
  onClick: () => void
  isActive: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`fixed right-4 bottom-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
        isActive
          ? 'bg-noir-gold text-noir-black'
          : 'bg-noir-slate text-noir-cream hover:bg-noir-gold/20'
      }`}
    >
      <span className="text-2xl">{isActive ? '✕' : '🎤'}</span>
    </motion.button>
  )
}
