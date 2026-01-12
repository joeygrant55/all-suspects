import { useState } from 'react'
import { ManorScene } from './components/Scene'
import { ChatPanel } from './components/Chat'
import { Header, CharacterList, TitleScreen, EvidenceBoard, AccusationModal, ExaminationModal } from './components/UI'
import { useGameStore } from './game/state'
import type { EvidenceData } from './components/Scene/InteractiveObject'

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const [evidenceBoardOpen, setEvidenceBoardOpen] = useState(false)
  const [accusationOpen, setAccusationOpen] = useState(false)
  const [examinationOpen, setExaminationOpen] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceData | null>(null)

  const handleExamineEvidence = (evidence: EvidenceData) => {
    setSelectedEvidence(evidence)
    setExaminationOpen(true)
  }

  const handleCloseExamination = () => {
    setExaminationOpen(false)
    setSelectedEvidence(null)
  }

  // Check if evidence is already collected
  const isEvidenceCollected = selectedEvidence
    ? collectedEvidence.some((e) => e.source === selectedEvidence.id)
    : false

  if (!gameStarted) {
    return <TitleScreen />
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-noir-black">
      {/* Header */}
      <Header
        onOpenEvidence={() => setEvidenceBoardOpen(true)}
        onAccuse={() => setAccusationOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - 3D Scene */}
        <div className="flex-1 relative">
          <ManorScene onExamineEvidence={handleExamineEvidence} />
        </div>

        {/* Right panel - Characters + Chat */}
        <div className="w-96 flex flex-col bg-noir-charcoal border-l border-noir-slate">
          {/* Character list */}
          <div className="border-b border-noir-slate">
            <CharacterList />
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Modals */}
      <EvidenceBoard isOpen={evidenceBoardOpen} onClose={() => setEvidenceBoardOpen(false)} />
      <AccusationModal isOpen={accusationOpen} onClose={() => setAccusationOpen(false)} />
      <ExaminationModal
        evidence={selectedEvidence}
        isOpen={examinationOpen}
        onClose={handleCloseExamination}
        isAlreadyCollected={isEvidenceCollected}
      />
    </div>
  )
}

export default App
