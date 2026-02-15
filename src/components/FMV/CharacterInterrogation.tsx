import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import { CharacterPortrait } from '../UI/CharacterPortrait'
import { chatStream, type ChatResponse, analyzeWithWatson, checkVideoStatus } from '../../api/client'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import { useVoiceContext } from '../../hooks/useVoice'
import { CinematicMoment, CinematicGenerating } from './CinematicMoment'
import { getMoodFromPressure } from '../../utils/portraitMood'

type InterrogationTactic = 'alibi' | 'present_evidence' | 'cross_reference' | 'bluff' | null

interface CharacterInterrogationProps {
  characterId: string
  onClose: () => void
}

// Helper function to clean text for TTS
function cleanTextForSpeech(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    // Remove stage directions and actions (content in asterisks or parentheses)
    .replace(/\*[^*]+\*/g, '') // *sighs*, *nervously*
    .replace(/\([^)]*\)/g, '') // (pauses), (looking away)
    .replace(/\[[^\]]*\]/g, '') // [hesitates]
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

function getTimeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getPressureBarColor(level: number): string {
  if (level >= 80) return 'bg-noir-blood'
  if (level >= 60) return 'bg-orange-500'
  if (level >= 30) return 'bg-yellow-400'
  return 'bg-green-500'
}

function getPressureTextColor(level: number): string {
  if (level >= 80) return 'text-noir-blood'
  if (level >= 60) return 'text-orange-400'
  if (level >= 30) return 'text-yellow-400'
  return 'text-green-400'
}

function extractClaimCandidates(text: string): string[] {
  const clean = text
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!clean) return []

  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const claimSignals = [
    /\bI\b/i,
    /\bwe\b/i,
    /\bmy\b/i,
    /\bme\b/i,
  ]

  const actionSignals = [
    /\bwas\b|\bam\b|\bwere\b/i,
    /\bwent\b|\bwent to\b|\bwent in\b/i,
    /\bsaw\b|\bseen\b|\bnoticed\b|\bheard\b/i,
    /\bdid\b|\bdidn't\b|\bdid not\b|\bdon't\b|\bcan't\b/i,
    /\bcalled\b|\bmet\b|\bfound\b|\bkept\b|\bbeen\b/i,
  ]

  return sentences.filter((sentence) => {
    const hasClaimSignal = claimSignals.some((signal) => signal.test(sentence))
    const hasActionSignal = actionSignals.some((signal) => signal.test(sentence))
    return hasClaimSignal && hasActionSignal && sentence.length > 12
  })
}

