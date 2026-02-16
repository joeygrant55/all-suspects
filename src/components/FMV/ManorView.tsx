import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import { EVIDENCE_BY_ROOM } from '../../data/evidence'

interface ManorViewProps {
  onSelectSuspect: (characterId: string) => void
}

// Fallback room images for Ashford Affair
const ASHFORD_ROOM_IMAGES: Record<string, string> = {
  study: '/rooms/study.webp',
  parlor: '/rooms/parlor.webp',
  'dining-room': '/rooms/library.webp',
  kitchen: '/rooms/kitchen.webp',
  hallway: '/rooms/servants.webp',
  garden: '/rooms/garden.webp',
}

const ASHFORD_ROOM_DATA: Record<string, { name: string; description: string }> = {
  study: { name: 'Study', description: 'Crime scene - where Edmund was found' },
  parlor: { name: 'Parlor', description: 'The family gathering room' },
  'dining-room': { name: 'Dining Room', description: 'The formal dining hall' },
  kitchen: { name: 'Kitchen', description: "Servants' domain" },
  hallway: { name: 'Hallway', description: 'The main corridor' },
  garden: { name: 'Garden', description: 'Outside by the fountain' },
}

const LOCKED_ROOM_TOAST = 'Explore other rooms first — you need more evidence'

const getUnlockedRoomCount = (evidenceCount: number, roomCount: number) => {
  if (evidenceCount <= 0) return 1
  if (evidenceCount <= 2) return Math.min(2, roomCount)
  if (evidenceCount <= 4) return Math.min(3, roomCount)
  if (evidenceCount <= 6) return Math.min(4, roomCount)
  return roomCount
}

