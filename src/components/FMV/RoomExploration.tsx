import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { EVIDENCE_BY_ROOM, EVIDENCE_DATABASE } from '../../data/evidence'
import { ExaminationModal } from '../UI/ExaminationModal'
import type { EvidenceData } from '../../types/evidence'

interface RoomExplorationProps {
  roomId: string
  roomName: string
  onBack: () => void
  onOpenEvidence: () => void
}

export function RoomExploration({ roomId, roomName, onBack, onOpenEvidence }: RoomExplorationProps) {
  const { discoveredEvidenceIds, markEvidenceDiscovered, isEvidenceCollected } = useGameStore()
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [watsonHint, setWatsonHint] = useState<string | null>(null)

  // Get evidence items in this room
  const evidenceIds = EVIDENCE_BY_ROOM[roomId] || []
  const evidenceItems = evidenceIds.map(id => EVIDENCE_DATABASE[id]).filter(Boolean)

  // Handle examining an evidence item
  const handleExamine = (evidence: EvidenceData) => {
    setSelectedEvidence(evidence)
    setShowModal(true)
    
    // Mark as discovered when examined
    if (!discoveredEvidenceIds.includes(evidence.id)) {
      markEvidenceDiscovered(evidence.id)
    }
  }

  // Handle evidence collected notification
  const handleEvidenceCollected = (_evidenceId: string, _evidenceName: string, hint?: string) => {
    if (hint) {
      setWatsonHint(hint)
      // Clear hint after 5 seconds
      setTimeout(() => setWatsonHint(null), 5000)
    }
  }

  // Check if all evidence in this room has been discovered
  const allDiscovered = evidenceIds.every(id => discoveredEvidenceIds.includes(id))

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #1a1510 0%, #0d0a08 50%, #1a1510 100%)',
        }}
      />
      
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Header with back button */}
      <div className="relative z-10 px-4 py-3 border-b border-noir-gold/20 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-noir-smoke hover:text-noir-gold transition-colors group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Manor</span>
          </button>
          
          <h2 
            className="text-xl md:text-2xl font-serif text-noir-gold tracking-wide"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {roomName}
          </h2>
          
          <button
            onClick={onOpenEvidence}
            className="flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/50 border border-noir-slate/50 hover:border-noir-gold/50 transition-all"
          >
            <span className="text-noir-gold">📋</span>
            <span className="text-noir-cream text-sm">Evidence</span>
          </button>
        </div>
      </div>

      {/* Room exploration area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center p-4 overflow-hidden">
        <div className="max-w-3xl mx-auto w-full">
          
          {/* Room status */}
          <div className="text-center mb-6">
            <p className="text-noir-smoke text-sm italic">
              {allDiscovered 
                ? "You've thoroughly searched this room."
                : "Click on items to examine them closely..."
              }
            </p>
            {allDiscovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded"
              >
                <span className="text-green-400 text-lg">✓</span>
                <span className="text-green-300 text-sm">Room Complete</span>
              </motion.div>
            )}
          </div>

          {/* Evidence items grid */}
          {evidenceItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evidenceItems.map((evidence, index) => {
                const isDiscovered = discoveredEvidenceIds.includes(evidence.id)
                const isCollected = isEvidenceCollected(evidence.id)
                const isHovered = hoveredItem === evidence.id

                return (
                  <motion.button
                    key={evidence.id}
                    onClick={() => handleExamine(evidence)}
                    onMouseEnter={() => setHoveredItem(evidence.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="group relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Evidence card */}
                    <div 
                      className={`relative bg-noir-charcoal/80 border-2 transition-all duration-300 p-4 ${
                        isHovered
                          ? 'border-noir-gold shadow-lg shadow-noir-gold/30'
                          : isDiscovered
                            ? 'border-noir-gold/30'
                            : 'border-noir-gold/60 animate-pulse'
                      }`}
                      style={{
                        minHeight: '180px',
                      }}
                    >
                      {/* Glowing effect for undiscovered items */}
                      {!isDiscovered && (
                        <motion.div
                          className="absolute inset-0 border-2 border-noir-gold"
                          animate={{
                            opacity: [0.3, 0.7, 0.3],
                            boxShadow: [
                              '0 0 10px rgba(201, 162, 39, 0.3)',
                              '0 0 20px rgba(201, 162, 39, 0.6)',
                              '0 0 10px rgba(201, 162, 39, 0.3)',
                            ],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}

                      {/* Item icon */}
                      <div 
                        className="text-4xl mb-3 text-center"
                        style={{
                          filter: isDiscovered ? 'none' : 'brightness(1.3)',
                          textShadow: isDiscovered ? 'none' : '0 0 15px rgba(201, 162, 39, 0.8)',
                        }}
                      >
                        {evidence.type === 'document' && '📄'}
                        {evidence.type === 'physical' && '🔍'}
                      </div>

                      {/* Item name */}
                      <h3 
                        className={`font-serif text-sm md:text-base mb-2 text-center ${
                          isDiscovered ? 'text-noir-cream' : 'text-noir-gold'
                        }`}
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {evidence.name}
                      </h3>

                      {/* Item description */}
                      <p className="text-noir-smoke text-xs text-center italic">
                        {evidence.description}
                      </p>

                      {/* Status badges */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {isCollected && (
                          <div className="w-5 h-5 bg-green-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">✓</span>
                          </div>
                        )}
                        {!isDiscovered && (
                          <div className="w-5 h-5 bg-noir-gold rounded-full flex items-center justify-center animate-pulse">
                            <span className="text-noir-black text-xs font-bold">!</span>
                          </div>
                        )}
                      </div>

                      {/* Hover instruction */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 bottom-2 text-center"
                          >
                            <span className="text-noir-gold text-xs">
                              Click to examine
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-noir-smoke text-lg italic">
                This room appears empty...
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Watson hint - dynamic based on evidence collected */}
      <div className="relative z-20 flex-shrink-0 p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-100/95 px-3 py-2 shadow-lg max-w-2xl mx-auto md:mx-0 md:ml-4"
          style={{
            transform: 'rotate(-1deg)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <p className="text-amber-900 text-xs">
            <span className="font-bold">💡 Watson:</span>{' '}
            {watsonHint || (
              allDiscovered
                ? "You've found everything here. Perhaps check the other rooms?"
                : evidenceItems.some(e => !discoveredEvidenceIds.includes(e.id))
                  ? "I see something glowing... investigate it closely."
                  : "Examine each item carefully. The devil is in the details."
            )}
          </p>
        </motion.div>
      </div>

      {/* Examination Modal */}
      <ExaminationModal
        evidence={selectedEvidence}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isAlreadyCollected={selectedEvidence ? isEvidenceCollected(selectedEvidence.id) : false}
        onEvidenceCollected={handleEvidenceCollected}
      />
    </div>
  )
}
