/**
 * HybridVoicePanel - Voice interrogation with full Agent SDK intelligence
 * 
 * Features:
 * - Push-to-talk voice input
 * - Real-time transcript
 * - Emotion indicators (from Claude's response)
 * - Tool usage display (memory, recall, etc.)
 * - Character voice output
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHybridVoice, emotionEmojis, emotionColors } from '../../hooks/useHybridVoice'

interface HybridVoicePanelProps {
  characterId: string
  characterName: string
  onClose: () => void
  onNewStatement?: (text: string, isPlayer: boolean) => void
}

// Tool icons for display
const toolIcons: Record<string, { icon: string; label: string }> = {
  recall: { icon: '🧠', label: 'Recalled memory' },
  check_notes: { icon: '📝', label: 'Checked notes' },
  remember: { icon: '💭', label: 'Remembered' },
  consider_alibi: { icon: '🕐', label: 'Considered alibi' },
  assess_threat: { icon: '⚠️', label: 'Assessed threat' },
}

export function HybridVoicePanel({
  characterId,
  characterName,
  onClose,
  onNewStatement,
}: HybridVoicePanelProps) {
  const [showTools, setShowTools] = useState(true)
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [textInput, setTextInput] = useState('')
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const {
    isConnected,
    isSessionActive,
    isListening,
    isSpeaking,
    currentEmotion,
    transcript,
    toolsUsed,
    startSession,
    endSession,
    startListening,
    stopListening,
    sendText,
    error,
  } = useHybridVoice({
    onTranscript: (entry) => {
      onNewStatement?.(entry.text, entry.speaker === 'player')
    },
  })

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // Start session when component mounts
  useEffect(() => {
    if (characterId) {
      startSession(characterId)
    }
    return () => {
      endSession()
    }
  }, [characterId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!isListening && isSessionActive) {
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed inset-x-4 bottom-4 md:inset-auto md:right-4 md:bottom-4 md:w-[420px] bg-noir-charcoal rounded-xl shadow-2xl border border-noir-slate overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-noir-slate bg-gradient-to-r from-noir-black to-noir-charcoal">
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className={`w-2.5 h-2.5 rounded-full ${
            isConnected && isSessionActive 
              ? 'bg-green-500 animate-pulse' 
              : isConnected 
              ? 'bg-yellow-500' 
              : 'bg-red-500'
          }`} />
          
          <div>
            <h3 className="font-semibold text-noir-cream flex items-center gap-2">
              {characterName}
              {/* Emotion indicator */}
              <span className={`text-lg ${emotionColors[currentEmotion]}`}>
                {emotionEmojis[currentEmotion]}
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              {!isConnected ? 'Connecting...' : 
               !isSessionActive ? 'Starting session...' :
               isSpeaking ? 'Speaking...' :
               isListening ? 'Listening...' :
               'Ready'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tool visibility toggle */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={`p-2 rounded-lg transition-colors ${
              showTools 
                ? 'bg-noir-gold/20 text-noir-gold' 
                : 'hover:bg-noir-slate text-gray-400 hover:text-noir-cream'
            }`}
            title={showTools ? 'Hide agent tools' : 'Show agent tools'}
          >
            🧠
          </button>
          
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

      {/* Tools Used Banner */}
      <AnimatePresence>
        {showTools && toolsUsed.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-noir-slate bg-noir-black/50 overflow-hidden"
          >
            <div className="p-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Agent used:</span>
              {toolsUsed.map((tool, i) => {
                const toolInfo = toolIcons[tool] || { icon: '🔧', label: tool }
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-noir-slate rounded text-xs text-noir-cream"
                    title={toolInfo.label}
                  >
                    {toolInfo.icon} {toolInfo.label}
                  </span>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript */}
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-noir-black/20">
        {transcript.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-3">🎭</div>
            <p className="font-medium">Interrogation Ready</p>
            <p className="text-sm mt-1">
              {mode === 'voice' 
                ? 'Hold the microphone to speak' 
                : 'Type your questions below'
              }
            </p>
            <p className="text-xs mt-3 text-gray-600">
              Claude Agent will remember everything.
            </p>
          </div>
        )}
        
        <AnimatePresence>
          {transcript.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10, x: entry.speaker === 'player' ? 20 : -20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              className={`flex ${entry.speaker === 'player' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                  entry.speaker === 'player'
                    ? 'bg-noir-gold/20 text-noir-cream border border-noir-gold/30'
                    : 'bg-noir-slate text-noir-cream'
                }`}
              >
                {/* Speaker label */}
                <p className={`text-[10px] uppercase tracking-wide mb-1 ${
                  entry.speaker === 'player' ? 'text-noir-gold' : 'text-gray-500'
                }`}>
                  {entry.speaker === 'player' ? 'You' : characterName}
                </p>
                <p className="text-sm leading-relaxed">{entry.text}</p>
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
            <div className="bg-noir-slate rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{characterName} is speaking</span>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                      className="w-2 h-2 bg-noir-gold rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={transcriptEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-noir-slate bg-noir-black/50">
        {error && (
          <div className="mb-3 p-3 bg-noir-blood/20 border border-noir-blood/50 rounded-lg text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            {error.message}
          </div>
        )}

        {mode === 'voice' ? (
          /* Voice mode - Push to talk */
          <div className="flex flex-col items-center gap-4">
            {/* Waveform visualization */}
            {isListening && (
              <div className="flex items-center justify-center gap-1 h-8">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [8, Math.random() * 24 + 8, 8],
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                    className="w-1 bg-noir-gold rounded-full"
                  />
                ))}
              </div>
            )}

            <motion.button
              onMouseDown={handlePushToTalkStart}
              onMouseUp={handlePushToTalkEnd}
              onMouseLeave={handlePushToTalkEnd}
              onTouchStart={handlePushToTalkStart}
              onTouchEnd={handlePushToTalkEnd}
              whileTap={{ scale: 0.95 }}
              disabled={!isSessionActive}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-noir-gold text-noir-black shadow-lg shadow-noir-gold/40 ring-4 ring-noir-gold/30'
                  : 'bg-noir-slate text-noir-cream hover:bg-noir-gold/20 hover:ring-2 hover:ring-noir-gold/20'
              }`}
            >
              <span className="text-3xl">{isListening ? '🔴' : '🎤'}</span>
            </motion.button>
            
            <p className="text-xs text-gray-400">
              {isListening ? 'Release to send' : 'Hold to speak'}
            </p>
          </div>
        ) : (
          /* Text mode */
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-noir-slate border border-noir-slate focus:border-noir-gold rounded-lg px-4 py-2.5 text-noir-cream placeholder-gray-500 outline-none transition-colors"
              disabled={!isSessionActive}
            />
            <button
              type="submit"
              disabled={!isSessionActive || !textInput.trim()}
              className="px-5 py-2.5 bg-noir-gold text-noir-black rounded-lg font-medium hover:bg-noir-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </form>
        )}

        {/* Agent SDK badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-wider">
          <span>Powered by</span>
          <span className="text-noir-gold">Anthropic Agent SDK</span>
          <span>+</span>
          <span className="text-green-500">PersonaPlex</span>
        </div>
      </div>
    </motion.div>
  )
}
