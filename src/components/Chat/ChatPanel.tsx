import { useEffect, useRef, useState } from 'react'
import { buildApiUrl } from '../../api/client'
import { useSaintsStore } from '../../game/state'
import { useVoice } from '../../hooks/useVoice'
import { type SaintInteractionMode } from '../../types/saintChat'

interface SaintResponse {
  saintId: string
  name: string
  response: string
}

interface DirectorResponse {
  mode: 'single' | 'council'
  interactionMode: SaintInteractionMode
  saints: SaintResponse[]
  scripture?: { reference: string; text: string }
}

interface ChatMessage {
  id: string
  role: 'user' | 'saints'
  text?: string
  director?: DirectorResponse
}

interface ApiErrorResponse {
  error?: string
}

const ASK_REQUEST_TIMEOUT_MS = 45_000

const SAINT_DISPLAY_NAMES: Record<string, string> = {
  aquinas: 'St. Thomas Aquinas',
  augustine: 'St. Augustine',
  therese: 'St. Therese of Lisieux',
  ignatius: 'St. Ignatius of Loyola',
  'francis-de-sales': 'St. Francis de Sales',
}

const COUNSEL_PROMPTS: Record<string, string[]> = {
  aquinas: [
    'How should I think about faith and reason together?',
    'What does the beatific vision have to do with ordinary life?',
    'How can I grow in virtue without becoming rigid?',
  ],
  augustine: [
    'Why does the heart stay restless even after success?',
    'How do I deal with disordered desires?',
    'What does grace look like in daily conversion?',
  ],
  therese: [
    'What does the little way look like in a hard season?',
    'How can small acts of love matter so much?',
    'How do I pray when I feel dry or ordinary?',
  ],
  ignatius: [
    'How do I discern between consolation and desolation?',
    'How can I examine my day without scrupulosity?',
    'How should I make a difficult decision before God?',
  ],
  'francis-de-sales': [
    'How do I pursue holiness in an ordinary busy life?',
    'What does gentleness with myself actually mean?',
    'How can I pray faithfully when my schedule is crowded?',
  ],
}

const STUDY_PROMPTS: Record<string, string[]> = {
  aquinas: [
    'How would Aquinas respond to Nietzsche?',
    'How would a medieval theologian study justice?',
    'What should I read first if I want Aquinas on virtue?',
    'How would Aquinas understand happiness?',
  ],
  augustine: [
    'How would Augustine understand restlessness and desire?',
    'Where should I start in Augustine if I want to study conversion?',
    'How would Augustine frame memory and self-knowledge?',
    'What first-hand text should I read on desire?',
  ],
}

function getSaintDisplayName(saintId: string): string {
  return SAINT_DISPLAY_NAMES[saintId] ?? saintId
}

function getPromptSuggestions(
  saintId: string,
  interactionMode: SaintInteractionMode
): string[] {
  if (interactionMode === 'study') {
    return STUDY_PROMPTS[saintId] ?? [
      'How would this saint frame the question in his or her own period?',
      'What first-hand text should I read first on this theme?',
      'How would this saint reason through the question step by step?',
      'What authorities or sources would this saint turn to first?',
    ]
  }

  return COUNSEL_PROMPTS[saintId] ?? [
    'How can I pray with more honesty?',
    'How do I grow in virtue in ordinary life?',
    'What should I do when I feel spiritually stuck?',
  ]
}

function getModeLabel(interactionMode: SaintInteractionMode): string {
  return interactionMode === 'study' ? 'Study' : 'Counsel'
}

function getModeDescription(
  saintId: string,
  saintName: string,
  interactionMode: SaintInteractionMode
): string {
  if (interactionMode === 'study') {
    if (saintId === 'aquinas') {
      return `${saintName} will answer with more method, historical grounding, and first-hand reading guidance.`
    }

    return `Study mode adds a more historical and educational frame. In this first slice, it is strongest with Aquinas.`
  }

  return `${saintName} will answer conversationally, with warmth, presence, and practical counsel.`
}

