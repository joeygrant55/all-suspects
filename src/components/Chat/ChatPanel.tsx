import { useContext, useEffect, useMemo, useState } from 'react'
import { sendMessage, healthCheck } from '../../api/client'
import { useGameStore } from '../../game/state'
import { VoiceContext } from '../../hooks/useVoice'
import { ConversationThread } from './ConversationThread'

const CHARACTER_GREETINGS: Record<string, string> = {
  victoria: 'The house has been chaos since midnight. Ask what you need, detective.',
  thomas: 'If you are here to blame me, at least have the decency to ask directly.',
  eleanor: 'I kept the household records. If there is a pattern, I probably saw it first.',
  marcus: 'I deal in facts, not gossip. Keep your questions precise.',
  lillian: 'Secrets travel faster than champagne in this house. Choose your topic carefully.',
  james: 'I have served this family long enough to know what should not be spoken aloud.',
}

const BASE_QUESTIONS: Record<string, string[]> = {
  victoria: [
    'Where were you when the disturbance began?',
    'Who in this house had the most to gain tonight?',
    'What changed in the family this week?',
  ],
  thomas: [
    'Who can confirm your movements tonight?',
    'What was your last argument with the family about?',
    'Why should I trust your version first?',
  ],
  eleanor: [
    'Which documents mattered most tonight?',
    'Who requested a private meeting before midnight?',
    'What detail are the others overlooking?',
  ],
  marcus: [
    'What condition was the victim in earlier this evening?',
    'Did anyone ask you for medical help or advice tonight?',
    'What timeline do your notes support?',
  ],
  lillian: [
    'Which conversation in the house felt staged to you?',
    'Who looked most anxious after midnight?',
    'What did you hear that others might deny?',
  ],
  james: [
    'What did the staff notice before the guests did?',
    'Who moved through the house when they should not have?',
    'What have you chosen not to report yet?',
  ],
}

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const [hasShownGreeting, setHasShownGreeting] = useState<Set<string>>(new Set())

  const saints = useGameStore((state) => state.saints)
  const currentSaintId = useGameStore((state) => state.currentSaintId)
  const messages = useGameStore((state) => state.messages)
  const addMessage = useGameStore((state) => state.addMessage)
  const clearCurrentSaint = useGameStore((state) => state.clearCurrentSaint)
  const updateSaintPressure = useGameStore((state) => state.updateSaintPressure)

  const voiceManager = useContext(VoiceContext)
  const currentSaint = saints.find((saint) => saint.id === currentSaintId) ?? null
  const conversationMessages = messages.filter(
    (message) => message.characterId === currentSaintId
  )

  const suggestedQuestions = useMemo(() => {
    if (!currentSaintId) {
      return []
    }

    return BASE_QUESTIONS[currentSaintId] ?? [
      'Where were you when everything changed?',
      'Who do you think is lying to me?',
      'What have you left out so far?',
    ]
  }, [currentSaintId])

  useEffect(() => {
    healthCheck().then(setApiConnected)
  }, [])

  useEffect(() => {
    if (!currentSaintId || hasShownGreeting.has(currentSaintId)) {
      return
    }

    const greeting = CHARACTER_GREETINGS[currentSaintId]
    if (!greeting) {
      return
    }

    addMessage({
      role: 'character',
      characterId: currentSaintId,
      content: greeting,
    })
    setHasShownGreeting((previous) => new Set([...previous, currentSaintId]))
  }, [addMessage, currentSaintId, hasShownGreeting])

  const sendQuestion = async (question: string, addPlayerMessage = true) => {
    if (!currentSaintId || isLoading) {
      return
    }

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      return
    }

    setShowRetry(false)
    setLastQuestion(trimmedQuestion)

    if (addPlayerMessage) {
      setInput('')
      addMessage({
        role: 'player',
        characterId: currentSaintId,
        content: trimmedQuestion,
      })
    }

    setIsLoading(true)

    try {
      const response = await sendMessage(currentSaintId, trimmedQuestion)

      addMessage({
        role: 'character',
        characterId: currentSaintId,
        content: response.message,
      })

      if (response.pressure) {
        updateSaintPressure(currentSaintId, response.pressure)
      }

      if (voiceManager?.voiceEnabled && response.message) {
        await voiceManager.speak(currentSaintId, response.message)
      }

      setApiConnected(true)
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({
        role: 'character',
        characterId: currentSaintId,
        content: "They're not answering right now. Try the question again in a moment.",
      })
      setApiConnected(false)
      setShowRetry(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!input.trim() || !currentSaintId || isLoading) {
      return
    }

    await sendQuestion(input)
  }

  const handleRetry = () => {
    if (!lastQuestion) {
      return
    }

    void sendQuestion(lastQuestion, false)
  }

  const handleEndConversation = () => {
    voiceManager?.stop()
    clearCurrentSaint()
  }

  if (!currentSaint) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-noir-black/40 p-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-noir-slate bg-noir-charcoal">
          <span className="text-4xl text-noir-gold/50">?</span>
        </div>
        <h2
          className="text-2xl text-noir-cream"
          style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}
        >
          Select a suspect
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-noir-ash">
          Use the roster to open an interview thread. Previous exchanges stay attached to each suspect.
        </p>
        {apiConnected === false && (
          <div className="mt-6 rounded border border-noir-blood/40 bg-noir-blood/15 px-4 py-3 text-sm text-noir-blood">
            API unavailable. Start the server with `npm run server`.
          </div>
        )}
      </section>
    )
  }

  const pressureLevel = currentSaint.pressure?.level ?? 0

  return (
    <section className="flex h-full flex-col bg-noir-charcoal">
      <div className="border-b border-noir-slate/60 bg-gradient-to-r from-noir-black/70 to-transparent px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-noir-gold">Interview Active</p>
            <h2
              className="mt-1 text-2xl text-noir-cream"
              style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}
            >
              {currentSaint.name}
            </h2>
            <p className="text-sm text-noir-smoke">{currentSaint.role}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="min-w-28 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-noir-smoke">Pressure</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-noir-slate/60">
                <div
                  className={`h-full transition-all ${
                    pressureLevel >= 75
                      ? 'bg-noir-blood'
                      : pressureLevel >= 45
                        ? 'bg-amber-500'
                        : 'bg-noir-gold/70'
                  }`}
                  style={{ width: `${pressureLevel}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleEndConversation}
              className="rounded border border-noir-slate px-3 py-2 text-xs tracking-[0.18em] text-noir-smoke transition-colors hover:border-noir-gold hover:text-noir-gold"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

      {apiConnected === false && (
        <div className="border-b border-noir-blood/30 bg-noir-blood/15 px-5 py-3 text-sm text-noir-blood">
          API unavailable. Responses will fail until `npm run server` is running.
        </div>
      )}

      <ConversationThread
        messages={conversationMessages}
        characterName={currentSaint.name}
        isLoading={isLoading}
      />

      {showRetry && (
        <div className="border-t border-noir-slate/40 bg-noir-black/30 px-5 py-3">
          <p className="text-sm text-noir-blood">The last request failed. Retry the same question when ready.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 rounded border border-noir-gold/40 px-4 py-2 text-xs tracking-[0.18em] text-noir-gold transition-colors hover:bg-noir-gold/10"
          >
            Retry Question
          </button>
        </div>
      )}

      {suggestedQuestions.length > 0 && !isLoading && (
        <div className="border-t border-noir-slate/40 bg-noir-black/20 px-5 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-noir-smoke">Suggested Angles</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setInput(question)}
                className="rounded border border-noir-slate/60 bg-noir-slate/20 px-3 py-2 text-xs text-noir-cream transition-colors hover:border-noir-gold/50 hover:bg-noir-gold/10"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-noir-slate/60 bg-noir-black/30 p-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Question ${currentSaint.name.split(' ')[0]}...`}
            disabled={isLoading}
            className="flex-1 rounded border border-noir-slate/60 bg-noir-black/60 px-4 py-3 text-sm text-noir-cream placeholder:text-noir-smoke/60 focus:border-noir-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded bg-noir-gold px-6 py-3 text-sm tracking-[0.16em] text-noir-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            ASK
          </button>
        </div>
      </form>
    </section>
  )
}
