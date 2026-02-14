import { useRef, useEffect } from 'react'

interface QuestionInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  suggestedQuestions: string[]
  showSuggestions: boolean
}

export function QuestionInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  suggestedQuestions,
  showSuggestions,
}: QuestionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  return (
    <div className="border-t border-noir-slate/30 bg-noir-black/40">
      {/* Suggested questions */}
      {showSuggestions && suggestedQuestions.length > 0 && !isLoading && (
        <div className="px-4 sm:px-6 py-4 border-b border-noir-slate/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-noir-smoke uppercase tracking-widest">
              Ask about...
            </span>
            <div className="flex-1 h-px bg-noir-slate/30" />
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="group px-4 py-2 text-xs bg-noir-slate/20 hover:bg-noir-gold/15 text-noir-cream/70 hover:text-noir-cream rounded-full border border-noir-slate/40 hover:border-noir-gold/40 transition-all duration-200"
              >
                <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                  {question}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={onSubmit} className="p-3 sm:p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
              className="w-full bg-noir-black/60 text-noir-cream placeholder-noir-smoke/40 px-4 sm:px-5 py-3 sm:py-4 text-sm rounded-xl border border-noir-slate/40 focus:outline-none focus:border-noir-gold/50 focus:ring-1 focus:ring-noir-gold/20 transition-all disabled:opacity-50"
              style={{
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />

            {/* Subtle glow when focused */}
            <div className="absolute inset-0 rounded-xl opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none">
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  boxShadow: '0 0 20px rgba(201, 162, 39, 0.1)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 sm:px-8 py-3 sm:py-4 bg-noir-gold text-noir-black rounded-xl font-semibold text-sm uppercase tracking-wider hover:bg-noir-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            style={{
              boxShadow: isLoading === false && input.trim()
                ? '0 0 20px rgba(201, 162, 39, 0.3), 0 4px 10px rgba(0, 0, 0, 0.3)'
                : '0 4px 10px rgba(0, 0, 0, 0.3)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Asking...
              </span>
            ) : (
              'Ask'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
