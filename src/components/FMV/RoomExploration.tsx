import { useState, useMemo, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import { EVIDENCE_BY_ROOM, EVIDENCE_DATABASE } from '../../data/evidence'
import { ExaminationModal } from '../UI/ExaminationModal'
import type { EvidenceData } from '../../types/evidence'

// Ashford fallback room backgrounds
const ASHFORD_ROOM_BACKGROUNDS: Record<string, string> = {
  study: '/rooms/study.webp',
  parlor: '/rooms/parlor.webp',
  'dining-room': '/rooms/library.webp',
  kitchen: '/rooms/kitchen.webp',
  hallway: '/rooms/servants.webp',
  garden: '/rooms/garden.webp',
}

type HotspotPosition = { top: string; left: string }

const GRID_COLUMNS = 4
const GRID_ROWS = 3

const ASHFORD_HOTSPOTS: Record<string, Record<string, HotspotPosition>> = {
  study: {
    'threatening-letter': { top: '35%', left: '45%' },
    'champagne-glass': { top: '55%', left: '30%' },
    'body-outline': { top: '65%', left: '50%' },
  },
  parlor: {
    'burnt-photograph': { top: '40%', left: '25%' },
    'victoria-gloves': { top: '60%', left: '70%' },
  },
  'dining-room': {
    'seating-chart': { top: '30%', left: '50%' },
    'spilled-wine': { top: '55%', left: '40%' },
  },
  kitchen: {
    'poison-vial': { top: '45%', left: '35%' },
    'eleanor-apron': { top: '50%', left: '65%' },
  },
  hallway: {
    'grandfather-clock': { top: '40%', left: '50%' },
    'muddy-footprints': { top: '75%', left: '45%' },
  },
  garden: {
    'garden-gate': { top: '35%', left: '70%' },
    'lillian-earring': { top: '60%', left: '30%' },
  },
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function numberFromHash(value: string, salt = ''): number {
  const h = stableHash(`${value}:${salt}`)
  return (h % 1000) / 1000
}

function deterministicPosition(roomId: string, evidenceId: string, reserved: Set<string>): HotspotPosition {
  const key = `${roomId}:${evidenceId}`
  const hash = stableHash(key)
  const initialCell = hash % (GRID_COLUMNS * GRID_ROWS)

  for (let i = 0; i < GRID_COLUMNS * GRID_ROWS; i += 1) {
    const cell = (initialCell + i) % (GRID_COLUMNS * GRID_ROWS)
    const col = cell % GRID_COLUMNS
    const row = Math.floor(cell / GRID_COLUMNS)
    const coord = `${col}-${row}`

    if (!reserved.has(coord)) {
      reserved.add(coord)

      const horizontalWobble = (numberFromHash(key, `x-${cell}`) - 0.5) * 18
      const verticalWobble = (numberFromHash(key, `y-${cell}`) - 0.5) * 12
      const left = Math.min(90, Math.max(6, (col + 0.5) * (100 / GRID_COLUMNS) + horizontalWobble))
      const top = Math.min(88, Math.max(8, (row + 0.5) * (100 / GRID_ROWS) + verticalWobble))
      return { top: `${top.toFixed(1)}%`, left: `${left.toFixed(1)}%` }
    }
  }

  // Fallback if all cells somehow taken.
  return { top: '50%', left: '50%' }
}

type HotspotItem = {
  evidence: EvidenceData
  position: HotspotPosition
}

interface RoomExplorationProps {
  roomId: string
  roomName: string
  onBack: () => void
  onOpenEvidence: () => void
}

export function RoomExploration({ roomId, roomName, onBack, onOpenEvidence }: RoomExplorationProps) {
  const {
    discoveredEvidenceIds,
    markEvidenceDiscovered,
    isEvidenceCollected,
    detectiveVisionActive,
    toggleDetectiveVision,
  } = useGameStore()

  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null)
  const [zoomPoint, setZoomPoint] = useState<{ x: number; y: number } | null>(null)

  const mystery = useMysteryStore((state) => state.activeMystery)
  const isGenerated = mystery?.id && mystery.id !== 'ashford-affair'

  const roomBg = isGenerated
    ? `/generated/${mystery!.id}/assets/rooms/${roomId}.webp`
    : ASHFORD_ROOM_BACKGROUNDS[roomId]

  const evidenceIds = isGenerated
    ? mystery?.evidenceByRoom?.[roomId] || []
    : EVIDENCE_BY_ROOM[roomId] || []

  const evidenceItems = useMemo<HotspotItem[]>(() => {
    const list = (isGenerated
      ? evidenceIds
          .map((id: string) => {
            const ev = mystery?.evidence?.[id]
            return ev || null
          })
          .filter(Boolean) as EvidenceData[]
      : evidenceIds
          .map((id: string) => EVIDENCE_DATABASE[id])
          .filter(Boolean)
    ) as EvidenceData[]

    const usedCells = new Set<string>()
    const roomMap = isGenerated ? undefined : ASHFORD_HOTSPOTS[roomId]

    return list.map((evidence) => ({
      evidence,
      position: roomMap?.[evidence.id]
        ? roomMap[evidence.id]
        : deterministicPosition(roomId, evidence.id, usedCells),
    }))
  }, [evidenceIds, isGenerated, mystery?.id, roomId])

  const particles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, idx) => {
      const base = `${roomId}-${mystery?.id || 'ashford'}-${idx}`
      const size = 1.2 + Math.floor(numberFromHash(base, 'size') * 2.6)
      const left = `${(numberFromHash(base, 'left') * 100).toFixed(1)}%`
      const duration = 6 + Math.floor(numberFromHash(base, 'duration') * 6)
      const delay = numberFromHash(base, 'delay') * 8
      const drift = (numberFromHash(base, 'drift') - 0.5) * 24
      return { size, left, duration, delay, drift }
    })
  }, [roomId, mystery?.id])

  const allDiscovered = evidenceIds.every((id) => discoveredEvidenceIds.includes(id))

  const handleExamine = (evidence: EvidenceData, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    setSelectedEvidence(evidence)
    setActiveHotspotId(null)
    setZoomPoint({ x, y })
    setShowModal(false)

    if (!discoveredEvidenceIds.includes(evidence.id)) {
      markEvidenceDiscovered(evidence.id)
    }
  }

  const handleEvidenceCollected = (_evidenceId: string, _evidenceName: string, hint?: string) => {
    if (hint) {
      // keep behavior consistent; room hint can be handled by modal text
    }
  }

  const watsonHint = useMemo(() => {
    if (allDiscovered) {
      return "You've found everything in this room. Maybe another room hides a new secret."
    }

    const undiscovered = evidenceItems.find((item) => !discoveredEvidenceIds.includes(item.evidence.id))
    if (!undiscovered) {
      return 'Examine each item carefully. The truth is in the details.'
    }

    return 'I spot a faint glint in the room. Tap that spot and investigate.'
  }, [allDiscovered, evidenceItems, discoveredEvidenceIds])

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Full room background */}
      {roomBg ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${roomBg})`,
            filter: 'sepia(0.35) brightness(0.65)',
          }}
        />
      ) : null}

      {/* Atmospheric overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 36%), radial-gradient(ellipse at 80% 15%, rgba(201,162,39,0.18) 0%, transparent 38%)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-noir-black/35" />

      {/* Dust particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle, index) => (
          <motion.div
            key={`${roomId}-particle-${index}`}
            className="absolute rounded-full bg-noir-cream/30"
            initial={{
              y: '110%',
              x: 0,
              opacity: 0,
            }}
            animate={{
              y: ['-10%', '95%'],
              x: [0, particle.drift, 0],
              opacity: [0, 0.6, 0],
            }}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: particle.left,
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-3 py-3 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm text-noir-smoke hover:text-noir-gold transition-colors group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] sm:text-sm">Back to Manor</span>
          </button>

          <h2
            className="text-lg sm:text-2xl text-noir-gold tracking-wide drop-shadow-lg font-serif"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {roomName}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDetectiveVision}
              className={`p-2 border rounded ${
                detectiveVisionActive
                  ? 'border-noir-gold/80 bg-noir-gold/20 text-noir-gold'
                  : 'border-noir-slate/40 bg-noir-charcoal/40 text-noir-smoke hover:text-noir-gold'
              } transition-colors`}
              aria-label="Detective Vision"
              title="Detective Vision"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" strokeWidth={1.8} />
                <path strokeWidth={1.8} d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={onOpenEvidence}
              className="flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/40 backdrop-blur-sm border border-noir-slate/40 hover:border-noir-gold/50 transition-all"
            >
              <span className="text-noir-gold">📋</span>
              <span className="text-noir-cream text-[11px] sm:text-sm">Evidence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discovery surface */}
      <div className="relative z-10 flex-1 min-h-0">
        <div className="absolute inset-0">
          {evidenceItems.map(({ evidence, position }) => {
            const isDiscovered = discoveredEvidenceIds.includes(evidence.id)
            const isCollected = isEvidenceCollected(evidence.id)
            const isActive = activeHotspotId === evidence.id

            return (
              <motion.button
                type="button"
                key={evidence.id}
                onClick={(e) => handleExamine(evidence, e)}
                onMouseEnter={() => setActiveHotspotId(evidence.id)}
                onMouseLeave={() => setActiveHotspotId(null)}
                onTouchStart={() => setActiveHotspotId(evidence.id)}
                className="absolute"
                style={{
                  top: position.top,
                  left: position.left,
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative flex flex-col items-center gap-1">
                  <motion.div
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full border ${
                      isDiscovered
                        ? 'border-noir-gold/50 bg-noir-slate/35'
                        : 'border-noir-gold/60 bg-noir-cream/5'
                    }`}
                    style={{ boxShadow: isDiscovered ? 'none' : '0 0 18px rgba(201, 162, 39, 0.4)' }}
                    animate={
                      !isDiscovered
                        ? {
                            boxShadow: [
                              '0 0 8px rgba(201, 162, 39, 0.2)',
                              detectiveVisionActive
                                ? '0 0 16px rgba(201, 162, 39, 0.7)'
                                : '0 0 8px rgba(201, 162, 39, 0.5)',
                              '0 0 8px rgba(201, 162, 39, 0.2)',
                            ],
                          }
                        : {
                            boxShadow: 'none',
                          }
                    }
                    transition={
                      !isDiscovered
                        ? {
                            duration: detectiveVisionActive ? 1 : 2,
                            repeat: Infinity,
                            repeatType: 'mirror',
                          }
                        : undefined
                    }
                  >
                    {!isDiscovered && (
                      <>
                        <motion.span
                          className="absolute inset-0 rounded-full border border-noir-gold/40"
                          animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0, 0.25] }}
                          transition={{ duration: 2.4, repeat: Infinity }}
                        />
                        <svg className="w-4 h-4 text-noir-gold/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L19 8v10a6 6 0 01-12 0V8l3-3" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14h6m-6-3h6" />
                        </svg>
                      </>
                    )}

                    {isDiscovered && (
                      <span className="text-noir-gold text-sm font-bold">✓</span>
                    )}

                    {isCollected && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-600/90 text-[8px] text-noir-cream flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </motion.div>

                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        key={`label-${evidence.id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="px-2 py-0.5 text-[10px] text-noir-cream rounded-sm border border-noir-gold/35 bg-noir-black/45 backdrop-blur-sm whitespace-nowrap"
                      >
                        {evidence.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Floating status note */}
      <div className="relative z-10 flex-shrink-0 p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-noir-smoke text-xs sm:text-sm text-center italic">
            {allDiscovered ? 'Every clue in this room has been uncovered.' : 'Tap glowing evidence hotspots to investigate.'}
          </p>
          {allDiscovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1 border border-green-600/50 bg-green-900/30 rounded text-green-300"
            >
              <span>✓</span>
              <span className="text-xs">Room complete</span>
            </motion.div>
          )}
          <p className="mt-2 text-[11px] text-noir-cream/80 text-center">Watson: {watsonHint}</p>
        </motion.div>
      </div>

      {/* Zoom lens effect */}
      <AnimatePresence>
        {zoomPoint && (
          <motion.div
            key="room-examine-zoom"
            className="fixed z-40 rounded-full pointer-events-none"
            style={{
              left: zoomPoint.x,
              top: zoomPoint.y,
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(201, 162, 39, 0.6)',
              background: 'radial-gradient(circle, rgba(201,162,39,0.45) 0%, rgba(201,162,39,0.05) 45%, rgba(0,0,0,0) 70%)',
              width: 36,
              height: 36,
            }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: 45,
              opacity: 0,
            }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setZoomPoint(null)
              setShowModal(true)
            }}
          />
        )}
      </AnimatePresence>

      <ExaminationModal
        evidence={selectedEvidence}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
        }}
        isAlreadyCollected={selectedEvidence ? isEvidenceCollected(selectedEvidence.id) : false}
        onEvidenceCollected={handleEvidenceCollected}
      />
    </div>
  )
}
