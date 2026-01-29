import { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { useGameStore } from '../../game/state'
import { sendChatVideo, healthCheck, generateVoice, type ChatVideoResponse } from '../../api/client'
import { VoiceContext } from '../../hooks/useVoice'
import { EVIDENCE_DIALOGUE_UNLOCKS } from '../../data/evidence'
import { CHARACTER_GREETINGS } from '../../../mysteries/ashford-affair/characters'

import { CinematicEffects, GoldBorder, ModalBackdrop } from './CinematicEffects'
import { QuestionCards } from './QuestionCards'
import { VideoInterrogationView } from '../VideoPlayer/VideoInterrogationView'
import { CharacterViewport } from '../VideoPlayer/CharacterViewport'
import { IntroVideo } from '../VideoPlayer/IntroVideo'

// View mode toggle
type ViewMode = 'video' | 'text'

export function InterrogationModal() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState<boolean | null>(null)
  const [newContradiction, setNewContradiction] = useState<string | null>(null)
  const [hasShownGreeting, setHasShownGreeting] = useState<Set<string>>(new Set())
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('video')

  // Intro video state
  const [showIntro, setShowIntro] = useState(false)
  const [introComplete, setIntroComplete] = useState<Set<string>>(new Set())

  // Video-first response state
  const [currentResponse, setCurrentResponse] = useState<{
    text: string
    voiceAudioBase64: string | null
    videoGenerationId: string | null
    videoUrl: string | null
    analysis: ChatVideoResponse['analysis'] | null
  } | null>(null)

  // Game state
  const currentConversation = useGameStore((state) => state.currentConversation)
  const characters = useGameStore((state) => state.characters)
  const messages = useGameStore((state) => state.messages)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const addMessage = useGameStore((state) => state.addMessage)
  const addContradictions = useGameStore((state) => state.addContradictions)
  const updateCharacterPressure = useGameStore((state) => state.updateCharacterPressure)
  const endConversation = useGameStore((state) => state.endConversation)

  const voiceManager = useContext(VoiceContext)
  const currentCharacter = characters.find((c) => c.id === currentConversation)

  // Filter messages for current conversation
  const conversationMessages = useMemo(
    () => messages.filter((m) => m.characterId === currentConversation),
    [messages, currentConversation]
  )

  // Generate suggested questions based on evidence and character
  const suggestedQuestions = useMemo(() => {
    if (!currentConversation) return []

    const suggestions: string[] = []

    const baseQuestions: Record<string, string[]> = {
      victoria: [
        'Where were you when Edmund died?',
        'How was your relationship with Edmund?',
        'Did you hear anything unusual that night?',
        'Who else was in the manor at the time?',
      ],
      thomas: [
        'Where were you at 11:30 PM?',
        'Tell me about your relationship with your father.',
        'Were you aware of changes to the will?',
        'Who did you see in the hallway?',
      ],
      eleanor: [
        'What were you working on tonight?',
        "Did you see anyone near Edmund's office?",
        'What was your relationship with Edmund?',
        'Tell me about the documents you were handling.',
      ],
      marcus: [
        'When did you last see Edmund alive?',
        "What was Edmund's state of health?",
        'Did Edmund seem worried about anything?',
        'Were there any medical emergencies that night?',
      ],
      lillian: [
        'How long have you known the family?',
        'What brought you here tonight?',
        'Did you notice any tensions between family members?',
        'Where were you when you heard the commotion?',
      ],
      james: [
        'Walk me through your duties tonight.',
        'Did you notice anything out of place?',
        'Who entered or left the manor this evening?',
        'Were there any unexpected visitors?',
      ],
    }

    const charQuestions = baseQuestions[currentConversation] || []
    suggestions.push(...charQuestions)

    // Add evidence-based questions
    collectedEvidence.forEach((evidence) => {
      const unlocks = EVIDENCE_DIALOGUE_UNLOCKS[evidence.source]
      if (unlocks) {
        unlocks.forEach((unlock) => {
          if (unlock.characterId === currentConversation && !suggestions.includes(unlock.prompt)) {
            suggestions.push(unlock.prompt)
          }
        })
      }
    })

    return suggestions.slice(0, 4)
  }, [currentConversation, collectedEvidence])

  // Check API connection on mount
  useEffect(() => {
    healthCheck().then(setApiConnected)
  }, [])

  // Trigger intro video when starting a new conversation
  useEffect(() => {
    if (currentConversation && !introComplete.has(currentConversation)) {
      // Show intro video first
      setShowIntro(true)
    }
  }, [currentConversation, introComplete])

  // Show greeting AFTER intro completes - with voice!
  useEffect(() => {
    if (
      currentConversation &&
      introComplete.has(currentConversation) &&
      !hasShownGreeting.has(currentConversation)
    ) {
      const greeting = CHARACTER_GREETINGS[currentConversation]
      if (greeting) {
        addMessage({
          role: 'character',
          characterId: currentConversation,
          content: greeting,
        })
        setHasShownGreeting((prev) => new Set([...prev, currentConversation]))

        // Generate voice for greeting and set as current response
        const fetchGreetingVoice = async () => {
          try {
            const voiceResponse = await generateVoice(currentConversation, greeting)
            setCurrentResponse({
              text: greeting,
              voiceAudioBase64: voiceResponse.audio,
              videoGenerationId: null,
              videoUrl: null,
              analysis: null,
            })
          } catch (err) {
            // Voice failed, just show text
            console.warn('Could not generate greeting voice:', err)
            setCurrentResponse({
              text: greeting,
              voiceAudioBase64: null,
              videoGenerationId: null,
              videoUrl: null,
              analysis: null,
            })
          }
        }

        fetchGreetingVoice()
      }
    }
  }, [currentConversation, introComplete, hasShownGreeting, addMessage])

  // Handle intro video completion/skip
  const handleIntroComplete = useCallback(() => {
    if (currentConversation) {
      setShowIntro(false)
      setIntroComplete((prev) => new Set([...prev, currentConversation]))
    }
  }, [currentConversation])

  const handleClose = useCallback(() => {
    voiceManager?.stop()
    endConversation()
    setCurrentResponse(null)
    setShowCustomInput(false)
  }, [voiceManager, endConversation])

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentConversation) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentConversation, handleClose])

  const handleSelectQuestion = async (question: string) => {
    if (!currentConversation || isLoading) return
    await submitQuestion(question)
  }

  const handleCustomQuestion = () => {
    setShowCustomInput(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentConversation || isLoading) return
    await submitQuestion(input.trim())
    setInput('')
    setShowCustomInput(false)
  }

  const submitQuestion = async (question: string) => {
    if (!currentConversation) return

    // Add player message
    addMessage({
      role: 'player',
      characterId: currentConversation,
      content: question,
    })

    setIsLoading(true)

    // Clear previous response to show loading state
    setCurrentResponse(null)

    try {
      // Use the new combined chat-video endpoint
      const response = await sendChatVideo(currentConversation, question)

      // Add character message to history
      addMessage({
        role: 'character',
        characterId: currentConversation,
        content: response.message,
      })

      // Set current response for video playback
      setCurrentResponse({
        text: response.message,
        voiceAudioBase64: response.voiceAudioBase64 || null,
        videoGenerationId: response.videoGenerationId || null,
        videoUrl: response.videoUrl || null,
        analysis: response.analysis || null,
      })

      // Handle contradictions
      if (response.contradictions && response.contradictions.length > 0) {
        addContradictions(response.contradictions)
        const firstContradiction = response.contradictions[0]
        setNewContradiction(firstContradiction.explanation)
        setTimeout(() => setNewContradiction(null), 6000)
      }

      // Handle pressure update
      if (response.pressure) {
        updateCharacterPressure(currentConversation, response.pressure)
      }
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

  const handleVideoReady = useCallback((url: string) => {
    setCurrentResponse((prev) =>
      prev ? { ...prev, videoUrl: url } : null
    )
  }, [])

  // Map character locations to room background images
  const getRoomBackground = (character: typeof currentCharacter) => {
    if (!character) return null
    const locationMap: Record<string, string> = {
      parlor: '/rooms/parlor.webp',
      study: '/rooms/study.webp',
      garden: '/rooms/garden.webp',
      kitchen: '/rooms/kitchen.webp',
      library: '/rooms/library.webp',
      'dining-room': '/rooms/parlor.webp',
      hallway: '/rooms/servants.webp',
    }
    return locationMap[character.location] || null
  }

  // Don't render if no conversation
  if (!currentConversation || !currentCharacter) {
    return null
  }

  // Show intro video first
  if (showIntro) {
    return (
      <IntroVideo
        characterId={currentConversation}
        characterName={currentCharacter.name}
        characterRole={currentCharacter.role}
        onComplete={handleIntroComplete}
        onSkip={handleIntroComplete}
      />
    )
  }

  // Only show main interrogation UI after intro completes
  if (!introComplete.has(currentConversation)) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <ModalBackdrop onClick={handleClose} />

      {/* Modal container - Video-centric layout */}
      <div
        className="relative w-full max-w-5xl h-[85vh] max-h-[900px] flex flex-col rounded-lg overflow-hidden animate-modalEnter"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.8), 0 0 100px rgba(201, 162, 39, 0.1)',
        }}
      >
        {/* Room background layer */}
        {getRoomBackground(currentCharacter) && (
          <div
            className="absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${getRoomBackground(currentCharacter)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
              filter: 'sepia(0.4) contrast(1.1) brightness(0.6)',
            }}
          />
        )}

        {/* Cinematic effects layer */}
        <CinematicEffects showGrain={true} showVignette={true} />

        {/* Gold decorative borders */}
        <GoldBorder position="top" />
        <GoldBorder position="bottom" />

        {/* ============================================ */}
        {/* HEADER - 10% */}
        {/* ============================================ */}
        <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-noir-slate/30 bg-noir-black/50">
          <div className="flex items-center gap-4">
            {/* Character name */}
            <h2 className="text-xl font-serif text-noir-cream">
              {currentCharacter.name}
            </h2>
            <span className="text-sm text-noir-smoke">{currentCharacter.role}</span>

            {/* Pressure indicator */}
            {currentCharacter.pressure?.level && currentCharacter.pressure?.level > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-noir-slate/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (currentCharacter.pressure?.level ?? 0) * 20)}%`,
                      background: (currentCharacter.pressure?.level ?? 0) >= 4
                        ? 'linear-gradient(90deg, #722f37, #b8860b)'
                        : 'linear-gradient(90deg, #c9a227, #d4af37)',
                    }}
                  />
                </div>
                <span className="text-xs text-noir-smoke">
                  {(currentCharacter.pressure?.level ?? 0) >= 4 ? 'Nervous' : 'Calm'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-noir-slate/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('video')}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  viewMode === 'video'
                    ? 'bg-noir-gold/20 text-noir-gold'
                    : 'text-noir-smoke hover:text-noir-cream'
                }`}
              >
                Video
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  viewMode === 'text'
                    ? 'bg-noir-gold/20 text-noir-gold'
                    : 'text-noir-smoke hover:text-noir-cream'
                }`}
              >
                Text
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-noir-slate/30 text-noir-smoke hover:text-noir-cream hover:bg-noir-slate/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* API status warning */}
        {apiConnected === false && (
          <div className="relative z-20 px-6 py-3 bg-noir-blood/20 border-b border-noir-blood/30 flex items-center gap-3">
            <span className="w-2 h-2 bg-noir-blood rounded-full animate-pulse" />
            <span className="text-sm text-noir-blood">
              Server offline - run `npm run server`
            </span>
          </div>
        )}

        {/* Contradiction alert banner */}
        {newContradiction && (
          <div className="relative z-20 px-6 py-4 bg-noir-blood/20 border-b border-noir-blood/30 animate-slideDown">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-noir-blood/30 flex items-center justify-center">
                <span className="text-noir-blood text-xl">!</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-noir-blood uppercase tracking-widest mb-1">
                  Contradiction Detected
                </p>
                <p className="text-sm text-noir-cream leading-relaxed">{newContradiction}</p>
              </div>
              <button
                onClick={() => setNewContradiction(null)}
                className="text-noir-smoke hover:text-noir-cream transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* VIDEO VIEWPORT - 60% */}
        {/* ============================================ */}
        <div className="relative z-10 flex-1 min-h-0 p-4 flex items-center justify-center">
          {viewMode === 'video' ? (
            <div className="w-full max-w-4xl">
              {isLoading && !currentResponse ? (
                // Loading state before response
                <div className="aspect-video bg-noir-black rounded-lg border border-noir-slate/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-noir-gold/30 border-t-noir-gold rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-noir-cream/60 text-sm font-serif">
                      {currentCharacter.name} is thinking...
                    </p>
                  </div>
                </div>
              ) : currentResponse ? (
                <VideoInterrogationView
                  characterId={currentConversation}
                  characterName={currentCharacter.name}
                  responseText={currentResponse.text}
                  voiceAudioBase64={currentResponse.voiceAudioBase64}
                  videoGenerationId={currentResponse.videoGenerationId}
                  videoUrl={currentResponse.videoUrl}
                  onVideoReady={handleVideoReady}
                  autoPlay={true}
                />
              ) : (
                // Idle state - Cinematic character portrait
                <div className="aspect-video rounded-lg border border-noir-slate/50 overflow-hidden">
                  <CharacterViewport
                    characterId={currentConversation}
                    characterName={currentCharacter.name}
                    characterRole={currentCharacter.role}
                    pressureLevel={currentCharacter.pressure?.level}
                    isWaiting={true}
                  />
                </div>
              )}
            </div>
          ) : (
            // Text mode - show conversation thread
            <div className="w-full h-full overflow-y-auto px-4">
              <div className="max-w-2xl mx-auto space-y-4 py-4">
                {conversationMessages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg ${
                        msg.role === 'player'
                          ? 'bg-noir-gold/15 text-noir-cream border border-noir-gold/30'
                          : 'bg-noir-slate/30 text-noir-cream/90 border border-noir-slate/30'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-noir-slate/30 text-noir-cream/60 px-4 py-3 rounded-lg border border-noir-slate/30">
                      <span className="inline-flex gap-1">
                        <span className="w-2 h-2 bg-noir-cream/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-noir-cream/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-noir-cream/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scene metadata */}
          {viewMode === 'video' && currentResponse?.analysis && (
            <div className="absolute bottom-6 left-6 flex gap-2">
              <span className="px-2 py-1 bg-noir-black/70 text-noir-cream/60 text-xs rounded border border-noir-slate/30">
                {currentResponse.analysis.location}
              </span>
              <span className="px-2 py-1 bg-noir-black/70 text-noir-cream/60 text-xs rounded border border-noir-slate/30">
                {currentResponse.analysis.timeOfDay}
              </span>
              {currentResponse.analysis.mood && (
                <span className="px-2 py-1 bg-noir-black/70 text-noir-cream/60 text-xs rounded border border-noir-slate/30">
                  {currentResponse.analysis.mood}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* QUESTION INPUT - 20% */}
        {/* ============================================ */}
        <div className="relative z-20">
          {showCustomInput ? (
            // Custom question input
            <div className="border-t border-noir-slate/30 bg-noir-black/60 p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  disabled={isLoading}
                  autoFocus
                  className="flex-1 bg-noir-black/60 text-noir-cream placeholder-noir-smoke/40 px-4 py-3 text-sm rounded-lg border border-noir-slate/40 focus:outline-none focus:border-noir-gold/50 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-4 py-3 text-noir-smoke hover:text-noir-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-3 bg-noir-gold text-noir-black rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-noir-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? 'Asking...' : 'Ask'}
                </button>
              </form>
            </div>
          ) : (
            // Question cards
            <QuestionCards
              questions={suggestedQuestions}
              onSelectQuestion={handleSelectQuestion}
              onCustomQuestion={handleCustomQuestion}
              isLoading={isLoading}
              characterName={currentCharacter.name}
            />
          )}
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-modalEnter {
          animation: modalEnter 0.3s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