function getAskTimeoutMessage(saintName: string): string {
  return `${saintName} took too long to reply. Please try again.`
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as ApiErrorResponse
      if (payload.error?.trim()) {
        return payload.error.trim()
      }
    } catch {
      return 'Something went wrong. Please try again.'
    }
  }

  try {
    const text = (await response.text()).trim()
    return text || 'Something went wrong. Please try again.'
  } catch {
    return 'Something went wrong. Please try again.'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeSaintResponse(payload: unknown): SaintResponse | null {
  if (!isRecord(payload)) {
    return null
  }

  const response = typeof payload.response === 'string' ? payload.response.trim() : ''
  if (!response) {
    return null
  }

  const saintId =
    typeof payload.saintId === 'string' && payload.saintId.trim()
      ? payload.saintId.trim()
      : 'system'
  const fallbackName = saintId === 'system' ? 'System' : getSaintDisplayName(saintId)
  const name =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : fallbackName

  return {
    saintId,
    name,
    response,
  }
}

function normalizeDirectorResponse(
  payload: unknown,
  selectedSaintId: string,
  fallbackInteractionMode: SaintInteractionMode
): DirectorResponse {
  if (!isRecord(payload)) {
    throw new Error('The saints response was empty or malformed.')
  }

  const saints = Array.isArray(payload.saints)
    ? payload.saints
        .map((saint) => normalizeSaintResponse(saint))
        .filter((saint): saint is SaintResponse => saint !== null)
    : []

  if (saints.length > 0) {
    const scripture = isRecord(payload.scripture)
      && typeof payload.scripture.reference === 'string'
      && payload.scripture.reference.trim()
      && typeof payload.scripture.text === 'string'
      && payload.scripture.text.trim()
      ? {
          reference: payload.scripture.reference.trim(),
          text: payload.scripture.text.trim(),
        }
      : undefined

    return {
      mode: payload.mode === 'council' && saints.length > 1 ? 'council' : 'single',
      interactionMode:
        payload.interactionMode === 'study' || payload.interactionMode === 'counsel'
          ? payload.interactionMode
          : fallbackInteractionMode,
      saints,
      ...(scripture ? { scripture } : {}),
    }
  }

  const legacyResponse = typeof payload.response === 'string' ? payload.response.trim() : ''
  if (legacyResponse) {
    return {
      mode: 'single',
      interactionMode: fallbackInteractionMode,
      saints: [
        {
          saintId: selectedSaintId,
          name: getSaintDisplayName(selectedSaintId),
          response: legacyResponse,
        },
      ],
    }
  }

  throw new Error('The saints response was empty or malformed.')
}

function renderInlineResponseText(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    const isStrong = part.startsWith('**') && part.endsWith('**') && part.length > 4

    if (isStrong) {
      return (
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      )
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>
  })
}

