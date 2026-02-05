import { useState } from 'react'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from './CharacterPortrait'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import analytics from '../../lib/analytics'

interface AccusationModalProps {
  isOpen: boolean
  onClose: () => void
  onVictory?: () => void
}

type AccusationStage = 'summary' | 'select' | 'confirm' | 'reveal' | 'result'

export function AccusationModal({ isOpen, onClose, onVictory }: AccusationModalProps) {
  const characters = useGameStore((state) => state.characters)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const accusationAttempts = useGameStore((state) => state.accusationAttempts)
  const lastWrongAccusation = useGameStore((state) => state.lastWrongAccusation)
  const recordAccusationAttempt = useGameStore((state) => state.recordAccusationAttempt)

  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null)
  const [stage, setStage] = useState<AccusationStage>('summary')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // Thomas Ashford is the killer (from characters.ts)
  const KILLER_ID = 'thomas'

  // Get evidence-based hints for wrong accusations
  const getWrongAccusationHint = (wrongId: string): string => {
    const hints: Record<string, string> = {
      victoria: 'Victoria was in the parlor during the critical time. The evidence points to someone who had direct access to the study.',
      eleanor: 'Eleanor left the study at 11 PM. Consider who was seen with Edmund later that evening.',
      marcus: 'Dr. Webb arrived late and had limited access. The killer needed time alone with Edmund.',
      lillian: 'Lillian was in the garden most of the night. Someone inside the manor is responsible.',
      james: 'James discovered the body, but the evidence suggests a family motive, not servitude.',
    }
    return hints[wrongId] || 'Review your evidence carefully. Who had the strongest motive and opportunity?'
  }

  // Calculate suspicion for each character based on evidence
  const calculateSuspicion = (characterId: string): number => {
    let suspicion = 0
    collectedEvidence.forEach((e) => {
      const evidenceData = EVIDENCE_DATABASE[e.source]
      if (evidenceData?.pointsTo === characterId) suspicion += 2
      if (evidenceData?.relatedCharacter === characterId) suspicion += 1
    })
    return suspicion
  }

  const handleSuspectSelect = (id: string) => {
    setSelectedSuspect(id)
  }

  const handleConfirmAccusation = () => {
    setStage('confirm')
  }

  const handleFinalAccusation = () => {
    setStage('reveal')
    // Dramatic delay before showing result
    setTimeout(() => {
      const correct = selectedSuspect === KILLER_ID
      setIsCorrect(correct)
      recordAccusationAttempt(selectedSuspect!, correct)
      
      // Track accusation
      analytics.accusationMade(selectedSuspect!, correct, accusationAttempts + 1)
      
      if (correct) {
        // Track game completion
        analytics.gameCompleted(true, selectedSuspect!, {
          questionsAsked: undefined, // Could get from state if tracked
          suspectsInterrogated: characters.length, // Approximate
          evidenceCollected: collectedEvidence.length,
          accusationAttempts: accusationAttempts + 1
        })
      }
      
      setStage('result')
    }, 3000)
  }

  const handleClose = () => {
    setSelectedSuspect(null)
    setStage('summary')
    setIsCorrect(null)
    onClose()
  }

  const handleProceedToSelect = () => {
    setStage('select')
  }

  const selectedCharacter = characters.find((c) => c.id === selectedSuspect)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div
        className="relative w-[700px] max-h-[90vh] rounded-sm overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
          boxShadow: '0 0 100px rgba(201, 162, 39, 0.2)',
          border: '2px solid #c9a227',
        }}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-noir-gold/30 text-center">
          <h2
            className="text-3xl text-noir-gold tracking-widest"
            style={{
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 30px rgba(201, 162, 39, 0.5)',
            }}
          >
            {stage === 'summary' && 'REVIEW YOUR EVIDENCE'}
            {stage === 'select' && 'MAKE YOUR ACCUSATION'}
            {stage === 'confirm' && 'CONFIRM ACCUSATION'}
            {stage === 'reveal' && 'THE TRUTH REVEALS ITSELF...'}
            {stage === 'result' && (isCorrect ? 'CASE SOLVED' : 'WRONG ACCUSATION')}
          </h2>
          {accusationAttempts > 0 && stage !== 'result' && (
            <p className="text-noir-blood text-sm mt-2" style={{ fontFamily: 'Georgia, serif' }}>
              Previous attempts: {accusationAttempts}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Summary stage - Review evidence before accusing */}
          {stage === 'summary' && (
            <>
              <p className="text-center text-noir-cream mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                Before making your accusation, review the evidence you've collected.
              </p>

              {/* Evidence summary */}
              <div className="bg-noir-slate/20 border border-noir-slate/50 rounded-sm p-4 mb-6 max-h-60 overflow-y-auto">
                <h4 className="text-noir-gold text-sm mb-3 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
                  COLLECTED EVIDENCE ({collectedEvidence.length}/5)
                </h4>
                {collectedEvidence.length === 0 ? (
                  <p className="text-noir-smoke text-sm italic">No evidence collected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collectedEvidence.map((evidence) => {
                      const evidenceData = EVIDENCE_DATABASE[evidence.source]
                      return (
                        <div key={evidence.id} className="flex items-start gap-2 text-sm">
                          <span className="text-noir-gold">•</span>
                          <div>
                            <span className="text-noir-cream">{evidenceData?.name || evidence.description}</span>
                            {evidenceData?.hint && (
                              <span className="text-noir-smoke italic ml-2">— {evidenceData.hint}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Suspect suspicion summary */}
              <div className="bg-noir-slate/20 border border-noir-slate/50 rounded-sm p-4 mb-6">
                <h4 className="text-noir-gold text-sm mb-3 tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
                  SUSPICION LEVELS
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {characters
                    .map((char) => ({ ...char, suspicion: calculateSuspicion(char.id) }))
                    .sort((a, b) => b.suspicion - a.suspicion)
                    .map((char) => (
                      <div key={char.id} className="flex items-center justify-between text-sm">
                        <span className="text-noir-cream">{char.name}</span>
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`w-2 h-1.5 rounded-sm ${
                                i < char.suspicion ? 'bg-noir-blood' : 'bg-noir-slate/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Previous wrong accusation hint */}
              {lastWrongAccusation && (
                <div className="bg-noir-blood/10 border border-noir-blood/30 rounded-sm p-4 mb-6">
                  <p className="text-noir-cream text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                    <span className="text-noir-blood font-bold">Investigator's Note:</span>{' '}
                    {getWrongAccusationHint(lastWrongAccusation)}
                  </p>
                </div>
              )}

              <p className="text-center text-noir-smoke text-sm mb-6 italic" style={{ fontFamily: 'Georgia, serif' }}>
                Based on your investigation, who murdered Edmund Ashford?
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-noir-slate text-noir-smoke hover:text-noir-cream hover:border-noir-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToSelect}
                  className="px-6 py-3 bg-noir-gold text-noir-black hover:bg-noir-gold/90 transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  PROCEED TO ACCUSATION
                </button>
              </div>
            </>
          )}

          {/* Select stage */}
          {stage === 'select' && (
            <>
              <p className="text-center text-noir-cream mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                Who murdered Edmund Ashford?
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => handleSuspectSelect(character.id)}
                    className={`p-4 rounded-sm transition-all ${
                      selectedSuspect === character.id
                        ? 'bg-noir-blood/30 border-2 border-noir-blood'
                        : 'bg-noir-slate/30 border-2 border-transparent hover:border-noir-gold/50'
                    }`}
                  >
                    <CharacterPortrait
                      characterId={character.id}
                      name={character.name}
                      role={character.role}
                      size="small"
                      isActive={selectedSuspect === character.id}
                    />
                    <p
                      className={`mt-2 text-sm ${
                        selectedSuspect === character.id ? 'text-noir-gold' : 'text-noir-cream'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {character.name}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-noir-slate text-noir-smoke hover:text-noir-cream hover:border-noir-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAccusation}
                  disabled={!selectedSuspect}
                  className="px-6 py-3 bg-noir-blood text-noir-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-noir-blood/80 transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  ACCUSE
                </button>
              </div>
            </>
          )}

          {/* Confirm stage */}
          {stage === 'confirm' && selectedCharacter && (
            <div className="text-center">
              <p className="text-noir-cream mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                You are about to accuse:
              </p>
              <div className="flex justify-center mb-6">
                <CharacterPortrait
                  characterId={selectedCharacter.id}
                  name={selectedCharacter.name}
                  role={selectedCharacter.role}
                  size="large"
                  isActive={true}
                />
              </div>
              <p
                className="text-2xl text-noir-gold mb-2"
                style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 20px rgba(201, 162, 39, 0.3)' }}
              >
                {selectedCharacter.name}
              </p>
              <p className="text-noir-smoke italic mb-8">{selectedCharacter.role}</p>
              <p className="text-noir-blood text-sm mb-8">
                This accusation is final. Are you certain?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStage('select')}
                  className="px-6 py-3 border border-noir-slate text-noir-smoke hover:text-noir-cream hover:border-noir-cream transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinalAccusation}
                  className="px-8 py-3 bg-noir-blood text-noir-cream hover:bg-noir-blood/80 transition-colors tracking-widest"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  I ACCUSE {selectedCharacter.name.toUpperCase()}
                </button>
              </div>
            </div>
          )}

          {/* Reveal stage - dramatic animation */}
          {stage === 'reveal' && (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <p
                  className="text-4xl text-noir-gold"
                  style={{
                    fontFamily: 'Georgia, serif',
                    textShadow: '0 0 40px rgba(201, 162, 39, 0.5)',
                  }}
                >
                  ...
                </p>
              </div>
            </div>
          )}

          {/* Result stage */}
          {stage === 'result' && (
            <div className="text-center">
              {isCorrect ? (
                <>
                  <div
                    className="text-6xl mb-6"
                    style={{ textShadow: '0 0 40px rgba(201, 162, 39, 0.5)' }}
                  >
                    <span className="text-noir-gold">&#9733;</span>
                  </div>
                  <p
                    className="text-2xl text-noir-gold mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Brilliant Detective Work!
                  </p>
                  <p className="text-noir-cream mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                    You correctly identified Thomas Ashford as the murderer.
                  </p>
                  <div
                    className="p-4 bg-noir-slate/30 rounded mb-6 text-left max-w-md mx-auto"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    <p className="text-noir-gold text-sm mb-2">THE TRUTH:</p>
                    <p className="text-noir-cream text-sm">
                      Thomas Ashford, desperate after discovering his inheritance was to be revoked,
                      poisoned his father's champagne during the New Year's toast. His gambling debts
                      had left him no other choice—or so he believed.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="text-6xl mb-6"
                    style={{ textShadow: '0 0 40px rgba(114, 47, 55, 0.5)' }}
                  >
                    <span className="text-noir-blood">&#10007;</span>
                  </div>
                  <p
                    className="text-2xl text-noir-blood mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    The Wrong Suspect
                  </p>
                  <p className="text-noir-cream mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                    {selectedCharacter?.name} was not the killer.
                    <br />
                    The real murderer remains free...
                  </p>
                  {/* Investigative hint */}
                  <div
                    className="p-4 bg-noir-slate/30 rounded mb-6 text-left max-w-md mx-auto"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    <p className="text-noir-gold text-sm mb-2">INVESTIGATOR'S INSIGHT:</p>
                    <p className="text-noir-cream text-sm italic">
                      {selectedSuspect ? getWrongAccusationHint(selectedSuspect) : ''}
                    </p>
                  </div>
                  <p className="text-noir-smoke text-xs mb-6">
                    Attempt {accusationAttempts} — You may try again.
                  </p>
                </>
              )}
              <button
                onClick={() => {
                  if (isCorrect && onVictory) {
                    onVictory()
                  }
                  handleClose()
                }}
                className="px-8 py-3 bg-noir-gold text-noir-black hover:bg-noir-gold/90 transition-colors tracking-widest"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {isCorrect ? 'VIEW CASE SUMMARY' : 'CONTINUE INVESTIGATING'}
              </button>
            </div>
          )}
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-noir-gold/50" />
        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-noir-gold/50" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-noir-gold/50" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-noir-gold/50" />
      </div>
    </div>
  )
}
