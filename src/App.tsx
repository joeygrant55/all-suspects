import { useState, useEffect, useCallback, useContext } from 'react'
import { IntroSequence, CaseBoard, CharacterInterrogation } from './components/FMV'
import { IntroVideo } from './components/VideoPlayer/IntroVideo'
import { RoomExploration } from './components/FMV/RoomExploration'
import { 
  TitleScreen,
  MysterySelect,
  MysteryCreator,
  MysteryLoading,
  EvidenceBoard, 
  AccusationModal, 
  TutorialModal, 
  VictoryScreen,
  EvidenceNotification,
  useEvidenceNotification,
} from './components/UI'
import { WatsonWhisper, WatsonDesk } from './components/Watson'
import { useGameStore } from './game/state'
import { useMysteryStore } from './game/mysteryState'
import { useWatsonStore } from './game/watsonState'
import { useAudioManager, AudioContext } from './hooks/useAudioManager'
import { useVoice, VoiceContext } from './hooks/useVoice'
import { useScoreTracking } from './hooks/useScoreTracking'
import { EVIDENCE_DATABASE } from './data/evidence'

function App() {
  const {
    gameStarted,
    currentScreen,
    showIntro,
    currentConversation,
    currentRoom,
    characters,
    collectedEvidence,
    completeIntro,
    startConversation,
    endConversation,
    setCurrentScreen,
    resetGame,
  } = useGameStore()

  const [mysterySelectOpen, setMysterySelectOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [loadingMysteryId, setLoadingMysteryId] = useState<string | null>(null)
  const [blueprintPreview, setBlueprintPreview] = useState<{
    title: string; setting?: string; era?: string; suspectCount?: number
  } | null>(null)

  // Reset mystery select when game is reset
  useEffect(() => {
    if (!gameStarted) {
      setMysterySelectOpen(false)
      setCreatorOpen(false)
      setLoadingMysteryId(null)
      setBlueprintPreview(null)
    }
  }, [gameStarted])

  // Watson state
  const {
    currentWhisper,
    isWhisperActive,
    isDeskOpen,
    activeTab,
    dismissWhisper,
    closeDesk,
    expandToDesk,
    setActiveTab,
  } = useWatsonStore()

  const [evidenceBoardOpen, setEvidenceBoardOpen] = useState(false)
  const [accusationOpen, setAccusationOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [victoryOpen, setVictoryOpen] = useState(false)
  const [showCharacterIntro, setShowCharacterIntro] = useState<string | null>(null)
  const [seenIntros, setSeenIntros] = useState<Set<string>>(new Set())

  // Audio manager
  const audioManager = useAudioManager()

  // Voice manager (ElevenLabs)
  const voiceManager = useVoice()

  // Play jazz ambient music on title screen and case board
  useEffect(() => {
    if (!gameStarted || currentScreen === 'map') {
      audioManager.playMusic()
    } else if (currentScreen === 'interrogation' || currentScreen === 'room') {
      // Keep music playing but it's managed by the hook's volume
    }
  }, [gameStarted, currentScreen])

  // Set room ambience based on current room when exploring
  useEffect(() => {
    if (currentScreen === 'room') {
      audioManager.setRoomAmbience(currentRoom)
    } else {
      audioManager.setRoomAmbience(null)
    }
  }, [currentScreen, currentRoom])
  
  // Score tracking (wires game events to score store)
  useScoreTracking()
  
  // Evidence notification system
  const { notification, showNotification, dismissNotification } = useEvidenceNotification()
  
  // Watch for new evidence and show notifications
  useEffect(() => {
    if (collectedEvidence.length > 0) {
      const latestEvidence = collectedEvidence[collectedEvidence.length - 1]
      const evidenceData = EVIDENCE_DATABASE[latestEvidence.source]
      
      if (evidenceData) {
        showNotification(
          latestEvidence.source,
          evidenceData.name,
          evidenceData.hint || ''
        )
        audioManager.playSfx('evidenceFound')
      }
    }
  }, [collectedEvidence.length]) // Only trigger when count changes

  // Handlers - simplified for CaseBoard flow
  const handleSelectSuspect = (characterId: string) => {
    audioManager.playSfx('click')
    // Show intro video first time, then go straight to interrogation
    audioManager.playSfx('doorOpen')
    if (!seenIntros.has(characterId)) {
      setShowCharacterIntro(characterId)
    } else {
      audioManager.playSfx('conversationStart')
      startConversation(characterId)
    }
  }

  const handleIntroComplete = useCallback(() => {
    if (showCharacterIntro) {
      setSeenIntros(prev => new Set(prev).add(showCharacterIntro))
      audioManager.playSfx('conversationStart')
      startConversation(showCharacterIntro)
      setShowCharacterIntro(null)
    }
  }, [showCharacterIntro, startConversation, audioManager])

  const handleCloseInterrogation = () => {
    endConversation()
    setCurrentScreen('map') // Return to case board
    audioManager.playSfx('click')
  }

  const handleCloseRoom = () => {
    setCurrentScreen('map') // Return to case board
    audioManager.playSfx('click')
  }

  // Room name mapping
  const getRoomName = (roomId: string) => {
    const roomNames: Record<string, string> = {
      study: 'Study',
      parlor: 'Parlor',
      'dining-room': 'Dining Room',
      kitchen: 'Kitchen',
      hallway: 'Hallway',
      garden: 'Garden',
    }
    return roomNames[roomId] || roomId
  }

  // Handle mystery generation flow
  const handleGenerateMystery = async (config: { era: string; difficulty: 'easy' | 'medium' | 'hard'; theme?: string }) => {
    setCreatorOpen(false)
    setLoadingMysteryId(null)
    setBlueprintPreview(null)

    try {
      const API_BASE = 'http://localhost:3001'
      const res = await fetch(`${API_BASE}/api/mystery/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (data.mysteryId) {
        setLoadingMysteryId(data.mysteryId)
        // Blueprint comes with the response — set it immediately
        if (data.blueprint) {
          setBlueprintPreview({
            title: data.blueprint.title,
            setting: data.blueprint.setting?.location || data.blueprint.setting,
            era: data.blueprint.era,
            suspectCount: data.blueprint.characters?.length,
          })
        }
        // Also try polling in case the blueprint wasn't in the response
        const pollBlueprint = async () => {
          try {
            const bpRes = await fetch(`${API_BASE}/api/mystery/${data.mysteryId}/blueprint`)
            if (bpRes.ok) {
              const bp = await bpRes.json()
              if (bp && bp.title) {
                setBlueprintPreview({
                  title: bp.title,
                  setting: bp.setting?.location,
                  era: bp.era,
                  suspectCount: bp.characters?.length,
                })
                return true
              }
            }
          } catch { /* retry */ }
          return false
        }
        // Poll every 2s until blueprint ready
        const interval = setInterval(async () => {
          const done = await pollBlueprint()
          if (done) clearInterval(interval)
        }, 2000)
        // Also try immediately
        await pollBlueprint()
      }
    } catch (err) {
      console.error('Failed to generate mystery:', err)
      setCreatorOpen(true) // go back to creator on error
    }
  }

  const initializeFromMystery = useGameStore((s) => s.initializeFromMystery)
  const startGame = useGameStore((s) => s.startGame)

  const handleEnterGeneratedMystery = async () => {
    if (!loadingMysteryId) return
    try {
      await useMysteryStore.getState().loadMystery(loadingMysteryId)
      const mystery = useMysteryStore.getState().activeMystery
      if (mystery) {
        initializeFromMystery(mystery)
        startGame()
      }
    } catch (err) {
      console.error('Failed to enter mystery:', err)
    }
  }

  // Title screen and mystery selection
  if (!gameStarted) {
    return (
      <AudioContext.Provider value={audioManager}>
        <VoiceContext.Provider value={voiceManager}>
          {loadingMysteryId ? (
            <MysteryLoading
              mysteryId={loadingMysteryId}
              blueprint={blueprintPreview}
              onEnter={handleEnterGeneratedMystery}
            />
          ) : creatorOpen ? (
            <MysteryCreator
              onGenerate={handleGenerateMystery}
              onBack={() => setCreatorOpen(false)}
            />
          ) : mysterySelectOpen ? (
            <MysterySelect onCreateNew={() => { setMysterySelectOpen(false); setCreatorOpen(true) }} />
          ) : (
            <TitleScreen onNewGame={() => setMysterySelectOpen(true)} />
          )}
        </VoiceContext.Provider>
      </AudioContext.Provider>
    )
  }

  return (
    <AudioContext.Provider value={audioManager}>
      <VoiceContext.Provider value={voiceManager}>
        <div className="h-screen w-screen bg-noir-black">
          {/* Main game screens */}
          <div className="h-full relative">
            {/* Intro sequence */}
            {showIntro && currentScreen === 'intro' && (
              <IntroSequence onComplete={completeIntro} />
            )}

            {/* Case Board - main hub */}
            {!showIntro && currentScreen === 'map' && (
              <CaseBoard
                onSelectSuspect={handleSelectSuspect}
                onOpenEvidence={() => {
                  setEvidenceBoardOpen(true)
                  audioManager.playSfx('click')
                }}
                onAccuse={() => {
                  setAccusationOpen(true)
                  audioManager.playSfx('click')
                }}
              />
            )}

            {/* Character intro video */}
            {showCharacterIntro && (() => {
              const char = characters.find(c => c.id === showCharacterIntro)
              return char ? (
                <IntroVideo
                  characterId={showCharacterIntro}
                  characterName={char.name}
                  characterRole={char.role}
                  onComplete={handleIntroComplete}
                  onSkip={handleIntroComplete}
                />
              ) : null
            })()}

            {/* Character interrogation */}
            {!showIntro && !showCharacterIntro && currentScreen === 'interrogation' && currentConversation && (
              <CharacterInterrogation
                characterId={currentConversation}
                onClose={handleCloseInterrogation}
              />
            )}

            {/* Room exploration */}
            {!showIntro && currentScreen === 'room' && (
              <RoomExploration
                roomId={currentRoom}
                roomName={getRoomName(currentRoom)}
                onBack={handleCloseRoom}
                onOpenEvidence={() => {
                  setEvidenceBoardOpen(true)
                  audioManager.playSfx('click')
                }}
              />
            )}
          </div>

          {/* Watson Whisper - subtle hints overlay (pointer-events handled by component) */}
          {!showIntro && isWhisperActive && (
            <WatsonWhisper
              hint={currentWhisper}
              isActive={isWhisperActive}
              onDismiss={dismissWhisper}
              onExpandToDesk={expandToDesk}
            />
          )}

          {/* Watson Desk - full investigation interface */}
          {!showIntro && (
            <WatsonDesk
              isOpen={isDeskOpen}
              onClose={closeDesk}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenChat={(characterId, _suggestedQuestion) => {
                startConversation(characterId)
                // TODO: Pass suggested question to interrogation if provided
              }}
            />
          )}

          {/* Modals */}
          <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
          <EvidenceBoard isOpen={evidenceBoardOpen} onClose={() => setEvidenceBoardOpen(false)} />
          <AccusationModal
            isOpen={accusationOpen}
            onClose={() => setAccusationOpen(false)}
            onVictory={() => setVictoryOpen(true)}
          />
          <VictoryScreen
            isOpen={victoryOpen}
            onClose={() => setVictoryOpen(false)}
            onPlayAgain={() => {
              setVictoryOpen(false)
              resetGame()
            }}
          />
          
          {/* Evidence notification - appears when evidence is collected */}
          <EvidenceNotification
            notification={notification}
            onDismiss={dismissNotification}
          />

          {/* Audio controls */}
          {!showIntro && <AudioControls />}
        </div>
      </VoiceContext.Provider>
    </AudioContext.Provider>
  )
}

// Audio controls component
function AudioControls() {
  const audioManager = useContext(AudioContext)!
  const voiceManager = useVoice()
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="absolute bottom-4 right-4 z-20"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div className="bg-noir-black/80 border border-noir-slate/50 rounded p-2">
        {/* Toggle button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-noir-cream text-xs hover:text-noir-gold transition-colors"
        >
          <span className="text-lg">{audioManager.musicEnabled ? '🔊' : '🔇'}</span>
          <span>Audio</span>
          {voiceManager.isLoading && (
            <span className="w-2 h-2 bg-noir-gold rounded-full animate-pulse" />
          )}
        </button>

        {/* Expanded controls */}
        {expanded && (
          <div className="mt-3 space-y-2 min-w-40">
            {/* Voice toggle (ElevenLabs) */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-noir-smoke">Voice</span>
              <button
                onClick={voiceManager.toggleVoice}
                className={`w-10 h-5 rounded-full transition-colors ${
                  voiceManager.voiceEnabled ? 'bg-noir-gold' : 'bg-noir-slate'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-noir-cream transition-transform ${
                    voiceManager.voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Music toggle */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-noir-smoke">Music</span>
              <button
                onClick={audioManager.toggleMusic}
                className={`w-10 h-5 rounded-full transition-colors ${
                  audioManager.musicEnabled ? 'bg-noir-gold' : 'bg-noir-slate'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-noir-cream transition-transform ${
                    audioManager.musicEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Ambience toggle */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-noir-smoke">Ambience</span>
              <button
                onClick={audioManager.toggleAmbience}
                className={`w-10 h-5 rounded-full transition-colors ${
                  audioManager.ambienceEnabled ? 'bg-noir-gold' : 'bg-noir-slate'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-noir-cream transition-transform ${
                    audioManager.ambienceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* SFX toggle */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-noir-smoke">SFX</span>
              <button
                onClick={audioManager.toggleSfx}
                className={`w-10 h-5 rounded-full transition-colors ${
                  audioManager.sfxEnabled ? 'bg-noir-gold' : 'bg-noir-slate'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-noir-cream transition-transform ${
                    audioManager.sfxEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Master volume */}
            <div className="pt-2 border-t border-noir-slate/30">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-noir-smoke">Volume</span>
                <span className="text-noir-cream">{Math.round(audioManager.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioManager.masterVolume * 100}
                onChange={(e) => audioManager.setMasterVolume(Number(e.target.value) / 100)}
                className="w-full h-1 bg-noir-slate rounded-lg appearance-none cursor-pointer accent-noir-gold"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
