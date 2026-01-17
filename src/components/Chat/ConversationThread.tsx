import { useEffect, useRef } from 'react'
import type { Message } from '../../game/state'

interface ConversationThreadProps {
  messages: Message[]
  characterName: string
  isLoading: boolean
}

export function ConversationThread({ messages, characterName, isLoading }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div
      className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
      onWheel={(e) => e.stopPropagation()}
      style={{
        // Subtle inner shadow at top/bottom for depth
        boxShadow: 'inset 0 10px 20px -10px rgba(0, 0, 0, 0.3), inset 0 -10px 20px -10px rgba(0, 0, 0, 0.3)',
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="px-5 py-4 bg-noir-slate/20 border border-noir-slate/30 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-3">
                <LoadingDots />
                <span className="text-sm italic text-noir-ash">
                  {characterName} is thinking...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isPlayer = message.role === 'player'

  // Parse content for stage directions (text in *asterisks*)
  const renderContent = (content: string) => {
    const parts = content.split(/(\*[^*]+\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        // Stage direction - italic and muted
        return (
          <span key={index} className="italic text-noir-ash block my-2">
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  if (isPlayer) {
    // Player message - right aligned with gold tint
    return (
      <div className="flex justify-end animate-fadeIn">
        <div className="max-w-[75%]">
          <div
            className="px-5 py-3 bg-noir-gold/15 border border-noir-gold/30 rounded-2xl rounded-br-sm"
            style={{
              boxShadow: '0 2px 10px rgba(201, 162, 39, 0.1)',
            }}
          >
            <p className="text-sm text-noir-cream leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  // Character message - left aligned, dialogue style
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="max-w-[85%]">
        <div
          className="px-5 py-4 bg-noir-slate/20 border border-noir-slate/30 rounded-2xl rounded-bl-sm"
          style={{
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <p className="text-sm text-noir-cream whitespace-pre-wrap leading-relaxed">
            {renderContent(message.content)}
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 bg-noir-gold/60 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}
