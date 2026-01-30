/**
 * Dynamic Accusation Panel for Generated Mysteries
 * 
 * Works with any mystery by calling the /api/mystery/:id/accuse endpoint
 * which checks against the blueprint's solution.killerId
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Suspect {
  id: string
  name: string
  role: string
  portraitUrl?: string
}

interface AccusationPanelProps {
  isOpen: boolean
  onClose: () => void
  mysteryId: string
  mysteryTitle: string
  suspects: Suspect[]
  victimName: string
  evidenceCount: number
  onVictory?: (solution: { method: string; motive: string; explanation: string }) => void
}

type Stage = 'review' | 'select' | 'confirm' | 'reveal' | 'result'

export function AccusationPanel({
  isOpen,
  onClose,
  mysteryId,
  mysteryTitle,
  suspects,
  victimName,
  evidenceCount,
  onVictory,
}: AccusationPanelProps) {
  const [stage, setStage] = useState<Stage>('review')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [attempts, setAttempts] = useState(0)
  const [lastHint, setLastHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedSuspect = suspects.find(s => s.id === selectedId)

  const handleAccuse = async () => {
    if (!selectedId) return
    setStage('reveal')
    setLoading(true)

    try {
      const hostname = window.location.hostname
      const res = await fetch(`http://${hostname}:3001/api/mystery/${mysteryId}/accuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspectId: selectedId }),
      })
      const data = await res.json()

      // Dramatic pause
      await new Promise(resolve => setTimeout(resolve, 3000))

      setResult(data)
      setAttempts(a => a + 1)
      if (!data.correct && data.hint) {
        setLastHint(data.hint)
      }
      setStage('result')
    } catch (err) {
      console.error('Accusation failed:', err)
      setStage('select')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStage('review')
    setSelectedId(null)
    setResult(null)
    onClose()
  }

  const handleVictoryClose = () => {
    if (result?.correct && result?.solution && onVictory) {
      onVictory(result.solution)
    }
    handleClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-[750px] max-h-[90vh] overflow-y-auto rounded-sm"
          style={{
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
            boxShadow: '0 0 100px rgba(201, 162, 39, 0.2)',
            border: '2px solid #c9a227',
          }}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-[#c9a227]/30 text-center">
            <h2
              className="text-3xl text-[#c9a227] tracking-widest"
              style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 30px rgba(201, 162, 39, 0.5)' }}
            >
              {stage === 'review' && 'REVIEW YOUR CASE'}
              {stage === 'select' && 'MAKE YOUR ACCUSATION'}
              {stage === 'confirm' && 'CONFIRM ACCUSATION'}
              {stage === 'reveal' && 'THE TRUTH REVEALS ITSELF...'}
              {stage === 'result' && (result?.correct ? '★ CASE SOLVED ★' : 'WRONG ACCUSATION')}
            </h2>
            {attempts > 0 && stage !== 'result' && (
              <p className="text-red-400 text-sm mt-2" style={{ fontFamily: 'Georgia, serif' }}>
                Previous attempts: {attempts}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Review Stage */}
            {stage === 'review' && (
              <>
                <p className="text-center text-[#e8dcc8] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                  You have collected <span className="text-[#c9a227] font-bold">{evidenceCount}</span> pieces of evidence
                  in the investigation of <span className="text-[#c9a227]">{mysteryTitle}</span>.
                </p>

                {lastHint && (
                  <div className="bg-red-900/20 border border-red-800/30 rounded-sm p-4 mb-6">
                    <p className="text-[#e8dcc8] text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                      <span className="text-red-400 font-bold">Investigator's Note:</span>{' '}
                      {lastHint}
                    </p>
                  </div>
                )}

                <p className="text-center text-gray-400 text-sm mb-6 italic" style={{ fontFamily: 'Georgia, serif' }}>
                  Based on your investigation, who murdered {victimName}?
                </p>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 border border-gray-600 text-gray-400 hover:text-[#e8dcc8] hover:border-[#e8dcc8] transition-colors"
                  >
                    Continue Investigating
                  </button>
                  <button
                    onClick={() => setStage('select')}
                    className="px-6 py-3 bg-[#c9a227] text-black hover:bg-[#c9a227]/90 transition-colors font-bold"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    PROCEED TO ACCUSATION
                  </button>
                </div>
              </>
            )}

            {/* Select Stage */}
            {stage === 'select' && (
              <>
                <p className="text-center text-[#e8dcc8] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                  Who murdered {victimName}?
                </p>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {suspects.map((suspect) => (
                    <button
                      key={suspect.id}
                      onClick={() => setSelectedId(suspect.id)}
                      className={`p-4 rounded-sm transition-all ${
                        selectedId === suspect.id
                          ? 'bg-red-900/40 border-2 border-red-600'
                          : 'bg-gray-800/30 border-2 border-transparent hover:border-[#c9a227]/50'
                      }`}
                    >
                      {suspect.portraitUrl ? (
                        <img
                          src={suspect.portraitUrl}
                          alt={suspect.name}
                          className="w-full aspect-square object-cover rounded-sm mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-800 rounded-sm mb-2 flex items-center justify-center text-3xl">
                          🕵️
                        </div>
                      )}
                      <p className={`text-sm font-bold ${
                        selectedId === suspect.id ? 'text-[#c9a227]' : 'text-[#e8dcc8]'
                      }`} style={{ fontFamily: 'Georgia, serif' }}>
                        {suspect.name}
                      </p>
                      <p className="text-xs text-gray-500">{suspect.role}</p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setStage('review')}
                    className="px-6 py-3 border border-gray-600 text-gray-400 hover:text-[#e8dcc8] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => selectedId && setStage('confirm')}
                    disabled={!selectedId}
                    className="px-6 py-3 bg-red-800 text-[#e8dcc8] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    ACCUSE
                  </button>
                </div>
              </>
            )}

            {/* Confirm Stage */}
            {stage === 'confirm' && selectedSuspect && (
              <div className="text-center">
                <p className="text-[#e8dcc8] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                  You are about to accuse:
                </p>
                {selectedSuspect.portraitUrl && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={selectedSuspect.portraitUrl}
                      alt={selectedSuspect.name}
                      className="w-32 h-32 object-cover rounded-sm border-2 border-[#c9a227]"
                    />
                  </div>
                )}
                <p className="text-2xl text-[#c9a227] mb-2" style={{
                  fontFamily: 'Georgia, serif',
                  textShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
                }}>
                  {selectedSuspect.name}
                </p>
                <p className="text-gray-400 italic mb-8">{selectedSuspect.role}</p>
                <p className="text-red-400 text-sm mb-8">
                  This accusation cannot be undone. Are you certain?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setStage('select')}
                    className="px-6 py-3 border border-gray-600 text-gray-400 hover:text-[#e8dcc8] transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleAccuse}
                    className="px-8 py-3 bg-red-800 text-[#e8dcc8] hover:bg-red-700 transition-colors tracking-widest"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    I ACCUSE {selectedSuspect.name.toUpperCase()}
                  </button>
                </div>
              </div>
            )}

            {/* Reveal Stage */}
            {stage === 'reveal' && (
              <div className="text-center py-16">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <p className="text-5xl text-[#c9a227]" style={{
                    fontFamily: 'Georgia, serif',
                    textShadow: '0 0 40px rgba(201, 162, 39, 0.5)',
                  }}>
                    . . .
                  </p>
                </motion.div>
              </div>
            )}

            {/* Result Stage */}
            {stage === 'result' && result && (
              <div className="text-center">
                {result.correct ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-6xl mb-6"
                      style={{ textShadow: '0 0 40px rgba(201, 162, 39, 0.5)' }}
                    >
                      ★
                    </motion.div>
                    <p className="text-2xl text-[#c9a227] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                      Brilliant Detective Work!
                    </p>
                    <p className="text-[#e8dcc8] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                      You correctly identified <span className="text-[#c9a227] font-bold">{result.killerName}</span> as the murderer.
                    </p>
                    {result.solution && (
                      <div className="p-5 bg-gray-800/40 rounded-sm mb-6 text-left max-w-lg mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
                        <p className="text-[#c9a227] text-sm mb-3 tracking-wider">THE TRUTH:</p>
                        {result.solution.motive && (
                          <p className="text-[#e8dcc8] text-sm mb-2">
                            <span className="text-gray-400">Motive:</span> {result.solution.motive}
                          </p>
                        )}
                        {result.solution.method && (
                          <p className="text-[#e8dcc8] text-sm mb-2">
                            <span className="text-gray-400">Method:</span> {result.solution.method}
                          </p>
                        )}
                        {result.solution.explanation && (
                          <p className="text-[#e8dcc8] text-sm mt-3 italic">
                            {result.solution.explanation}
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={handleVictoryClose}
                      className="px-8 py-3 bg-[#c9a227] text-black hover:bg-[#c9a227]/90 transition-colors tracking-widest font-bold"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      CASE CLOSED
                    </button>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-6xl mb-6 text-red-500"
                    >
                      ✗
                    </motion.div>
                    <p className="text-2xl text-red-400 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                      The Wrong Suspect
                    </p>
                    <p className="text-[#e8dcc8] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                      {result.accusedName} was not the killer.
                      <br />
                      <span className="text-gray-400 italic">The real murderer remains free...</span>
                    </p>
                    {result.hint && (
                      <div className="p-4 bg-gray-800/40 rounded-sm mb-6 text-left max-w-md mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
                        <p className="text-[#c9a227] text-sm mb-2">INVESTIGATOR'S INSIGHT:</p>
                        <p className="text-[#e8dcc8] text-sm italic">{result.hint}</p>
                      </div>
                    )}
                    <p className="text-gray-500 text-xs mb-6">Attempt {attempts}</p>
                    <button
                      onClick={handleClose}
                      className="px-8 py-3 bg-[#c9a227] text-black hover:bg-[#c9a227]/90 transition-colors tracking-widest font-bold"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      CONTINUE INVESTIGATING
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-[#c9a227]/50" />
          <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-[#c9a227]/50" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-[#c9a227]/50" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-[#c9a227]/50" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
