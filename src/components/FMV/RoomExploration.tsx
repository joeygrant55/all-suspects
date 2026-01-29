import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { EVIDENCE_BY_ROOM, EVIDENCE_DATABASE } from '../../data/evidence'
import { ExaminationModal } from '../UI/ExaminationModal'
import type { EvidenceData } from '../../types/evidence'

// Room background image mapping
const ROOM_BACKGROUNDS: Record<string, string> = {
  study: '/rooms/study.webp',
  parlor: '/rooms/parlor.webp',
  'dining-room': '/rooms/library.webp',
  kitchen: '/rooms/kitchen.webp',
  hallway: '/rooms/servants.webp',
  garden: '/rooms/garden.webp',
}

// Fallback icons when no evidence image exists
function EvidenceIcon({ type }: { type: string }) {
  if (type === 'document') {
    return (
      <svg className="w-12 h-12 text-noir-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h10" />
      </svg>
    )
  }
  return (
    <svg className="w-12 h-12 text-noir-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

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

  const roomBg = ROOM_BACKGROUNDS[roomId]

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
      setTimeout(() => setWatsonHint(null), 5000)
    }
  }

  // Check if all evidence in this room has been discovered
  const allDiscovered = evidenceIds.every(id => discoveredEvidenceIds.includes(id))

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Room background image */}
      {roomBg && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${roomBg})`,
            opacity: 0.55,
            filter: 'sepia(0.4) brightness(0.7)',
          }}
        />
      )}

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Desk lamp spotlight (top-right corner) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 85% 15%, rgba(201,162,39,0.08) 0%, transparent 40%)',
        }}
      />

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Floating dust particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-noir-cream/20"
            style={{
              width: `${1.5 + Math.random() * 2}px`,
              height: `${1.5 + Math.random() * 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30 - Math.random() * 40, 0],
              x: [0, (Math.random() - 0.5) * 20, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Header with back button — semi-transparent */}
      <div className="relative z-10 px-4 py-3 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
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
            className="text-xl md:text-2xl font-serif text-noir-gold tracking-wide drop-shadow-lg"
            style={{ fontFamily: 'var(--font-serif)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
          >
            {roomName}
          </h2>
          
          <button
            onClick={onOpenEvidence}
            className="flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/40 backdrop-blur-sm border border-noir-slate/40 hover:border-noir-gold/50 transition-all"
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
            <p className="text-noir-smoke text-sm italic" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              {allDiscovered 
                ? "You've thoroughly searched this room."
                : "Click on items to examine them closely..."
              }
            </p>
            {allDiscovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700/50 rounded backdrop-blur-sm"
              >
                <span className="text-green-400 text-lg">✓</span>
                <span className="text-green-300 text-sm">Room Complete</span>
              </motion.div>
            )}
          </div>

          {/* Evidence items grid */}
          {evidenceItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className="group relative text-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.12 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Evidence card — aged paper style */}
                    <div 
                      className="relative overflow-hidden transition-all duration-300"
                      style={{
                        minHeight: '200px',
                        background: isHovered
                          ? 'linear-gradient(145deg, rgba(62,50,30,0.95) 0%, rgba(40,32,18,0.95) 100%)'
                          : 'linear-gradient(145deg, rgba(50,40,24,0.85) 0%, rgba(32,25,14,0.85) 100%)',
                        border: isHovered
                          ? '1.5px solid rgba(201,162,39,0.7)'
                          : isDiscovered
                            ? '1.5px solid rgba(201,162,39,0.2)'
                            : '1.5px solid rgba(201,162,39,0.45)',
                        boxShadow: isHovered
                          ? '0 8px 32px rgba(201,162,39,0.25), inset 0 1px 0 rgba(201,162,39,0.15)'
                          : !isDiscovered
                            ? '0 0 16px rgba(201,162,39,0.15)'
                            : '0 4px 12px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        // Torn edge effect via clip-path
                        clipPath: 'polygon(0% 2%, 3% 0%, 8% 1.5%, 15% 0%, 22% 1%, 30% 0.5%, 38% 0%, 45% 1%, 52% 0%, 60% 1.5%, 68% 0%, 75% 0.5%, 82% 1.5%, 90% 0%, 95% 1%, 100% 0%, 100% 98%, 97% 100%, 92% 98.5%, 85% 100%, 78% 99%, 70% 100%, 62% 98.5%, 55% 100%, 48% 99%, 40% 100%, 32% 98.5%, 25% 100%, 18% 99%, 10% 100%, 5% 99%, 0% 100%)',
                      }}
                    >
                      {/* Golden glow pulse for undiscovered */}
                      {!isDiscovered && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          animate={{
                            opacity: [0.05, 0.15, 0.05],
                          }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            background: 'radial-gradient(ellipse at center, rgba(201,162,39,0.3) 0%, transparent 70%)',
                          }}
                        />
                      )}

                      {/* Evidence image or icon */}
                      <div className="p-4 pb-2">
                        {evidence.image ? (
                          <div
                            className="w-full h-24 bg-cover bg-center rounded-sm mb-3 transition-all duration-500"
                            style={{
                              backgroundImage: `url(${evidence.image})`,
                              filter: isHovered ? 'sepia(0) brightness(1)' : 'sepia(0.6) brightness(0.85)',
                              border: '1px solid rgba(201,162,39,0.15)',
                            }}
                          />
                        ) : (
                          <div className="flex justify-center mb-3 py-2">
                            <div
                              className="transition-all duration-300"
                              style={{
                                filter: isHovered ? 'brightness(1.4) drop-shadow(0 0 8px rgba(201,162,39,0.6))' : 'brightness(0.9)',
                              }}
                            >
                              <EvidenceIcon type={evidence.type} />
                            </div>
                          </div>
                        )}

                        {/* Item name */}
                        <h3 
                          className={`font-serif text-sm md:text-base mb-1.5 ${
                            isHovered ? 'text-noir-gold' : isDiscovered ? 'text-noir-cream/90' : 'text-noir-gold/90'
                          } transition-colors duration-300`}
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          {evidence.name}
                        </h3>

                        {/* Item description */}
                        <p className="text-noir-smoke/70 text-xs italic leading-relaxed">
                          {evidence.description}
                        </p>
                      </div>

                      {/* "Examined" stamp for discovered items */}
                      {isDiscovered && (
                        <div
                          className="absolute top-3 right-3 pointer-events-none"
                          style={{
                            transform: 'rotate(-12deg)',
                          }}
                        >
                          <div
                            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                            style={{
                              color: 'rgba(180,80,60,0.7)',
                              border: '1.5px solid rgba(180,80,60,0.5)',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-serif)',
                            }}
                          >
                            Examined
                          </div>
                        </div>
                      )}

                      {/* Undiscovered badge */}
                      {!isDiscovered && (
                        <motion.div
                          className="absolute top-3 right-3"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <div className="w-5 h-5 bg-noir-gold rounded-full flex items-center justify-center shadow-lg shadow-noir-gold/40">
                            <span className="text-noir-black text-xs font-bold">!</span>
                          </div>
                        </motion.div>
                      )}

                      {/* Collected check */}
                      {isCollected && (
                        <div className="absolute top-3 left-3">
                          <div className="w-5 h-5 bg-green-700/80 rounded-full flex items-center justify-center">
                            <span className="text-white text-[10px]">✓</span>
                          </div>
                        </div>
                      )}

                      {/* Hover instruction */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 bottom-3 text-center"
                          >
                            <span className="text-noir-gold/80 text-xs tracking-wide">
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
              <p className="text-noir-smoke text-lg italic" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                This room appears empty...
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Watson hint */}
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