function SaintResponseBody({ response }: { response: string }) {
  const blocks = response
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        const headingMatch = lines[0]?.match(/^(#{1,6})\s+(.+)$/)
        const allBullets = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))
        const allOrdered =
          lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))

        if (headingMatch) {
          const [, hashes, headingText] = headingMatch
          const remainder = lines.slice(1).join(' ')
          const headingClassName =
            hashes.length <= 2
              ? 'font-serif text-lg font-semibold text-[var(--text-primary)]'
              : 'text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]'

          return (
            <div key={`block-${blockIndex}`} className="space-y-2">
              <p className={headingClassName}>
                {renderInlineResponseText(headingText, `heading-${blockIndex}`)}
              </p>
              {remainder && (
                <p className="leading-relaxed text-[var(--text-primary)]">
                  {renderInlineResponseText(remainder, `heading-body-${blockIndex}`)}
                </p>
              )}
            </div>
          )
        }

        if (allBullets || allOrdered) {
          const ListTag = allOrdered ? 'ol' : 'ul'
          const normalizedLines = lines.map((line) =>
            line.replace(allOrdered ? /^\d+\.\s+/ : /^[-*]\s+/, '')
          )

          return (
            <ListTag
              key={`block-${blockIndex}`}
              className={`space-y-2 pl-5 leading-relaxed text-[var(--text-primary)] ${
                allOrdered ? 'list-decimal' : 'list-disc'
              }`}
            >
              {normalizedLines.map((line, lineIndex) => (
                <li key={`block-${blockIndex}-item-${lineIndex}`}>
                  {renderInlineResponseText(line, `list-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ListTag>
          )
        }

        return (
          <p key={`block-${blockIndex}`} className="leading-relaxed text-[var(--text-primary)]">
            {renderInlineResponseText(lines.join(' '), `paragraph-${blockIndex}`)}
          </p>
        )
      })}
    </div>
  )
}

export function ChatPanel() {
  const selectedSaintId = useSaintsStore((state) => state.selectedSaintId)
  const sessionId = useSaintsStore((state) => state.sessionId)
  const interactionMode = useSaintsStore((state) => state.interactionMode)
  const setInteractionMode = useSaintsStore((state) => state.setInteractionMode)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const voice = useVoice()
  const { stop: stopVoice, clearError: clearVoiceError } = voice

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, messages])

  useEffect(() => {
    setMessages([])
    setInput('')
    setChatError(null)
    stopVoice()
    clearVoiceError()
  }, [clearVoiceError, selectedSaintId, stopVoice])

  if (!selectedSaintId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="text-6xl text-[var(--accent)]">✝</div>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-[var(--text-primary)]">
            Choose a saint to begin
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Pick a saint from the roster to start a conversation about prayer,
            theology, suffering, vocation, or the practical work of holiness.
          </p>
        </div>
      </div>
    )
  }

  const selectedSaintName = getSaintDisplayName(selectedSaintId)
  const modeDescription = getModeDescription(
    selectedSaintId,
    selectedSaintName,
    interactionMode
  )
  const isStudyMode = interactionMode === 'study'
  const studyModeIsStrong = selectedSaintId === 'aquinas'

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])
    setInput('')
    setLoading(true)
    setChatError(null)

    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, ASK_REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(buildApiUrl('/api/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          preferredSaint: selectedSaintId,
          mode: interactionMode,
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response))
      }

      const payload = (await response.json()) as unknown
      const data = normalizeDirectorResponse(payload, selectedSaintId, interactionMode)
      const saintMessage: ChatMessage = {
        id: `saint-${Date.now()}`,
        role: 'saints',
        director: data,
      }

      setMessages((currentMessages) => [...currentMessages, saintMessage])
    } catch (error) {
      const message =
        timedOut
          ? getAskTimeoutMessage(selectedSaintName)
          : error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'

      setChatError(message)
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `error-${Date.now()}`,
          role: 'saints',
          director: {
            mode: 'single',
            interactionMode,
            saints: [
              {
                saintId: 'system',
                name: 'System',
                response: message,
              },
            ],
          },
        },
      ])
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
  }

  const handleModeChange = (nextMode: SaintInteractionMode) => {
    if (nextMode === interactionMode) {
      return
    }

    setInteractionMode(nextMode)
    setChatError(null)
  }

  const handleSpeak = async (saint: SaintResponse, utteranceId: string) => {
    if (voice.activeUtteranceId === utteranceId && (voice.isLoading || voice.isPlaying)) {
      voice.stop()
      return
    }

    await voice.speak(saint.saintId, saint.response, utteranceId)
  }

  const promptSuggestions = getPromptSuggestions(selectedSaintId, interactionMode)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[#1a1a1a] bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Current companion
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
              {selectedSaintName}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {modeDescription}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Conversation mode
              </span>
              <div className="inline-flex rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(10,10,10,0.72)] p-1">
                {(['counsel', 'study'] as SaintInteractionMode[]).map((mode) => {
                  const isActive = mode === interactionMode

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeChange(mode)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                        isActive
                          ? 'bg-[var(--accent)] text-black'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {getModeLabel(mode)}
                    </button>
                  )
                })}
              </div>
              {isStudyMode && !studyModeIsStrong && (
                <p className="max-w-xs text-right text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  Study mode is strongest with Aquinas in this first slice.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  voice.isConfigured
                    ? 'border-[rgba(212,175,55,0.35)] bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'border-[#2a2a2a] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {voice.isChecking
                  ? 'Checking voice'
                  : voice.isConfigured
                    ? 'ElevenLabs ready'
                    : 'Voice unavailable'}
              </span>
              <button
                type="button"
                onClick={voice.toggleVoice}
                disabled={!voice.isConfigured || voice.isChecking}
                className="rounded-full border border-[#383838] bg-[var(--bg-secondary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Voice {voice.voiceEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {chatError && (
        <div className="border-b border-[#2e1f1f] bg-[#1c1414] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-start justify-between gap-3 text-sm text-[#d8c2c2]">
            <p>{chatError}</p>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && (
            <div className="rounded-[28px] border border-[rgba(212,175,55,0.18)] bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(14,14,14,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                {isStudyMode ? 'Begin the study' : 'Begin the conversation'}
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
                {isStudyMode
                  ? `Study with ${selectedSaintName}.`
                  : `Ask ${selectedSaintName} something real.`}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {isStudyMode
                  ? 'Study mode leans into historical framing, method, and first-hand reading without losing the saint’s presence.'
                  : 'This is a text-first conversation. If ElevenLabs is configured, each saint reply can also be played aloud without changing the chat flow.'}
              </p>
              {isStudyMode && !studyModeIsStrong && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">
                  Aquinas currently has the strongest study-specific backend implementation. Other saints
                  still answer with a lighter study frame.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {promptSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="rounded-full border border-[#2d2d2d] bg-[var(--bg-secondary)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[90%] rounded-3xl rounded-br-md bg-[#1e1e1e] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.2)] sm:max-w-[80%]">
                    {message.text}
                  </div>
                </div>
              )
            }

            const saintReplies = Array.isArray(message.director?.saints)
              ? message.director.saints
              : []

            return (
              <div key={message.id} className="flex flex-col gap-4">
                {saintReplies.map((saint) => {
                  const utteranceId = `${message.id}:${saint.saintId}`
                  const isVoiceActive = voice.activeUtteranceId === utteranceId

                  return (
                    <div key={`${message.id}-${saint.saintId}`} className="flex justify-start">
                      <div className="max-w-[95%] sm:max-w-[88%]">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-serif text-xs font-semibold tracking-wide text-[var(--accent)]">
                            {saint.name}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              message.director?.interactionMode === 'study'
                                ? 'border-[rgba(212,175,55,0.3)] bg-[var(--accent-dim)] text-[var(--accent)]'
                                : 'border-[#2d2d2d] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {getModeLabel(
                              message.director?.interactionMode ?? interactionMode
                            )}
                          </span>
                          {voice.isConfigured && saint.saintId !== 'system' && (
                            <button
                              type="button"
                              onClick={() => void handleSpeak(saint, utteranceId)}
                              disabled={voice.isChecking || (!voice.voiceEnabled && !isVoiceActive)}
                              className="rounded-full border border-[#303030] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isVoiceActive
                                ? voice.isLoading
                                  ? 'Preparing...'
                                  : voice.isPlaying
                                    ? 'Stop'
                                    : 'Listen'
                                : voice.voiceEnabled
                                  ? 'Listen'
                                  : 'Voice off'}
                            </button>
                          )}
                        </div>
                        <div className="rounded-3xl rounded-bl-md bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                          <SaintResponseBody response={saint.response} />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {message.director?.scripture && (
                  <div className="ml-2 rounded-r-xl border-l-2 border-[var(--accent)] bg-[var(--accent-dim)] px-4 py-3">
                    <p className="font-serif text-sm italic text-[var(--text-primary)]">
                      "{message.director.scripture.text}"
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                      {message.director.scripture.reference}
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                {selectedSaintName} is composing a {interactionMode} reply...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[#222] bg-[var(--bg-primary)] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStudyMode
                ? `Study a question with ${selectedSaintName}...`
                : `Ask ${selectedSaintName} a question...`
            }
            disabled={loading}
            className="min-w-0 flex-1 rounded-2xl border border-[#333] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-70"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-30"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
