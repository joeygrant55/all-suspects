import { useState } from 'react'
import { IntroSequence, CaseBoard, CharacterInterrogation } from './components/FMV'
import { 
  TitleScreen, 
  EvidenceBoard, 
  AccusationModal, 
  TutorialModal, 
  VictoryScreen 
} from './components/UI'
import { WatsonWhisper, WatsonDesk } from './components/Watson'
import { useGameStore } from './game/state'
import { useWatsonStore } from './game/watsonState'
import { useAudioManager, AudioContext } from './hooks/useAudioManager'
import { useVoice, VoiceContext } from './hooks/useVoice'

function App() {
  const {
    gameStarted,
    currentScreen,
    showIntro,
    currentConversation,
    completeIntro,
    startConversation,
    endConversation,
    setCurrentScreen,
    resetGame,
  } = useGameStore()

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

  // Audio manager
  const audioManager = useAudioManager()

  // Voice manager (ElevenLabs)
  const voiceManager = useVoice()

  // Handlers - simplified for CaseBoard flow
  const handleSelectSuspect = (characterId: string) => {
    startConversation(characterId)
    audioManager.playSfx('click')
  }

  const handleCloseInterrogation = () => {
    endConversation()
    setCurrentScreen('map') // Return to case board
    audioManager.playSfx('click')
  }

  // Title screen
  if (!gameStarted) {
    return (
      <AudioContext.Provider value={audioManager}>
        <VoiceContext.Provider value={voiceManager}>
          <TitleScreen />
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

            {/* Character interrogation */}
            {!showIntro && currentScreen === 'interrogation' && currentConversation && (
              <CharacterInterrogation
                characterId={currentConversation}
                onClose={handleCloseInterrogation}
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

          {/* Audio controls */}
          {!showIntro && <AudioControls />}
        </div>
      </VoiceContext.Provider>
    </AudioContext.Provider>
  )
}

// Audio controls component
function AudioControls() {
  const audioManager = useAudioManager()
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