function getStatementTopic(statement: string): string {
  const lower = statement.toLowerCase()
  if (/(where|at|in the|at the|on the|hallway|garden|kitchen|study|parlor|dining)/i.test(lower)) {
    return 'Location & movements'
  }
  if (/(who|see|saw|watch|heard|noticed)/i.test(lower)) {
    return 'Observation'
  }
  if (/(did\s|didn't|have|got|did not|remember|did you)/i.test(lower)) {
    return 'Alibi'
  }
  if (/(saw|found|noticed|heard|heard|overheard|found)/i.test(lower)) {
    return 'Evidence'
  }
  return 'Statement'
}

function inferContradictionFromResponse(
  responseText: string,
  playerQuestion: string,
  characterName: string,
  evidenceCollection: Array<{ id: string; source: string; description: string }>,
  lastPresentedEvidence?: { source: string; name: string; description: string } | null
): { explanation: string; evidenceSource: string } | null {
  const text = responseText.toLowerCase()

  const nervousSignals = [
    'i can explain',
    'i can\'t explain',
    'i can not explain',
    'nervous',
    'hesitate',
    'stammer',
    'i think',
    'maybe',
    'actually',
    'i guess',
  ]

  if (lastPresentedEvidence && nervousSignals.some((signal) => text.includes(signal.toLowerCase()))) {
    return {
      explanation: `${characterName} became visibly pressured and offered a weak explanation after seeing ${lastPresentedEvidence.name}.`,
      evidenceSource: lastPresentedEvidence.source,
    }
  }

  const locationKeywords = ['hallway', 'garden', 'kitchen', 'study', 'parlor', 'dining-room', 'dining room', 'library', 'upstairs', 'basement']

  const statementLocations = locationKeywords.filter((location) => text.includes(location))

  const contradictionCandidates = evidenceCollection.filter((e) => {
    const combined = `${e.source} ${e.description}`.toLowerCase()
    const evidenceLocations = locationKeywords.filter((location) =>
      combined.includes(location)
    )

    if (evidenceLocations.length === 0 || statementLocations.length === 0) {
      return false
    }

    return evidenceLocations.some((el) => !statementLocations.includes(el) && /\b(i|we|my|me|mine)\b/i.test(responseText))
  })

  if (contradictionCandidates.length > 0) {
    const first = contradictionCandidates[0]
    return {
      explanation: `${characterName} claimed to be in a different location than suggested by the evidence (${first.source}).`,
      evidenceSource: first.source,
    }
  }

  // Generic contradiction flag if question explicitly calls out evidence and response is defensive
  if ((/\bcontradiction\b|\binconsistent\b|\bevidence\b/i.test(playerQuestion) || /presented\s+it/i.test(playerQuestion)) && /\bi can\b|\bi don't\b|\bi do not\b|\bcan't\b|\bcannot\b/i.test(text)) {
    if (lastPresentedEvidence) {
      return {
        explanation: `${characterName}'s response suggests stress under evidence pressure.`,
        evidenceSource: lastPresentedEvidence.source,
      }
    }
  }

  return null
}

// Evidence notification toast component
function EvidenceToast({ 
  title, 
  description, 
  onDismiss 
}: { 
  title: string
  description: string
  onDismiss: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-br from-noir-gold via-amber-500 to-noir-gold text-noir-black px-6 py-4 rounded-sm shadow-2xl max-w-md border-2 border-amber-300"
    >
      <div className="flex items-start gap-3">
        <motion.span 
          className="text-2xl"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
        >
          📋
        </motion.span>
        <div>
          <p className="font-serif font-bold text-base mb-1">New Evidence: {title}</p>
          <p className="text-sm text-noir-charcoal">{description}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Watson whisper component
function WatsonWhisper({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="fixed bottom-24 right-8 z-50 bg-amber-100/95 text-amber-900 px-4 py-3 rounded-sm shadow-lg max-w-xs border-l-4 border-amber-600"
      style={{ 
        transform: 'rotate(-1deg)',
        fontFamily: 'Georgia, serif'
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">💡</span>
        <div>
          <p className="font-bold text-xs">Watson:</p>
          <p className="text-sm italic">{message}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function CharacterInterrogation({ characterId, onClose }: CharacterInterrogationProps) {
  const {
    characters,
    messages,
    addMessage,
    psychology,
    updatePsychology,
    addEvidence,
    addContradictions,
    addStatement,
    statements,
    updateCharacterPressure,
    collectedEvidence
  } = useGameStore()
  // Voice manager for ElevenLabs TTS
  const { speak, isPlaying, voiceEnabled } = useVoiceContext()
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [_error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreamingResponse, setIsStreamingResponse] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)
  const [evidenceToast, setEvidenceToast] = useState<{ title: string; description: string } | null>(null)
  const [watsonWhisper, setWatsonWhisper] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [_pressureIncreased, setPressureIncreased] = useState(false)
  const [rawPressure, setRawPressure] = useState(0) // 0-100 scale for portrait mood
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<number | null>(null)
  const previousPressure = useRef(psychology.pressureLevel)
  
  // Cinematic moment state
  const [cinematicVideoUrl, setCinematicVideoUrl] = useState<string | null>(null)
  const [cinematicText, setCinematicText] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [_videoGenerationId, setVideoGenerationId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<number | null>(null)
  
  // Interrogation Tactics State
  const [activeTactic, setActiveTactic] = useState<InterrogationTactic>(null)
  const [showEvidencePicker, setShowEvidencePicker] = useState(false)
  const [showStatementPicker, setShowStatementPicker] = useState(false)
  const [showEvidencePanel, setShowEvidencePanel] = useState(false)
  const [showStatementLog, setShowStatementLog] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null)
  const [selectedStatement, setSelectedStatement] = useState<{ characterId: string; content: string } | null>(null)
  const [showContradictionOverlay, setShowContradictionOverlay] = useState(false)
  const [contradictionText, setContradictionText] = useState<string>('')

  const character = characters.find((c) => c.id === characterId)

  const characterStatements = statements.filter((entry) => entry.characterId === characterId)

  const pressureDisplayLevel = character?.pressure?.level ?? rawPressure
  const conversationMessages = messages.filter(
    (m) => m.characterId === characterId || (m.role === 'player' && !m.characterId)
  ).slice(-20) // Keep last 20 messages for this character

  const latestCharacterMessage = [...conversationMessages].reverse().find((m) => m.role === 'character')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  useEffect(() => {
    if (character?.pressure?.level !== undefined) {
      setRawPressure(character.pressure.level)
    }
  }, [character?.pressure?.level])

  // Detect pressure changes and trigger pulse animation
  useEffect(() => {
    if (psychology.pressureLevel > previousPressure.current) {
      setPressureIncreased(true)
      previousPressure.current = psychology.pressureLevel
      
      // Reset animation after 600ms
      const timer = setTimeout(() => {
        setPressureIncreased(false)
      }, 600)
      
      return () => clearTimeout(timer)
    } else {
      previousPressure.current = psychology.pressureLevel
    }
  }, [psychology.pressureLevel])

  const applyChatResponse = async (
    response: ChatResponse,
    question: string,
    presentedEvidenceSource?: string | null
  ) => {
    if (!character) return
    if (response.isFallback) {
      addMessage({
        role: 'character',
        characterId,
        content: response.message,
      })
      setError("The suspect doesn't seem to want to answer. Try again?")
      setShowRetry(true)
      return
    }

    const statementText = response.message
    const trimmedQuestion = question

    // Success! Add real character response
    addMessage({
      role: 'character',
      characterId,
      content: statementText,
    })

    // Store parsed statements for statement log
    const claimStatements = extractClaimCandidates(statementText)
    const parsedStatements = claimStatements.length > 0 ? claimStatements : [statementText]
    parsedStatements.forEach((statement) => {
      addStatement({
        characterId,
        characterName: character.name,
        topic: getStatementTopic(statement),
        content: statement,
        playerQuestion: trimmedQuestion,
      })
    })

    // Speak the response with ElevenLabs if voice is enabled
    if (voiceEnabled) {
      const cleanedText = cleanTextForSpeech(statementText)
      speak(characterId, cleanedText).catch((err) => {
        console.log('Voice playback failed:', err)
      })
    }

    // Update pressure if returned
    if (response.pressure) {
      updateCharacterPressure(characterId, response.pressure)
      setRawPressure(response.pressure.level)
      let convertedLevel: 1 | 2 | 3 | 4 | 5 = 1
      if (response.pressure.level <= 15) {
        convertedLevel = 1
      } else if (response.pressure.level <= 35) {
        convertedLevel = 2
      } else if (response.pressure.level <= 60) {
        convertedLevel = 3
      } else if (response.pressure.level <= 80) {
        convertedLevel = 4
      } else {
        convertedLevel = 5
      }

      updatePsychology({
        pressureLevel: convertedLevel,
      })
    }

    const evidenceSnapshot = collectedEvidence
      .map((item) => ({
        id: item.id,
        source: item.source,
        description: `${item.description} ${item.source}`,
      }))
      .concat(
        Object.entries(EVIDENCE_DATABASE).map(([source, data]) => ({
          id: source,
          source,
          description: `${data.name} ${data.description}`,
        }))
      )

    const presentEvidence = presentedEvidenceSource
      ? collectedEvidence.find((item) => item.source === presentedEvidenceSource)
      : null
    const presentedEvidenceData = presentEvidence && presentedEvidenceSource
      ? {
          source: presentedEvidenceSource as string,
          name: EVIDENCE_DATABASE[presentedEvidenceSource as string]?.name || 'Evidence',
          description: presentEvidence.description,
        }
      : null

    // Add evidence from conversation when AI generates statements
    if (response.statementId) {
      const evidenceSource = `${characterId}-${response.statementId}`
      const evidenceData = EVIDENCE_DATABASE[evidenceSource]

      addEvidence({
        type: 'testimony',
        description: `${character.name}: "${statementText.substring(0, 100)}..."`,
        source: evidenceSource,
      })

      setEvidenceToast({
        title: evidenceData?.name || 'Testimony Recorded',
        description: evidenceData?.description || `Key statement from ${character.name}`,
      })

      const watsonMessages = [
        "That's significant, Detective. I've noted it in our case files.",
        'Interesting... This could be important.',
        'This might be a crucial piece of the puzzle.',
        'Pay attention to that detail, Detective.',
      ]
      const randomWhisper = watsonMessages[Math.floor(Math.random() * watsonMessages.length)]
      setTimeout(() => setWatsonWhisper(randomWhisper), 500)
    }

    const foundContradiction = inferContradictionFromResponse(
      statementText,
      trimmedQuestion,
      character.name,
      evidenceSnapshot,
      presentedEvidenceData
    )

    if (foundContradiction) {
      const contradiction = {
        id: `ui-contradiction-${character.id}-${Date.now()}`,
        statement1: {
          characterId,
          characterName: character.name,
          content: statementText,
          playerQuestion: trimmedQuestion,
        },
        statement2: {
          characterId,
          characterName: 'Evidence',
          content: presentedEvidenceData
            ? `${presentedEvidenceData.name}: ${presentedEvidenceData.description}`
            : foundContradiction.evidenceSource,
          playerQuestion: 'Presented evidence check',
        },
        explanation: foundContradiction.explanation,
        severity: 'major' as const,
        discoveredAt: Date.now(),
      }

      addContradictions([contradiction])
      setContradictionText(foundContradiction.explanation)
      setShowContradictionOverlay(true)
      updatePsychology({ isLying: true })
    } else {
      updatePsychology({ isLying: false })
    }

    // Handle contradictions from backend response
    if (response.contradictions && response.contradictions.length > 0) {
      addContradictions(response.contradictions)
      updatePsychology({ isLying: true })
    }

    if (response.cinematicMoment && response.videoGenerationId) {
      console.log('[CINEMATIC] Moment detected! Starting video poll:', response.videoGenerationId)
      setIsGeneratingVideo(true)
      setVideoGenerationId(response.videoGenerationId)
      setCinematicText(statementText)
      startVideoPolling(response.videoGenerationId, statementText)
    }

    try {
      const watsonAnalysis = await analyzeWithWatson(
        characterId,
        character.name,
        statementText,
        question,
        response.pressure?.level || 0
      )

      if (watsonAnalysis.success) {
        const { newContradictions } = watsonAnalysis.analysis

        if (newContradictions && newContradictions.length > 0) {
          const formattedContradictions = newContradictions.map((c: any) => ({
            id: c.id,
            statement1: {
              characterId: c.statement1.characterId,
              characterName: c.statement1.characterName,
              content: c.statement1.content,
              playerQuestion: '',
            },
            statement2: {
              characterId: c.statement2.characterId,
              characterName: c.statement2.characterName,
              content: c.statement2.content,
              playerQuestion: '',
            },
            explanation: c.explanation,
            severity: c.severity === 'critical' ? 'major' : c.severity,
            discoveredAt: Date.now(),
          }))

          addContradictions(formattedContradictions)
        }
      }
    } catch (watsonError) {
      console.error('Watson analysis failed:', watsonError)
    } finally {
    }
  }


  const errorToMessage = (err: unknown) => {
    if (err instanceof Error) return err.message
    return 'Unknown error'
  }

  const handleSendMessage = async (
    retryQuestion?: string,
    tacticOverride?: InterrogationTactic,
    evidenceIdOverride?: string | null
  ) => {
    const question = retryQuestion || inputValue
    const tactic = tacticOverride || activeTactic
    const evidenceId = evidenceIdOverride || selectedEvidence

    if (!question.trim() || isTyping || !character) return

    // Clear retry state
    setShowRetry(false)
    setError(null)
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (!retryQuestion) {
      setInputValue('')
    }
    setLastQuestion(question)

    // Add player message (only if not already added from a retry)
    if (!retryQuestion) {
      addMessage({
        role: 'player',
        content: question,
        characterId,
      })
    }

    if (tactic === 'present_evidence' && evidenceId) {
    }

    setIsTyping(true)
    setIsStreamingResponse(true)
    setStreamingText('')

    // Reset tactic state after message is sent
    setActiveTactic(null)
    setShowEvidencePicker(false)
    setShowEvidencePanel(false)
    setShowStatementPicker(false)
    setSelectedEvidence(null)
    setSelectedStatement(null)

    // cancel any existing stream
    if (streamAbortRef.current) {
      streamAbortRef.current.abort()
      streamAbortRef.current = null
    }

    try {
      await new Promise<void>((resolve, reject) => {
        streamAbortRef.current = chatStream(
          {
            characterId,
            message: question,
            tactic,
            evidenceId,
            crossReferenceStatement: selectedStatement,
          },
          (text) => {
            setStreamingText((prev) => `${prev}${text}`)
          },
          async (response) => {
            setStreamingText('')
            setIsStreamingResponse(false)
            try {
              await applyChatResponse(response, question, evidenceId)
            } finally {
              resolve()
            }
          },
          (err) => {
            if (streamAbortRef.current?.signal.aborted) {
              resolve()
              return
            }
            reject(err)
          }
        )
      })
    } catch (err) {
      console.error('Chat error:', err)
      setError("The suspect doesn't seem to want to answer. Try again?")
      setShowRetry(true)
      addMessage({
        role: 'character',
        characterId,
        content: errorToMessage(err),
      })
    } finally {
      setIsTyping(false)
      setIsStreamingResponse(false)
      streamAbortRef.current = null
    }
  }

  // Manual retry handler
  const handleRetry = () => {
    if (lastQuestion) {
      handleSendMessage(lastQuestion)
    }
  }

  // Start polling for video generation status
  const startVideoPolling = (genId: string, text: string) => {
    let attempts = 0
    const maxAttempts = 120 // 10 minutes max (5 second intervals)
    
    const poll = async () => {
      attempts++
      console.log(`[CINEMATIC POLL] Attempt ${attempts}/${maxAttempts}`)
      
      try {
        const status = await checkVideoStatus(genId)
        
        if (status.status === 'completed' && status.videoUrl) {
          console.log('[CINEMATIC] Video ready!', status.videoUrl)
          setIsGeneratingVideo(false)
          setCinematicVideoUrl(status.videoUrl)
          setCinematicText(text)
          
          // Clear polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else if (status.status === 'failed') {
          console.error('[CINEMATIC] Video generation failed:', status.error)
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          
          // Clear polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else if (attempts >= maxAttempts) {
          console.error('[CINEMATIC] Polling timeout')
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
        // Otherwise keep polling (status is 'pending' or 'processing')
      } catch (pollError) {
        console.error('[CINEMATIC] Poll error:', pollError)
        
        // On error, give it a few tries before giving up
        if (attempts > 5) {
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      }
    }
    
    // Poll every 5 seconds
    poll() // Initial poll
    pollingIntervalRef.current = setInterval(poll, 5000) as unknown as number
  }

  // Cleanup timeout and polling on unmount
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort()
        streamAbortRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Suggested questions — dynamic based on active mystery
  const getSuggestedQuestions = () => {
    const mystery = useMysteryStore.getState().activeMystery
    
    // For generated mysteries, build questions from the blueprint
    if (mystery && mystery.id !== 'ashford-affair') {
      const victim = mystery.worldState?.victim || 'the victim'
      const char = mystery.characters?.find((c: { id: string }) => c.id === characterId)
      const role = char?.role || 'your role here'
      
      const questions = [
        `Where were you when ${victim} was killed?`,
        `What was your relationship with ${victim}?`,
        `Tell me about your role as ${role}.`,
      ]
      
      // Add a motive-related question if available
      if (char?.motive) {
        questions.push(`I've heard you had reason to want ${victim} dead. Care to explain?`)
      }
      
      return questions
    }
    
    // Fallback: Ashford Affair hardcoded questions
    const baseQuestions = [
      'Where were you at midnight when Edmund was killed?',
      'What was your relationship with Edmund Ashford?',
    ]
    
    const characterQuestions: Record<string, string[]> = {
      victoria: [
        'How was your marriage to Edmund?',
        'Did you know about the will changes?',
      ],
      thomas: [
        'What did your father think of your lifestyle?',
        'Were you in debt to anyone?',
      ],
      eleanor: [
        'How long have you worked for the Ashfords?',
        'Did Edmund confide in you about anything?',
      ],
      marcus: [
        'What was Edmund\'s health like?',
        'Did you prescribe him any medications?',
      ],
      lillian: [
        'How did you know Edmund?',
        'When did you last see him before the party?',
      ],
      james: [
        'Who did you see enter and leave the study?',
        'Did you hear any arguments?',
      ],
    }
    
    return [...baseQuestions, ...(characterQuestions[characterId] || [])]
  }
  
  const pressurePercent = Math.max(0, Math.min(100, Math.round(pressureDisplayLevel)))
  const pressureLabel =
    pressurePercent <= 30
      ? 'Calm'
      : pressurePercent <= 60
        ? 'Uneasy'
        : pressurePercent <= 80
          ? 'Stressed'
          : 'Rattled'

  const handlePressEvidence = () => {
    handleSendMessage('Tell me more about that. I need details.')
  }

  const handleOpenEvidencePanel = () => {
    if (collectedEvidence.length === 0) {
      setWatsonWhisper('You need evidence first before confronting him.')
      return
    }
    setShowEvidencePanel(true)
    setShowStatementPicker(false)
    setShowEvidencePicker(true)
  }

  const handleMoveOn = () => {
    setActiveTactic(null)
    setShowEvidencePanel(false)
    setShowEvidencePicker(false)
    setShowStatementPicker(false)
    setSelectedEvidence(null)
    setSelectedStatement(null)
  }

  const suggestedQuestions = getSuggestedQuestions()
  const mobileSuggestedQuestions = suggestedQuestions.slice(0, 2)

  if (!character) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-noir-black z-50">
      {/* Interrogation room atmospheric background */}
      <div 
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{
          backgroundImage: 'url(/ui/interrogation-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.12,
        }}
      />
      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-noir-black letterbox-border" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-noir-black letterbox-border" />

      {/* Cinematic moment video overlay */}
      <AnimatePresence>
        {cinematicVideoUrl && cinematicText && (
          <CinematicMoment
            videoUrl={cinematicVideoUrl}
            characterName={character.name}
            responseText={cinematicText}
            onDismiss={() => {
              setCinematicVideoUrl(null)
              setCinematicText(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Cinematic moment generating indicator */}
      <AnimatePresence>
        {isGeneratingVideo && (
          <CinematicGenerating
            characterName={character.name}
            onCancel={() => {
              setIsGeneratingVideo(false)
              setVideoGenerationId(null)
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Evidence toast */}
      <AnimatePresence>
        {evidenceToast && (
          <EvidenceToast 
            title={evidenceToast.title}
            description={evidenceToast.description}
            onDismiss={() => setEvidenceToast(null)} 
          />
        )}
      </AnimatePresence>

      {/* Watson whisper */}
      <AnimatePresence>
        {watsonWhisper && (
          <WatsonWhisper 
            message={watsonWhisper}
            onDismiss={() => setWatsonWhisper(null)} 
          />
        )}
      </AnimatePresence>

      {/* Back button - prominent */}
      <motion.button
        onClick={onClose}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-4 py-2 flex items-center gap-2 bg-noir-charcoal/90 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors font-serif text-xs sm:text-sm"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ← Back to Investigation
      </motion.button>

      {/* Statement Log button */}
      <motion.button
        onClick={() => setShowStatementLog(true)}
        className="absolute top-3 right-16 sm:top-4 sm:right-16 z-10 w-12 h-10 flex items-center justify-center bg-noir-charcoal/80 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        📝
      </motion.button>

      {/* Close X button */}
      <motion.button
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-10 h-10 flex items-center justify-center bg-noir-charcoal/80 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        ✕
      </motion.button>

      {/* Main layout */}
      <div className="h-[100dvh] flex flex-col pt-12 md:pb-0 pb-12">
        {/* Character portrait section - mobile compact, desktop expanded */}
        <div className="flex-shrink-0 flex items-center justify-center pt-3 pb-4 border-b border-noir-slate/30">
          <div className="flex w-full px-3 items-center gap-3 md:gap-4">
            <div className={`relative shrink-0 ${pressureDisplayLevel > 80 ? "animate-portray-shake" : ""}`}>
              <div className="sm:hidden">
                <CharacterPortrait
                  characterId={character.id}
                  name={character.name}
                  role={character.role}
                  size="small"
                  isActive={true}
                  mood={getMoodFromPressure(rawPressure)}
                />
              </div>
              <div className="hidden sm:block">
                <CharacterPortrait
                  characterId={character.id}
                  name={character.name}
                  role={character.role}
                  size="medium"
                  isActive={true}
                  mood={getMoodFromPressure(rawPressure)}
                />
              </div>
              {pressureDisplayLevel > 80 && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-2 opacity-70">
                  <span className="text-xl drop-shadow">💧</span>
                  <span className="text-xl drop-shadow">💧</span>
                </div>
              )}
              {/* Voice playing indicator */}
              {isPlaying && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-noir-gold text-noir-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <span className="text-lg">🔊</span>
                </motion.div>
              )}
            </div>

            {/* Character info and emotional state */}
            <div className="min-w-0 flex-1">
              <div className="sm:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-noir-cream font-serif text-base truncate">{character.name}</h2>
                  <span className="text-noir-smoke text-xs">|</span>
                  <span className="text-noir-smoke text-xs italic truncate">{character.role}</span>
                  <span className={`text-xs font-semibold shrink-0 ${getPressureTextColor(pressurePercent)}`}>
                    {pressureLabel}
                  </span>
                </div>
              </div>

              <div className="w-full mt-2">
                <p className="text-[11px] text-noir-smoke uppercase tracking-wider">Pressure {pressurePercent}%</p>
                <div className="mt-1 h-2 bg-noir-slate/40 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getPressureBarColor(pressurePercent)}`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${pressurePercent}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-noir-cream mt-1">{pressureLabel}</p>
              </div>

              <div className="hidden sm:block">
                <h2 className="text-noir-cream font-serif text-xl">{character.name}</h2>
                <p className="text-noir-smoke text-sm italic">{character.role}</p>
              </div>

              {psychology.isLying && (
                <p className="text-xs text-noir-blood mt-1 italic">
                  Something feels off...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conversation area - scrollable */}
        <div 
          ref={conversationRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 space-y-4 scroll-smooth pb-72 md:pb-4"
          style={{ scrollBehavior: 'smooth' }}
        >
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
                  className={`relative max-w-[92%] sm:max-w-2xl px-4 sm:px-6 py-3 sm:py-4 rounded ${
                    msg.role === 'player'
                      ? 'bg-noir-gold/20 border border-noir-gold/30 text-noir-cream'
                      : 'bg-noir-charcoal/50 border border-noir-slate/30 text-noir-cream'
                  }`}
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
                  
                  {/* Replay button for character messages */}
                  {msg.role === 'character' && voiceEnabled && (
                    <motion.button
                      onClick={() => {
                        const cleanedText = cleanTextForSpeech(msg.content)
                        speak(characterId, cleanedText).catch(err => {
                          console.log('Voice replay failed:', err)
                        })
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-noir-slate/80 hover:bg-noir-gold/80 border border-noir-slate hover:border-noir-gold rounded-full flex items-center justify-center transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Replay voice"
                    >
                      <span className="text-xs">🔊</span>
                    </motion.button>
                  )}

                  {msg.role === 'character' && latestCharacterMessage?.id === msg.id && !isTyping && (
                    <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
                      <motion.button
                        onClick={handlePressEvidence}
                        disabled={isTyping}
                        className="px-3 py-2 text-xs sm:text-sm rounded border border-noir-gold text-noir-gold bg-noir-gold/10 hover:bg-noir-gold/20 shadow-sm shadow-noir-gold/40"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="mr-1">🔍</span> PRESS
                      </motion.button>
                      <motion.button
                        onClick={handleOpenEvidencePanel}
                        disabled={isTyping || collectedEvidence.length === 0}
                        className="px-3 py-2 text-xs sm:text-sm rounded bg-gradient-to-r from-amber-600/80 to-noir-gold text-noir-black font-medium hover:from-amber-500/90 hover:to-noir-gold/80 disabled:opacity-50"
                        whileHover={!isTyping ? { scale: 1.03 } : {}}
                        whileTap={!isTyping ? { scale: 0.98 } : {}}
                      >
                        <span className="mr-1">📋</span> PRESENT EVIDENCE
                      </motion.button>
                      <motion.button
                        onClick={handleMoveOn}
                        disabled={isTyping}
                        className="px-3 py-2 text-xs sm:text-sm rounded border border-noir-slate/50 text-noir-smoke hover:text-noir-cream hover:border-noir-slate disabled:opacity-50"
                        whileHover={!isTyping ? { scale: 1.03 } : {}}
                        whileTap={!isTyping ? { scale: 0.98 } : {}}
                      >
                        <span className="mr-1">➡️</span> MOVE ON
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-2xl px-6 py-4 bg-noir-charcoal/70 border-2 border-noir-gold/40 rounded shadow-lg">
                <p className="text-noir-gold text-sm sm:text-base font-serif">
                  {isStreamingResponse ? (
                    <>
                      {streamingText.length > 0 ? streamingText : '...'}
                      <span className="ml-1 inline-block animate-pulse">▌</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl mr-2">💭</span>
                      {character.name} is considering your question...
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error/retry message */}
        {showRetry && lastQuestion && (
          <div className="px-8 py-2">
            <p className="text-noir-blood text-sm text-center">
              The suspect doesn't seem to want to answer. Try again?
            </p>
            <motion.button
              onClick={handleRetry}
              className="mx-auto block mt-2 px-6 py-2 bg-noir-gold/20 border border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 transition-colors text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Retry
            </motion.button>
          </div>
        )}

        {/* Input area */}
        <div className="fixed inset-x-0 bottom-12 z-20 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 space-y-2 bg-noir-black/95 backdrop-blur border-t border-noir-slate/30 max-h-[58vh] overflow-y-auto md:static md:z-auto md:px-8 md:pb-6 md:pt-0 md:space-y-4 md:bg-transparent md:border-0 md:backdrop-blur-none">
          {/* Interrogation Tactics Bar */}
          <div className="md:flex-row flex flex-nowrap gap-2 justify-center md:justify-center max-w-4xl mx-auto md:gap-3">
            {/* Ask About Alibi */}
            <motion.button
              onClick={() => {
                setActiveTactic('alibi')
                setInputValue('Where were you at the time of the murder? Give me specific details about your movements.')
              }}
              disabled={isTyping}
              className={`w-[23%] min-w-[60px] px-2 py-2 rounded border transition-all ${
                activeTactic === 'alibi'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-blue-500/50 text-noir-smoke hover:text-blue-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={!isTyping ? { scale: 1.02 } : {}}
              whileTap={!isTyping ? { scale: 0.98 } : {}}
              title="Ask for detailed timeline and movements (+5 pressure)"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base sm:text-xl">🕐</span>
                <span className="text-[10px] leading-tight text-center sm:text-xs font-serif">Alibi</span>
              </div>
            </motion.button>

            {/* Present Evidence */}
            <motion.button
              onClick={handleOpenEvidencePanel}
              disabled={isTyping || collectedEvidence.length === 0}
              className={`w-[23%] min-w-[60px] px-2 py-2 rounded border transition-all ${
                showEvidencePicker || showEvidencePanel
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-amber-500/50 text-noir-smoke hover:text-amber-300'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              whileHover={!isTyping && collectedEvidence.length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isTyping && collectedEvidence.length > 0 ? { scale: 0.98 } : {}}
              title="Show collected evidence to the suspect (+15 pressure)"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base sm:text-xl">📋</span>
                <span className="text-[10px] leading-tight text-center sm:text-xs font-serif">Present</span>
              </div>
            </motion.button>

            {/* Cross-Reference */}
            <motion.button
              onClick={() => {
                if (messages.filter(m => m.role === 'character' && m.characterId !== characterId).length === 0) {
                  setWatsonWhisper("You need statements from other suspects first, Detective.")
                  return
                }
                setShowStatementPicker(!showStatementPicker)
                setShowEvidencePicker(false)
              }}
              disabled={isTyping || messages.filter(m => m.role === 'character' && m.characterId !== characterId).length === 0}
              className={`w-[23%] min-w-[60px] px-2 py-2 rounded border transition-all ${
                showStatementPicker
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-orange-500/50 text-noir-smoke hover:text-orange-300'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              whileHover={!isTyping && messages.filter(m => m.role === 'character' && m.characterId !== characterId).length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isTyping && messages.filter(m => m.role === 'character' && m.characterId !== characterId).length > 0 ? { scale: 0.98 } : {}}
              title="Confront with another suspect's testimony (+20 pressure)"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base sm:text-xl">🔄</span>
                <span className="text-[10px] leading-tight text-center sm:text-xs font-serif">Cross-Ref</span>
              </div>
            </motion.button>

            {/* Bluff */}
            <motion.button
              onClick={() => {
                setActiveTactic('bluff')
                setInputValue('We have evidence that proves you were involved. Want to explain yourself?')
              }}
              disabled={isTyping}
              className={`w-[23%] min-w-[60px] px-2 py-2 rounded border transition-all ${
                activeTactic === 'bluff'
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-red-500/50 text-noir-smoke hover:text-red-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={!isTyping ? { scale: 1.02 } : {}}
              whileTap={!isTyping ? { scale: 0.98 } : {}}
              title="Lie to provoke a reaction (risky: +10 if close to truth, -5 if wrong)"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base sm:text-xl">🃏</span>
                <span className="text-[10px] leading-tight text-center sm:text-xs font-serif">Bluff</span>
              </div>
            </motion.button>
          </div>

          {/* Evidence Picker / Present Panel */}
          <AnimatePresence>
            {showEvidencePicker || showEvidencePanel ? (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                className="fixed inset-x-0 bottom-12 z-30 max-h-[55vh] md:static md:z-auto px-3 md:px-0"
              >
                <div className="max-w-4xl mx-auto bg-noir-charcoal/95 border-2 border-amber-500/50 p-4 rounded shadow-2xl">
                  <p className="text-amber-300 text-sm mb-3 font-serif">Select evidence to present:</p>
                  <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                    {collectedEvidence.map((evidence) => {
                      const evidenceData = EVIDENCE_DATABASE[evidence.source]
                      const name = evidenceData?.name || 'Evidence'
                      const description = evidenceData?.description || evidence.description
                      return (
                        <motion.button
                          key={evidence.id}
                          onClick={() => {
                            const evidencePrompt = `How do you explain this? ${name}: ${description}`
                            setShowEvidencePanel(false)
                            setShowEvidencePicker(false)
                            setShowStatementPicker(false)
                            handleSendMessage(evidencePrompt, 'present_evidence', evidence.source)
                          }}
                          className="w-full text-left px-4 py-3 bg-noir-slate/30 border border-noir-slate/50 hover:border-amber-500/50 text-noir-cream hover:text-amber-300 transition-colors"
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <p className="font-semibold text-sm">{name}</p>
                          <p className="text-xs text-noir-smoke mt-1">{description}</p>
                        </motion.button>
                      )
                    })}
                  </div>
                  <motion.button
                    onClick={() => {
                      setShowEvidencePanel(false)
                      setShowEvidencePicker(false)
                    }}
                    className="mt-3 px-3 py-2 text-sm border border-noir-slate/50 hover:border-noir-gold/50 rounded"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Statement Picker (Cross-Reference) */}
          <AnimatePresence>
            {showStatementPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-noir-charcoal/80 border-2 border-orange-500/50 p-4 rounded">
                  <p className="text-orange-300 text-sm mb-3 font-serif">Select a statement to confront them with:</p>
                  <div className="space-y-2 max-h-52 sm:max-h-60 overflow-y-auto">
                    {messages
                      .filter(m => m.role === 'character' && m.characterId !== characterId)
                      .slice(-10) // Last 10 statements from other characters
                      .reverse()
                      .map((msg) => {
                        const otherChar = characters.find(c => c.id === msg.characterId)
                        return (
                          <motion.button
                            key={msg.id}
                            onClick={() => {
                              setSelectedStatement({ characterId: msg.characterId!, content: msg.content })
                              setActiveTactic('cross_reference')
                              setInputValue(`${otherChar?.name || 'Another suspect'} said: "${msg.content.substring(0, 100)}..." Care to explain the contradiction?`)
                              setShowStatementPicker(false)
                            }}
                            className="w-full text-left px-4 py-3 bg-noir-slate/30 border border-noir-slate/50 hover:border-orange-500/50 text-noir-cream hover:text-orange-300 transition-colors"
                            whileHover={{ scale: 1.01, x: 4 }}
                          >
                            <p className="font-semibold text-sm text-orange-400">{otherChar?.name || 'Unknown'}</p>
                            <p className="text-xs text-noir-smoke mt-1 line-clamp-2">{msg.content}</p>
                          </motion.button>
                        )
                      })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggested questions */}
          {conversationMessages.length === 0 && (
            <>
              <div className="sm:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mobileSuggestedQuestions.map((question) => (
                    <motion.button
                      key={question}
                      onClick={() => setInputValue(question)}
                      className="px-3 py-2 rounded bg-noir-charcoal/50 border border-noir-slate/50 hover:border-noir-gold/50 text-noir-smoke hover:text-noir-cream text-xs whitespace-nowrap transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="hidden sm:flex flex-wrap gap-2 justify-center px-1">
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
            </>
          )}

          {/* Active Tactic Indicator */}
          {activeTactic && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto flex items-center justify-between bg-noir-slate/30 px-4 py-2 border-l-4"
              style={{
                borderLeftColor: 
                  activeTactic === 'alibi' ? '#60a5fa' : 
                  activeTactic === 'present_evidence' ? '#fbbf24' :
                  activeTactic === 'cross_reference' ? '#fb923c' :
                  '#ef4444'
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {activeTactic === 'alibi' && '🕐'}
                  {activeTactic === 'present_evidence' && '📋'}
                  {activeTactic === 'cross_reference' && '🔄'}
                  {activeTactic === 'bluff' && '🃏'}
                </span>
                <span className="text-[11px] sm:text-sm font-serif text-noir-cream">
                  Tactic: {activeTactic === 'alibi' && 'Ask About Alibi'}
                  {activeTactic === 'present_evidence' && 'Present Evidence'}
                  {activeTactic === 'cross_reference' && 'Cross-Reference'}
                  {activeTactic === 'bluff' && 'Bluff'}
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveTactic(null)
                  setSelectedEvidence(null)
                  setSelectedStatement(null)
                }}
                className="text-xs text-noir-smoke hover:text-noir-cream transition-colors"
              >
                ✕ Cancel
              </button>
            </motion.div>
          )}

          {/* Input field */}
          <div className="flex gap-2 sm:gap-4 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 bg-noir-charcoal/50 border-2 border-noir-slate/50 focus:border-noir-gold/50 text-noir-cream placeholder-noir-smoke outline-none transition-colors font-serif text-sm"
              style={{ fontFamily: 'var(--font-serif)' }}
            />
            <motion.button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="px-3 sm:px-6 py-3 sm:py-4 bg-noir-gold/20 border-2 border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif"
              whileHover={inputValue.trim() && !isTyping ? { scale: 1.05 } : {}}
              whileTap={inputValue.trim() && !isTyping ? { scale: 0.95 } : {}}
            >
              Ask
            </motion.button>
          </div>
        </div>

        {/* Statement Log Drawer */}
        <AnimatePresence>
          {showStatementLog && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="fixed inset-y-0 right-0 w-[90%] sm:w-[360px] bg-noir-charcoal border-l-2 border-noir-smoke/50 z-40 p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-noir-gold font-serif text-lg">📝 Statement Log</h3>
                <button
                  onClick={() => setShowStatementLog(false)}
                  className="text-noir-smoke hover:text-noir-cream"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {characterStatements.length === 0 ? (
                  <p className="text-noir-smoke text-sm">No statements logged yet.</p>
                ) : (
                  characterStatements.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-noir-slate/50 border border-noir-smoke/30 rounded p-3"
                    >
                      <p className="text-noir-gold text-xs uppercase tracking-wider mb-1">{entry.topic}</p>
                      <p className="text-noir-cream text-sm leading-relaxed">{entry.content}</p>
                      <p className="text-noir-smoke text-[11px] mt-2">{getTimeLabel(entry.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contradiction Overlay */}
        <AnimatePresence>
          {showContradictionOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-noir-black/80 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 180 }}
                className="relative text-center px-8 py-12 rounded border-2 border-noir-blood bg-noir-charcoal/95"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.7] }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-noir-blood/30 pointer-events-none"
                />
                <p className="relative text-noir-blood text-4xl sm:text-5xl font-serif font-bold tracking-[0.2em]">
                  CONTRADICTION FOUND!
                </p>
                <p className="relative mt-4 text-noir-cream font-serif text-xl sm:text-2xl">{character?.name}</p>
                <p className="relative mt-4 text-noir-cream/90 max-w-lg mx-auto">{contradictionText}</p>
                <motion.button
                  onClick={() => setShowContradictionOverlay(false)}
                  className="relative mt-8 px-6 py-3 bg-noir-gold text-noir-black rounded font-serif"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continue
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes portrait-shake {
            0% { transform: translate(0, 0) rotate(0deg); }
            20% { transform: translate(-1px, 1px) rotate(-1deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            60% { transform: translate(-1px, 1px) rotate(-0.5deg); }
            80% { transform: translate(1px, -1px) rotate(0.5deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }

          .animate-portray-shake {
            animation: portrait-shake 0.2s infinite;
          }
        `}</style>
      </div>
    </div>
  )
}
