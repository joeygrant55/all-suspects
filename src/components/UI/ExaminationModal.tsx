import { AnimatePresence, motion } from 'framer-motion'
import type { EvidenceData } from '../../types/evidence'
import { useGameStore } from '../../game/state'

interface ExaminationModalProps {
  evidence: EvidenceData | null
  isOpen: boolean
  onClose: () => void
  isAlreadyCollected: boolean
  onEvidenceCollected?: (evidenceId: string, evidenceName: string, hint?: string) => void
}

export function ExaminationModal({ evidence, isOpen, onClose, isAlreadyCollected, onEvidenceCollected }: ExaminationModalProps) {
  const addEvidence = useGameStore((state) => state.addEvidence)

  if (!evidence) return null

  const handleAddToEvidence = () => {
    addEvidence({
      type: evidence.type,
      description: evidence.name,
      source: evidence.id,
    })
    if (onEvidenceCollected) {
      onEvidenceCollected(evidence.id, evidence.name, evidence.hint)
    }
    onClose()
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'physical':
        return 'PHYSICAL EVIDENCE'
      case 'document':
        return 'DOCUMENT'
      case 'testimony':
        return 'TESTIMONY'
      default:
        return 'EVIDENCE'
    }
  }

  // Highlight relatedCharacter name in description with red underline
  const renderDescription = (text: string) => {
    if (!evidence.relatedCharacter) return text
    // Find character name references - capitalize first letter for matching
    const charName = evidence.relatedCharacter.charAt(0).toUpperCase() + evidence.relatedCharacter.slice(1)
    const parts = text.split(new RegExp(`(${charName})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === evidence.relatedCharacter?.toLowerCase() ? (
        <span key={i} className="border-b-2 border-red-700" style={{ borderBottomStyle: 'solid', paddingBottom: '1px' }}>
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            style={{
              background: 'radial-gradient(ellipse 40% 50% at center 40%, rgba(201,162,39,0.06) 0%, rgba(0,0,0,0.98) 60%, rgba(0,0,0,0.99) 100%)',
            }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-[620px] max-h-[85vh] overflow-hidden rounded-sm"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.5 }}
            style={{
              background: 'linear-gradient(180deg, #1c1816 0%, #0d0b09 100%)',
              boxShadow: '0 0 120px rgba(201,162,39,0.15), 0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)',
              border: '1px solid #2a2420',
            }}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-amber-900/20">
              <div className="flex items-start justify-between">
                <div>
                  {/* Type badge — manila folder tab / case file stamp */}
                  <span
                    className="inline-block text-[10px] font-bold tracking-[0.2em] px-3 py-1 uppercase"
                    style={{
                      background: 'linear-gradient(180deg, #c9a84a 0%, #a8872e 100%)',
                      color: '#1a1408',
                      clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 100%, 0 100%)',
                      fontFamily: '"Courier New", monospace',
                      letterSpacing: '0.15em',
                    }}
                  >
                    {getTypeLabel(evidence.type)}
                  </span>
                  <h2
                    className="text-2xl mt-3 tracking-wide"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      color: '#d4af50',
                      textShadow: '0 0 30px rgba(201,162,39,0.25)',
                    }}
                  >
                    {evidence.name}
                  </h2>
                  <p className="text-xs mt-1 italic" style={{ color: '#7a7060', fontFamily: 'Georgia, serif' }}>
                    {evidence.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors p-1 mt-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Evidence image showcase */}
            <div className="px-6 py-5 border-b border-amber-900/15">
              <motion.div
                className="relative mx-auto overflow-hidden"
                style={{
                  maxWidth: '380px',
                  background: '#0a0806',
                  borderRadius: '2px',
                  padding: '10px',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.5)',
                  border: '1px solid #2a2218',
                }}
                initial={{ filter: 'sepia(100%) brightness(0.7)' }}
                animate={{ filter: 'sepia(0%) brightness(1)' }}
                transition={{ duration: 1.2, delay: 0.3 }}
              >
                {evidence.image ? (
                  <div className="relative">
                    <img
                      src={evidence.image}
                      alt={evidence.name}
                      className="w-full h-52 object-cover"
                      style={{ borderRadius: '1px' }}
                    />
                    {/* Vignette overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                      }}
                    />
                    {/* Aged edge effect */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        boxShadow: 'inset 0 0 20px rgba(139,115,72,0.15), inset 0 0 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                ) : (
                  /* Magnifying glass fallback */
                  <div className="w-full h-52 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, rgba(201,162,39,0.05) 0%, transparent 70%)' }}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#5a4a2a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M16 16l4 4" strokeWidth="2" />
                      <circle cx="11" cy="11" r="3" strokeDasharray="2 2" opacity="0.4" />
                    </svg>
                  </div>
                )}

                {/* Brass photo corners */}
                <div className="absolute top-0 left-0 w-5 h-5" style={{ borderLeft: '2px solid #b8963a', borderTop: '2px solid #b8963a', opacity: 0.7 }} />
                <div className="absolute top-0 right-0 w-5 h-5" style={{ borderRight: '2px solid #b8963a', borderTop: '2px solid #b8963a', opacity: 0.7 }} />
                <div className="absolute bottom-0 left-0 w-5 h-5" style={{ borderLeft: '2px solid #b8963a', borderBottom: '2px solid #b8963a', opacity: 0.7 }} />
                <div className="absolute bottom-0 right-0 w-5 h-5" style={{ borderRight: '2px solid #b8963a', borderBottom: '2px solid #b8963a', opacity: 0.7 }} />
              </motion.div>
            </div>

            {/* Detective's notes description */}
            <motion.div
              className="px-6 py-4 max-h-[240px] overflow-y-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div
                className="p-4 rounded-sm text-sm leading-[1.8] whitespace-pre-line"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  color: '#3a3020',
                  background: `
                    repeating-linear-gradient(
                      to bottom,
                      #f5f0e0 0px,
                      #f5f0e0 27px,
                      #d4c9a8 27px,
                      #d4c9a8 28px
                    )
                  `,
                  backgroundPosition: '0 12px',
                  boxShadow: '2px 3px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.05)',
                  borderLeft: '3px solid #c49a6c',
                }}
              >
                {renderDescription(evidence.detailedDescription)}
              </div>
            </motion.div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-amber-900/20 flex justify-between items-center">
              {evidence.relatedCharacter && (
                <p className="text-xs italic" style={{ color: '#6a5a40', fontFamily: 'Georgia, serif' }}>
                  May be relevant to questioning...
                </p>
              )}
              {!evidence.relatedCharacter && <div />}

              {isAlreadyCollected ? (
                <motion.div
                  className="flex items-center gap-2 px-5 py-2"
                  initial={{ rotate: -3 }}
                  animate={{ rotate: -3 }}
                  style={{
                    border: '2px solid #6b4c2a',
                    color: '#8b6b3a',
                    fontFamily: '"Courier New", monospace',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    letterSpacing: '0.2em',
                    opacity: 0.8,
                    borderRadius: '2px',
                  }}
                >
                  ✓ FILED
                </motion.div>
              ) : (
                <motion.button
                  onClick={handleAddToEvidence}
                  className="relative px-7 py-2.5 font-bold text-sm tracking-[0.15em] uppercase cursor-pointer"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    background: 'radial-gradient(ellipse at center, #8b2020 0%, #5a1515 60%, #3a0a0a 100%)',
                    color: '#f0d8b0',
                    border: '1px solid #6b3030',
                    borderRadius: '50%',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    boxShadow: '0 4px 15px rgba(100,20,20,0.5), inset 0 -2px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,200,200,0.1)',
                    fontSize: '10px',
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(139,32,32,0.6)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  ADD TO
                  <br />
                  EVIDENCE
                </motion.button>
              )}
            </div>

            {/* Brass corner decorations */}
            <div className="absolute top-2 left-2 w-7 h-7 pointer-events-none" style={{ borderLeft: '2px solid rgba(184,150,58,0.4)', borderTop: '2px solid rgba(184,150,58,0.4)' }} />
            <div className="absolute top-2 right-2 w-7 h-7 pointer-events-none" style={{ borderRight: '2px solid rgba(184,150,58,0.4)', borderTop: '2px solid rgba(184,150,58,0.4)' }} />
            <div className="absolute bottom-2 left-2 w-7 h-7 pointer-events-none" style={{ borderLeft: '2px solid rgba(184,150,58,0.4)', borderBottom: '2px solid rgba(184,150,58,0.4)' }} />
            <div className="absolute bottom-2 right-2 w-7 h-7 pointer-events-none" style={{ borderRight: '2px solid rgba(184,150,58,0.4)', borderBottom: '2px solid rgba(184,150,58,0.4)' }} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
