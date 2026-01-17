import { useState, useEffect, useCallback } from 'react'
import { ManorScene } from './components/Scene'
import { InterrogationModal } from './components/Chat'
import { Header, CharacterList, TitleScreen, EvidenceBoard, AccusationModal, ExaminationModal, TutorialModal, EvidenceNotification } from './components/UI'
import { useEvidenceNotification } from './components/UI/EvidenceNotification'
import { useGameStore } from './game/state'
import type { EvidenceData } from './components/Scene/InteractiveObject'
import { useAudioManager, AudioContext } from './hooks/useAudioManager'
import { useVoice, VoiceContext } from './hooks/useVoice'

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const currentRoom = useGameStore((state) => state.currentRoom)
  const tutorialSeen = useGameStore((state) => state.tutorialSeen)

  const [evidenceBoardOpen, setEvidenceBoardOpen] = useState(false)
  const [accusationOpen, setAccusationOpen] = useState(false)
  const [examinationOpen, setExaminationOpen] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceData | null>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  // Evidence notification system
  const { notification, showNotification, dismissNotification } = useEvidenceNotification()

  // Show tutorial when game starts if not seen
  useEffect(() => {
    if (gameStarted && !tutorialSeen) {
      setTutorialOpen(true)
    }
  }, [gameStarted, tutorialSeen])

  // Audio manager
  const audioManager = useAudioManager()

  // Voice manager (ElevenLabs)
  const voiceManager = useVoice()

  // Update room ambience when room changes
  useEffect(() => {
    if (gameStarted && currentRoom) {
      audioManager.setRoomAmbience(currentRoom)
    }
  }, [currentRoom, gameStarted, audioManager])

  const handleExamineEvidence = (evidence: EvidenceData) => {
    setSelectedEvidence(evidence)
    setExaminationOpen(true)
    audioManager.playSfx('evidenceFound')
  }

  const handleCloseExamination = () => {
    setExaminationOpen(false)
    setSelectedEvidence(null)
  }

  // Handle evidence collection with notification
  const handleEvidenceCollected = useCallback((evidenceId: string, evidenceName: string, hint?: string) => {
    showNotification(evidenceId, evidenceName, hint || '')
  }, [showNotification])

  // Check if evidence is already collected
  const isEvidenceCollected = selectedEvidence
    ? collectedEvidence.some((e) => e.source === selectedEvidence.id)
    : false

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
        <div className="h-screen w-screen flex flex-col bg-noir-black">
        {/* Header */}
        <Header
          onOpenEvidence={() => {
            setEvidenceBoardOpen(true)
            audioManager.playSfx('click')
          }}
          onAccuse={() => {
            setAccusationOpen(true)
            audioManager.playSfx('click')
          }}
        />

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* 3D Scene - Full width */}
          <div className="flex-1 relative">
            <ManorScene onExamineEvidence={handleExamineEvidence} />

            {/* Controls hint overlay */}
            <div
              className="absolute bottom-4 left-4 pointer-events-none"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <div className="bg-noir-black/80 border border-noir-slate/50 rounded px-4 py-3 text-xs">
                <div className="flex items-center gap-4 text-noir-smoke">
                  {/* Arrow keys */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <span className="w-6 h-6 flex items-center justify-center bg-noir-slate/50 rounded text-noir-cream text-[10px]">▲</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-6 h-6 flex items-center justify-center bg-noir-slate/50 rounded text-noir-cream text-[10px]">◀</span>
                      <span className="w-6 h-6 flex items-center justify-center bg-noir-slate/50 rounded text-noir-cream text-[10px]">▼</span>
                      <span className="w-6 h-6 flex items-center justify-center bg-noir-slate/50 rounded text-noir-cream text-[10px]">▶</span>
                    </div>
                    <span className="text-noir-smoke mt-1">Move</span>
                  </div>
                  <div className="h-10 w-px bg-noir-slate/30" />
                  {/* E to talk */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 h-6 flex items-center justify-center bg-noir-gold/30 border border-noir-gold/50 rounded text-noir-gold text-[10px]">E</span>
                    <span className="text-noir-smoke mt-1">Talk</span>
                  </div>
                  <div className="h-10 w-px bg-noir-slate/30" />
                  {/* F to examine */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 h-6 flex items-center justify-center bg-green-900/50 border border-green-700/50 rounded text-green-400 text-[10px]">F</span>
                    <span className="text-noir-smoke mt-1">Examine</span>
                  </div>
                  <div className="h-10 w-px bg-noir-slate/30" />
                  {/* Mouse to rotate */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-noir-cream text-[10px]">Click + Drag</span>
                    <span className="text-noir-smoke mt-1">Rotate</span>
                  </div>
                  <div className="h-10 w-px bg-noir-slate/30" />
                  {/* Scroll to zoom */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-noir-cream text-[10px]">Scroll</span>
                    <span className="text-noir-smoke mt-1">Zoom</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audio controls */}
            <AudioControls />
          </div>

          {/* Right panel - Character list only (narrower) */}
          <div
            className="w-72 flex flex-col bg-noir-charcoal border-l border-noir-slate"
            onWheel={(e) => e.stopPropagation()}
          >
            <CharacterList />
          </div>
        </div>

        {/* Interrogation Modal - Cinematic overlay */}
        <InterrogationModal />

        {/* Evidence notification toast */}
        <EvidenceNotification
          notification={notification}
          onDismiss={dismissNotification}
        />

        {/* Modals */}
        <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
        <EvidenceBoard isOpen={evidenceBoardOpen} onClose={() => setEvidenceBoardOpen(false)} />
        <AccusationModal isOpen={accusationOpen} onClose={() => setAccusationOpen(false)} />
        <ExaminationModal
          evidence={selectedEvidence}
          isOpen={examinationOpen}
          onClose={handleCloseExamination}
          isAlreadyCollected={isEvidenceCollected}
          onEvidenceCollected={handleEvidenceCollected}
        />
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
      className="absolute bottom-4 right-4"
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
