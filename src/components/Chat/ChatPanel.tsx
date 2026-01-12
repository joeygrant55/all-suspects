import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../../game/state'
import { sendMessage, healthCheck } from '../../api/client'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentConversation = useGameStore((state) => state.currentConversation)
  const characters = useGameStore((state) => state.characters)
  const messages = useGameStore((state) => state.messages)
  const addMessage = useGameStore((state) => state.addMessage)
  const endConversation = useGameStore((state) => state.endConversation)

  const currentCharacter = characters.find((c) => c.id === currentConversation)

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

    // Add player message
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
        </div>
        <button
          onClick={endConversation}
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

      {/* Messages - now has much more space */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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

      {/* Input - more compact */}
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
