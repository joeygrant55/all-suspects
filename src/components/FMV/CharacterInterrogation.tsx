import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from '../UI/CharacterPortrait'
import { sendMessage, analyzeWithWatson, checkVideoStatus } from '../../api/client'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import { useVoiceContext } from '../../hooks/useVoice'
import { CinematicMoment, CinematicGenerating } from './CinematicMoment'

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
    updateCharacterPressure,
    collectedEvidence
  } = useGameStore()
  
  // Voice manager for ElevenLabs TTS
  const { speak, isPlaying, voiceEnabled } = useVoiceContext()
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidenceToast, setEvidenceToast] = useState<{ title: string; description: string } | null>(null)
  const [watsonWhisper, setWatsonWhisper] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [pressureIncreased, setPressureIncreased] = useState(false)
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
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null)
  const [selectedStatement, setSelectedStatement] = useState<{ characterId: string; content: string } | null>(null)

  const character = characters.find((c) => c.id === characterId)
  const conversationMessages = messages.filter(
    (m) => m.characterId === characterId || (m.role === 'player' && !m.characterId)
  ).slice(-20) // Keep last 20 messages for this character

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

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

  const handleSendMessage = async (retryQuestion?: string, tacticOverride?: InterrogationTactic) => {
    const question = retryQuestion || inputValue
    const tactic = tacticOverride || activeTactic
    
    if (!question.trim() || isTyping || !character) return

    // Clear retry state
    setShowRetry(false)
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (!retryQuestion) {
      setInputValue('')
    }
    setError(null)
    setLastQuestion(question)
    
    // Add player message (only if not already added from a retry)
    if (!retryQuestion) {
      addMessage({
        role: 'player',
        content: question,
        characterId,
      })
    }

    setIsTyping(true)

    // Reset tactic state after message is sent
    setActiveTactic(null)
    setShowEvidencePicker(false)
    setShowStatementPicker(false)
    setSelectedEvidence(null)
    setSelectedStatement(null)

    try {
      // Call the real AI backend with tactic parameter
      const response = await sendMessage(characterId, question, tactic, selectedEvidence, selectedStatement)
      
      // Check if this is a fallback response (API failure)
      if (response.isFallback) {
        console.log('[FALLBACK DETECTED] Setting up auto-retry...')
        
        // Add fallback message temporarily
        addMessage({
          role: 'character',
          characterId,
          content: response.message,
        })
        
        // Show retry button
        setShowRetry(true)
        
        // Auto-retry after 2 seconds
        retryTimeoutRef.current = setTimeout(() => {
          console.log('[AUTO-RETRY] Retrying after 2 seconds...')
          // Remove fallback message before retry
          // Note: You'd need a removeMessage function in your store
          // For now, we'll just retry and the new response will appear
          handleSendMessage(question)
        }, 2000)
        
        setIsTyping(false)
        return
      }
      
      // Success! Add real character response
      addMessage({
        role: 'character',
        characterId,
        content: response.message,
      })

      // Speak the response with ElevenLabs if voice is enabled
      if (voiceEnabled) {
        const cleanedText = cleanTextForSpeech(response.message)
        speak(characterId, cleanedText).catch(err => {
          console.log('Voice playback failed:', err)
          // Non-critical - continue without voice
        })
      }

      // Update pressure if returned
      if (response.pressure) {
        updateCharacterPressure(characterId, response.pressure)
        // Convert 0-100 scale to 1-5 scale with better responsiveness
        // Thresholds: 0-15=1, 16-35=2, 36-60=3, 61-80=4, 81+=5
        let convertedLevel: 1|2|3|4|5 = 1
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
          pressureLevel: convertedLevel
        })
      }

      // Add evidence from conversation
      if (response.statementId) {
        const evidenceSource = `${characterId}-${response.statementId}`
        const evidenceData = EVIDENCE_DATABASE[evidenceSource]
        
        addEvidence({
          type: 'testimony',
          description: `${character.name}: "${response.message.substring(0, 100)}..."`,
          source: evidenceSource,
        })
        
        // Show enhanced evidence notification
        setEvidenceToast({
          title: evidenceData?.name || 'Testimony Recorded',
          description: evidenceData?.description || `Key statement from ${character.name}`
        })
        
        // Show Watson whisper
        const watsonMessages = [
          "That's significant, Detective. I've noted it.",
          "Interesting... This could be important.",
          "I've recorded that in our case files.",
          "This might be a crucial piece of the puzzle.",
          "Pay attention to that detail, Detective."
        ]
        const randomWhisper = watsonMessages[Math.floor(Math.random() * watsonMessages.length)]
        setTimeout(() => setWatsonWhisper(randomWhisper), 500)
      }

      // Handle contradictions
      if (response.contradictions && response.contradictions.length > 0) {
        addContradictions(response.contradictions)
        updatePsychology({ isLying: true })
      } else {
        updatePsychology({ isLying: false })
      }

      // Handle cinematic moments
      if (response.cinematicMoment && response.videoGenerationId) {
        console.log('[CINEMATIC] Moment detected! Starting video poll:', response.videoGenerationId)
        setIsGeneratingVideo(true)
        setVideoGenerationId(response.videoGenerationId)
        setCinematicText(response.message)
        
        // Start polling for video completion
        startVideoPolling(response.videoGenerationId, response.message)
      }

      // Run Watson analysis
      try {
        const watsonAnalysis = await analyzeWithWatson(
          characterId,
          character.name,
          response.message,
          question,
          response.pressure?.level || 0
        )
        
        if (watsonAnalysis.success) {
          const { newContradictions } = watsonAnalysis.analysis
          
          // Store contradictions in game state if not already added
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
        // Non-critical - continue without Watson
      }

    } catch (err) {
      console.error('Chat error:', err)
      setError('Connection failed. Please try again.')
      // Show retry button for connection errors too
      setShowRetry(true)
    } finally {
      setIsTyping(false)
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

  // Suggested questions (character-specific)
  const getSuggestedQuestions = () => {
    const baseQuestions = [
      'Where were you at midnight when Edmund was killed?',
      'What was your relationship with Edmund Ashford?',
    ]
    
    const characterQuestions: Record<string, string[]> = {
      victoria: [
        'How was your marriage to Edmund?',
        'Did you know about the will changes?',
        'Were you aware of any affairs?',
      ],
      thomas: [
        'What did your father think of your lifestyle?',
        'Were you in debt to anyone?',
        'Did you argue with your father recently?',
      ],
      eleanor: [
        'How long have you worked for the Ashfords?',
        'Did Edmund confide in you about anything?',
        'Did you notice anything unusual in his papers?',
      ],
      marcus: [
        'What was Edmund\'s health like?',
        'Did you prescribe him any medications?',
        'Were you treating anyone else at the manor?',
      ],
      lillian: [
        'How did you know Edmund?',
        'When did you last see him before the party?',
        'What brought you to the manor tonight?',
      ],
      james: [
        'Who did you see enter and leave the study?',
        'Did you hear any arguments?',
        'Was anything out of place when you did your rounds?',
      ],
    }
    
    return [...baseQuestions, ...(characterQuestions[characterId] || [])]
  }
  
  const suggestedQuestions = getSuggestedQuestions()

  if (!character) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-noir-black z-50">
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
        className="absolute top-4 left-4 z-10 px-4 py-2 flex items-center gap-2 bg-noir-charcoal/90 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors font-serif text-sm"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ← Back to Investigation
      </motion.button>

      {/* Close X button */}
      <motion.button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-noir-charcoal/80 border border-noir-slate hover:border-noir-gold text-noir-cream transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        ✕
      </motion.button>

      {/* Main layout */}
      <div className="h-full flex flex-col pt-12 pb-12">
        {/* Character portrait section - more compact */}
        <div className="flex-shrink-0 flex items-center justify-center py-4 border-b border-noir-slate/30">
          <div className="flex items-center gap-6">
            <div className="relative">
              <CharacterPortrait
                characterId={character.id}
                name={character.name}
                role={character.role}
                size="medium"
                isActive={true}
              />
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
            <div className="text-left">
              <h2 className="text-noir-cream font-serif text-xl">{character.name}</h2>
              <p className="text-noir-smoke text-sm italic">{character.role}</p>
              
              {/* Pressure meter - Enhanced with colors and animation */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-noir-smoke text-xs">Pressure:</span>
                <motion.div 
                  className="flex gap-0.5"
                  animate={pressureIncreased ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isActive = level <= psychology.pressureLevel
                    
                    // Color gradient based on pressure level
                    let barColor = 'bg-noir-slate'
                    if (isActive) {
                      if (psychology.pressureLevel === 1) {
                        barColor = 'bg-green-500' // Low pressure - green
                      } else if (psychology.pressureLevel === 2) {
                        barColor = level <= 2 ? 'bg-yellow-400' : 'bg-noir-slate' // Medium - yellow
                      } else if (psychology.pressureLevel === 3) {
                        barColor = level <= 3 ? 'bg-orange-500' : 'bg-noir-slate' // High - orange
                      } else if (psychology.pressureLevel >= 4) {
                        barColor = level <= psychology.pressureLevel ? 'bg-red-600' : 'bg-noir-slate' // Critical - red
                      }
                    }
                    
                    return (
                      <motion.div
                        key={level}
                        className={`w-3 h-4 ${barColor} ${
                          isActive ? 'shadow-sm' : ''
                        }`}
                        animate={
                          pressureIncreased && isActive
                            ? {
                                opacity: [0.7, 1, 0.7, 1],
                                boxShadow: [
                                  '0 0 0px rgba(255,255,255,0)',
                                  '0 0 8px rgba(255,255,255,0.6)',
                                  '0 0 0px rgba(255,255,255,0)',
                                ],
                              }
                            : {}
                        }
                        transition={{ duration: 0.6 }}
                      />
                    )
                  })}
                </motion.div>
                {/* Pressure level indicator */}
                <span className={`text-xs font-semibold ${
                  psychology.pressureLevel === 1 ? 'text-green-400' :
                  psychology.pressureLevel === 2 ? 'text-yellow-300' :
                  psychology.pressureLevel === 3 ? 'text-orange-400' :
                  'text-red-500'
                }`}>
                  {psychology.pressureLevel === 1 && 'Calm'}
                  {psychology.pressureLevel === 2 && 'Uneasy'}
                  {psychology.pressureLevel === 3 && 'Stressed'}
                  {psychology.pressureLevel === 4 && 'Rattled'}
                  {psychology.pressureLevel === 5 && 'Breaking'}
                </span>
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
          className="flex-1 overflow-y-auto px-8 py-6 space-y-4 scroll-smooth"
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
                  className={`relative max-w-2xl px-6 py-4 rounded ${
                    msg.role === 'player'
                      ? 'bg-noir-gold/20 border border-noir-gold/30 text-noir-cream'
                      : 'bg-noir-charcoal/50 border border-noir-slate/30 text-noir-cream'
                  }`}
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  <p className="text-base leading-relaxed">{msg.content}</p>
                  
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
                <div className="flex items-center gap-3">
                  <span className="text-xl">💭</span>
                  <p className="text-noir-gold text-base font-serif">
                    {character.name} is considering your question...
                  </p>
                  <div className="flex gap-1">
                    <motion.div 
                      className="w-2 h-2 rounded-full bg-noir-gold"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-noir-gold"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-noir-gold"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-8 py-2">
            <p className="text-noir-blood text-sm text-center">{error}</p>
          </div>
        )}

        {/* Retry button */}
        {showRetry && lastQuestion && (
          <div className="px-8 py-2">
            <motion.button
              onClick={handleRetry}
              className="mx-auto block px-6 py-2 bg-noir-gold/20 border border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 transition-colors text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⟳ Tap to Retry
            </motion.button>
            <p className="text-center text-noir-smoke text-xs mt-2">
              Auto-retrying in 2 seconds...
            </p>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 px-8 pb-6 space-y-4">
          {/* Interrogation Tactics Bar */}
          <div className="flex gap-3 justify-center max-w-4xl mx-auto">
            {/* Ask About Alibi */}
            <motion.button
              onClick={() => {
                setActiveTactic('alibi')
                setInputValue('Where were you at the time of the murder? Give me specific details about your movements.')
              }}
              disabled={isTyping}
              className={`flex-1 px-4 py-3 border-2 transition-all ${
                activeTactic === 'alibi'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-blue-500/50 text-noir-smoke hover:text-blue-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={!isTyping ? { scale: 1.02 } : {}}
              whileTap={!isTyping ? { scale: 0.98 } : {}}
              title="Ask for detailed timeline and movements (+5 pressure)"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">🕐</span>
                <span className="text-xs font-serif">Alibi</span>
              </div>
            </motion.button>

            {/* Present Evidence */}
            <motion.button
              onClick={() => {
                if (collectedEvidence.length === 0) {
                  setWatsonWhisper("You haven't collected any evidence yet, Detective.")
                  return
                }
                setShowEvidencePicker(!showEvidencePicker)
                setShowStatementPicker(false)
              }}
              disabled={isTyping || collectedEvidence.length === 0}
              className={`flex-1 px-4 py-3 border-2 transition-all ${
                showEvidencePicker
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-amber-500/50 text-noir-smoke hover:text-amber-300'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              whileHover={!isTyping && collectedEvidence.length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isTyping && collectedEvidence.length > 0 ? { scale: 0.98 } : {}}
              title="Show collected evidence to the suspect (+15 pressure)"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">📋</span>
                <span className="text-xs font-serif">Present</span>
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
              className={`flex-1 px-4 py-3 border-2 transition-all ${
                showStatementPicker
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-orange-500/50 text-noir-smoke hover:text-orange-300'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
              whileHover={!isTyping && messages.filter(m => m.role === 'character' && m.characterId !== characterId).length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isTyping && messages.filter(m => m.role === 'character' && m.characterId !== characterId).length > 0 ? { scale: 0.98 } : {}}
              title="Confront with another suspect's testimony (+20 pressure)"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">🔄</span>
                <span className="text-xs font-serif">Cross-Ref</span>
              </div>
            </motion.button>

            {/* Bluff */}
            <motion.button
              onClick={() => {
                setActiveTactic('bluff')
                setInputValue('We have evidence that proves you were involved. Want to explain yourself?')
              }}
              disabled={isTyping}
              className={`flex-1 px-4 py-3 border-2 transition-all ${
                activeTactic === 'bluff'
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-noir-charcoal/50 border-noir-slate/50 hover:border-red-500/50 text-noir-smoke hover:text-red-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={!isTyping ? { scale: 1.02 } : {}}
              whileTap={!isTyping ? { scale: 0.98 } : {}}
              title="Lie to provoke a reaction (risky: +10 if close to truth, -5 if wrong)"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">🃏</span>
                <span className="text-xs font-serif">Bluff</span>
              </div>
            </motion.button>
          </div>

          {/* Evidence Picker */}
          <AnimatePresence>
            {showEvidencePicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-noir-charcoal/80 border-2 border-amber-500/50 p-4 rounded">
                  <p className="text-amber-300 text-sm mb-3 font-serif">Select evidence to present:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {collectedEvidence.map((evidence) => {
                      const evidenceData = EVIDENCE_DATABASE[evidence.source]
                      return (
                        <motion.button
                          key={evidence.id}
                          onClick={() => {
                            setSelectedEvidence(evidence.source)
                            setActiveTactic('present_evidence')
                            setInputValue(`[Showing ${evidenceData?.name || 'evidence'}] Explain this.`)
                            setShowEvidencePicker(false)
                          }}
                          className="w-full text-left px-4 py-3 bg-noir-slate/30 border border-noir-slate/50 hover:border-amber-500/50 text-noir-cream hover:text-amber-300 transition-colors"
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <p className="font-semibold text-sm">{evidenceData?.name || 'Evidence'}</p>
                          <p className="text-xs text-noir-smoke mt-1">{evidenceData?.description || evidence.description}</p>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
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
                  <div className="space-y-2 max-h-60 overflow-y-auto">
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
            <div className="flex flex-wrap gap-2 justify-center">
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
                <span className="text-sm font-serif text-noir-cream">
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
          <div className="flex gap-4 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-1 px-6 py-4 bg-noir-charcoal/50 border-2 border-noir-slate/50 focus:border-noir-gold/50 text-noir-cream placeholder-noir-smoke outline-none transition-colors font-serif"
              style={{ fontFamily: 'var(--font-serif)' }}
            />
            <motion.button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="px-8 py-4 bg-noir-gold/20 border-2 border-noir-gold/50 text-noir-gold hover:bg-noir-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif"
              whileHover={inputValue.trim() && !isTyping ? { scale: 1.05 } : {}}
              whileTap={inputValue.trim() && !isTyping ? { scale: 0.95 } : {}}
            >
              Ask
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
