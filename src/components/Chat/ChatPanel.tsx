import { useState, useRef, useEffect } from 'react'
import { useSaintsStore } from '../../game/state'

interface SaintResponse {
  saintId: string
  name: string
  response: string
}

interface DirectorResponse {
  mode: 'single' | 'council'
  saints: SaintResponse[]
  scripture?: { reference: string; text: string }
}

interface ChatMessage {
  id: string
  role: 'user' | 'saints'
  text?: string
  director?: DirectorResponse
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function ChatPanel() {
  const selectedSaintId = useSaintsStore((s) => s.selectedSaintId)
  const sessionId = useSaintsStore((s) => s.sessionId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset messages when saint changes
  useEffect(() => {
    setMessages([])
  }, [selectedSaintId])

  if (!selectedSaintId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="text-6xl">✝</div>
        <h2 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
          Choose a saint to begin
        </h2>
        <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
          Select a saint from the sidebar to start a conversation. 
          Ask questions about faith, theology, prayer, or life — they will respond 
          from their own writings and wisdom.
        </p>
      </div>
    )
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          preferredSaint: selectedSaintId,
        }),
      })
      const data: DirectorResponse = await res.json()

      const saintMsg: ChatMessage = {
        id: `saint-${Date.now()}`,
        role: 'saints',
        director: data,
      }
      setMessages((prev) => [...prev, saintMsg])
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'saints',
        director: {
          mode: 'single',
          saints: [{ saintId: 'system', name: 'System', response: 'Something went wrong. Please try again.' }],
        },
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#1e1e1e] px-4 py-3 text-sm text-[var(--text-primary)]">
                    {msg.text}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className="flex flex-col gap-4">
                {msg.director?.saints.map((saint) => (
                  <div key={saint.saintId} className="flex justify-start">
                    <div className="max-w-[85%]">
                      <span className="mb-1 block font-serif text-xs font-semibold tracking-wide text-[var(--accent)]">
                        {saint.name}
                      </span>
                      <div className="rounded-2xl rounded-bl-sm bg-[var(--bg-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)]">
                        {saint.response}
                      </div>
                    </div>
                  </div>
                ))}

                {msg.director?.scripture && (
                  <div className="ml-4 border-l-2 border-[var(--accent)] bg-[var(--accent-dim)] px-4 py-3 rounded-r-lg">
                    <p className="font-serif text-sm italic text-[var(--text-primary)]">
                      "{msg.director.scripture.text}"
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                      — {msg.director.scripture.reference}
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3">
                <span className="animate-pulse text-sm text-[var(--text-secondary)]">...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#222] bg-[var(--bg-primary)] p-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 rounded-xl border border-[#333] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