export function ManorView({ onSelectSuspect }: ManorViewProps) {
  const { discoveredEvidenceIds, characters, setCurrentRoom } = useGameStore()
  const mystery = useMysteryStore.getState().activeMystery
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const [lockToast, setLockToast] = useState('')
  const [newlyUnlockedRoomIds, setNewlyUnlockedRoomIds] = useState<string[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unlockedRef = useRef<string[]>([])
  const hasMountedRef = useRef(false)

  // Build room data from mystery blueprint or fall back to Ashford
  const isGenerated = mystery?.id && mystery.id !== 'ashford-affair'

  const rooms: Array<{ id: string; name: string; description: string; image: string }> = (() => {
    if (isGenerated && mystery?.rooms) {
      const locations = mystery.locations || []
      const roomIds = mystery.rooms || []
      return roomIds.map(roomId => {
        const loc = locations.find((l: { id: string }) => l.id === roomId)
        return {
          id: roomId,
          name: loc?.name || roomId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: loc?.description || '',
          image: `/generated/${mystery.id}/assets/rooms/${roomId}.webp`,
        }
      })
    }

    const ashfordRoomIds = Object.keys(ASHFORD_ROOM_DATA)
    return ashfordRoomIds.map((id) => ({
      id,
      name: ASHFORD_ROOM_DATA[id].name,
      description: ASHFORD_ROOM_DATA[id].description,
      image: ASHFORD_ROOM_IMAGES[id] || '',
    }))
  })()

  // Evidence mapping — use mystery data or Ashford fallback
  const getEvidenceByRoom = (roomId: string): string[] => {
    if (isGenerated && mystery?.evidenceByRoom) {
      return mystery.evidenceByRoom[roomId] || []
    }
    return EVIDENCE_BY_ROOM[roomId] || []
  }

  const getUndiscoveredCount = (roomId: string) => {
    const roomEvidence = getEvidenceByRoom(roomId)
    return roomEvidence.filter(id => !discoveredEvidenceIds.includes(id)).length
  }

  const isRoomComplete = (roomId: string) => {
    return getUndiscoveredCount(roomId) === 0
  }

  const getCharactersInRoom = (roomId: string) => {
    return characters.filter(c => c.location === roomId)
  }

  const getPortraitPath = (id: string) => {
    if (isGenerated) {
      return `/generated/${mystery!.id}/assets/portraits/${id}.png`
    }
    return `/portraits/${id}.png`
  }

  const unlockedRoomCount = getUnlockedRoomCount(discoveredEvidenceIds.length, rooms.length)
  const unlockedRoomIds = rooms.slice(0, Math.min(unlockedRoomCount, rooms.length)).map((room) => room.id)

  useEffect(() => {
    const nextIds = unlockedRoomIds

    if (!hasMountedRef.current) {
      unlockedRef.current = nextIds
      hasMountedRef.current = true
      setNewlyUnlockedRoomIds([])
      return
    }

    const newlyUnlocked = nextIds.filter((roomId) => !unlockedRef.current.includes(roomId))
    unlockedRef.current = nextIds
    setNewlyUnlockedRoomIds(newlyUnlocked)

    const pulseTimer = setTimeout(() => {
      setNewlyUnlockedRoomIds([])
    }, 1000)

    return () => {
      clearTimeout(pulseTimer)
    }
  }, [unlockedRoomIds.join('|')])

  const showLockedToast = () => {
    setLockToast(LOCKED_ROOM_TOAST)

    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }

    toastTimer.current = setTimeout(() => {
      setLockToast('')
      toastTimer.current = null
    }, 1800)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    }
  }, [])

  // Location/manor name
  const manorName = mystery?.worldState?.location || 'Ashford Manor'

  // Grid columns based on room count
  const gridCols = rooms.length <= 4 ? 'grid-cols-2' : rooms.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'

  const allRoomsUnlocked = unlockedRoomCount >= rooms.length

  const hintText = discoveredEvidenceIds.length === 0
    ? 'Start your investigation at the crime scene.'
    : allRoomsUnlocked
      ? 'All rooms are accessible. Leave no stone unturned!'
      : 'Keep searching — new rooms will open as you uncover more clues.'

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Manor exterior background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/ui/manor-exterior.png)',
          opacity: 0.3,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Floor plan texture overlay */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/ui/manor-floorplan.png)',
          backgroundSize: 'contain',
          opacity: 0.15,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Main manor area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center p-4 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full">

          {/* Section title — dynamic */}
          <div className="text-center mb-12">
            <h2
              className="text-lg md:text-xl font-serif text-noir-cream/80 tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              — {manorName} —
            </h2>
            <p className="text-noir-smoke text-xs italic mt-1">
              {lockToast || 'Click a room to search for evidence'}
            </p>
          </div>

          {/* Room grid — dynamic layout */}
          <div className={`grid ${gridCols} gap-3 md:gap-4`}>
            {rooms.map((room, index) => {
              const isUnlocked = unlockedRoomIds.includes(room.id)
              const isLocked = !isUnlocked
              const isNewlyUnlocked = newlyUnlockedRoomIds.includes(room.id)
              const undiscovered = getUndiscoveredCount(room.id)
              const isComplete = isRoomComplete(room.id)
              const totalEvidence = getEvidenceByRoom(room.id).length
              const charactersHere = getCharactersInRoom(room.id)

              return (
                <motion.button
                  key={room.id}
                  layout
                  layoutId={`room-card-${room.id}`}
                  onClick={() => {
                    if (isLocked) {
                      showLockedToast()
                      return
                    }
                    setCurrentRoom(room.id)
                  }}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  className="group relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isNewlyUnlocked ? [1, 1.03, 1] : 1,
                    boxShadow: isNewlyUnlocked
                      ? ['0 0 0px rgba(201, 162, 39, 0)', '0 0 35px rgba(201, 162, 39, 0.7)', '0 0 0px rgba(201, 162, 39, 0)']
                      : 'none',
                  }}
                  transition={{ delay: index * 0.08, duration: isNewlyUnlocked ? 1 : 0.3, times: isNewlyUnlocked ? [0, 0.3, 1] : undefined }}
                  whileHover={isLocked ? undefined : { scale: 1.03 }}
                  whileTap={isLocked ? undefined : { scale: 0.97 }}
                  style={{ pointerEvents: isLocked ? 'auto' : 'auto' }}
                >
                  {/* Room card */}
                  <div
                    className={`relative overflow-hidden border-2 transition-all duration-300 p-3 md:p-4 aspect-square flex flex-col items-center justify-center ${
                      isLocked
                        ? 'border-noir-gold/20 bg-noir-black/50'
                        : isComplete
                          ? 'border-green-700/50'
                          : undiscovered > 0
                            ? 'border-noir-gold/40'
                            : 'border-noir-slate/30'
                    }`}
                    style={{
                      background: 'linear-gradient(180deg, rgba(26,21,16,0.9) 0%, rgba(13,10,8,0.95) 100%)',
                      transform: !isLocked && hoveredRoom === room.id ? 'rotate(-1deg)' : 'rotate(0deg)',
                    }}
                  >
                    {/* Unlock pulse overlay for newly unlocked room */}
                    <AnimatePresence>
                      {isNewlyUnlocked && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.35, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1 }}
                          style={{
                            background: 'radial-gradient(circle at center, rgba(201, 162, 39, 0.5) 0%, rgba(201, 162, 39, 0) 65%)',
                            zIndex: 5,
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Darkness overlay for locked rooms */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-noir-black/80 z-10" />
                    )}

                    {/* Pushpin */}
                    {!isLocked && <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-noir-blood border-2 border-noir-blood/50 shadow-lg z-20" />}

                    {/* Room image thumbnail */}
                    <div
                      className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 mb-2 md:mb-3 flex-shrink-0 transition-all duration-300"
                      style={{
                        borderColor: isLocked
                          ? 'rgba(201, 162, 39, 0.35)'
                          : hoveredRoom === room.id
                            ? 'rgba(201, 162, 39, 0.8)'
                            : 'rgba(201, 162, 39, 0.3)',
                        boxShadow: hoveredRoom === room.id ? '0 0 15px rgba(201, 162, 39, 0.3)' : 'none',
                      }}
                    >
                      <img
                        src={room.image}
                        alt={room.name}
                        className="w-full h-full object-cover transition-all duration-300"
                        style={{
                          filter: isLocked
                            ? 'brightness(0.15) grayscale(1) blur(2px)'
                            : hoveredRoom === room.id
                              ? 'sepia(0.2) contrast(1.1) brightness(1.1)'
                              : 'sepia(0.5) contrast(1.05) brightness(0.8)',
                        }}
                        onError={(e) => {
                          // Fallback to a dark placeholder if image not generated yet
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 rounded-lg" style={{
                        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6)',
                      }} />
                    </div>

                    {/* Lock icon */}
                    {isLocked && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="text-noir-gold text-3xl md:text-4xl drop-shadow-[0_0_8px_rgba(201,162,39,0.7)]">🔒</div>
                      </div>
                    )}

                    {/* Room name */}
                    <h3
                      className={`font-serif text-sm md:text-base mb-0.5 transition-colors duration-300 text-center ${
                        isLocked ? 'text-noir-gold/70' : 'text-noir-cream'
                      }`}
                      style={{
                        fontFamily: 'var(--font-serif)',
                        color: isLocked ? '#9f7d26' : hoveredRoom === room.id
                          ? '#c9a227'
                          : undefined,
                        textShadow: hoveredRoom === room.id ? '0 0 10px rgba(201, 162, 39, 0.4)' : 'none',
                      }}
                    >
                      {room.name}
                    </h3>

                    {/* Room description */}
                    <p
                      className="text-noir-smoke text-[10px] md:text-xs italic text-center mb-1.5 transition-opacity duration-300 line-clamp-2"
                      style={{ opacity: hoveredRoom === room.id ? 1 : isLocked ? 0.7 : 0.5 }}
                    >
                      {isLocked ? '🔒 Discover more evidence to unlock' : room.description}
                    </p>

                    {/* Character thumbnails */}
                    {charactersHere.length > 0 && !isLocked && (
                      <div className="flex flex-wrap gap-1 justify-center mb-1.5">
                        {charactersHere.map((character) => (
                          <button
                            key={character.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectSuspect(character.id)
                            }}
                            className="group/char relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-noir-gold/50 hover:border-noir-gold overflow-hidden bg-noir-charcoal transition-all hover:scale-110"
                            title={`Talk to ${character.name}`}
                          >
                            <img
                              src={getPortraitPath(character.id)}
                              alt={character.name}
                              className="w-full h-full object-cover object-top filter sepia-[0.3] contrast-[1.1]"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.parentElement!.innerHTML = `<span class="text-xs font-serif text-noir-gold/60 flex items-center justify-center h-full">${character.name.split(' ').map((n: string) => n[0]).join('')}</span>`
                              }}
                            />
                            <div className="absolute inset-0 bg-noir-gold/0 group-hover/char:bg-noir-gold/20 transition-all flex items-center justify-center">
                              <span className="text-[8px] md:text-[10px] text-noir-cream opacity-0 group-hover/char:opacity-100 transition-opacity">
                                Talk
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Evidence counter */}
                    {!isLocked && totalEvidence > 0 && (
                      <div className={`mt-auto px-2 py-1 text-xs rounded ${
                        isComplete
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : undiscovered > 0
                            ? 'bg-noir-gold/20 text-noir-gold border border-noir-gold/30'
                            : 'bg-noir-slate/20 text-noir-smoke border border-noir-slate/30'
                      }`}>
                        {isComplete ? (
                          <span className="flex items-center gap-1">
                            <span>✓</span>
                            <span>All found</span>
                          </span>
                        ) : (
                          <span>{undiscovered} clue{undiscovered !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    )}

                    {/* Complete checkmark */}
                    {!isLocked && isComplete && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-20">
                        ✓
                      </div>
                    )}

                    {/* Hover instruction */}
                    <AnimatePresence>
                      {hoveredRoom === room.id && undiscovered > 0 && !isLocked && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute -bottom-6 left-0 right-0 text-center"
                        >
                          <span className="text-noir-gold text-xs">
                            Click to search →
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Watson hint */}
      <div className="relative z-20 flex-shrink-0 p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-100/95 px-3 py-2 shadow-lg max-w-md mx-auto md:mx-0 md:ml-4"
          style={{
            transform: 'rotate(-1deg)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <p className="text-amber-900 text-xs">
            <span className="font-bold">💡 Watson:</span> {hintText}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
