import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { EVIDENCE_BY_ROOM } from '../../data/evidence'

interface ManorViewProps {
  onSelectSuspect: (characterId: string) => void
}

// Room metadata
const ROOM_DATA = {
  study: {
    name: 'Study',
    icon: '📚',
    description: 'Crime scene - where Edmund was found',
  },
  parlor: {
    name: 'Parlor',
    icon: '🛋️',
    description: 'The family gathering room',
  },
  'dining-room': {
    name: 'Dining Room',
    icon: '🍽️',
    description: 'The formal dining hall',
  },
  kitchen: {
    name: 'Kitchen',
    icon: '🔪',
    description: 'Servants\' domain',
  },
  hallway: {
    name: 'Hallway',
    icon: '🚪',
    description: 'The main corridor',
  },
  garden: {
    name: 'Garden',
    icon: '⛲',
    description: 'Outside by the fountain',
  },
}

export function ManorView({ onSelectSuspect }: ManorViewProps) {
  const { discoveredEvidenceIds, characters, setCurrentRoom } = useGameStore()
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)

  // Get undiscovered evidence count for a room
  const getUndiscoveredCount = (roomId: string) => {
    const roomEvidence = EVIDENCE_BY_ROOM[roomId] || []
    return roomEvidence.filter(id => !discoveredEvidenceIds.includes(id)).length
  }

  // Check if room is fully explored
  const isRoomComplete = (roomId: string) => {
    return getUndiscoveredCount(roomId) === 0
  }

  // Get characters in a room
  const getCharactersInRoom = (roomId: string) => {
    return characters.filter(c => c.location === roomId)
  }

  // Get portrait image path
  const getPortraitPath = (id: string) => `/portraits/${id}.png`

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Background texture */}
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

      {/* Main manor area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center p-4 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* Section title */}
          <div className="text-center mb-12">
            <h2
              className="text-lg md:text-xl font-serif text-noir-cream/80 tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              — Ashford Manor —
            </h2>
            <p className="text-noir-smoke text-xs italic mt-1">
              Click a room to search for evidence
            </p>
          </div>

          {/* Room grid - 3x2 layout */}
          <div className="grid grid-cols-3 grid-rows-2 gap-3 md:gap-4">
            {Object.entries(ROOM_DATA).map(([id, room], index) => {
              const isHovered = hoveredRoom === id
              const undiscovered = getUndiscoveredCount(id)
              const isComplete = isRoomComplete(id)
              const totalEvidence = (EVIDENCE_BY_ROOM[id] || []).length
              const charactersHere = getCharactersInRoom(id)

              return (
                <motion.button
                  key={id}
                  onClick={() => setCurrentRoom(id)}
                  onMouseEnter={() => setHoveredRoom(id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  className="group relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Room card */}
                  <div 
                    className={`relative bg-noir-charcoal/80 border-2 transition-all duration-300 p-4 md:p-6 aspect-square flex flex-col items-center justify-center ${
                      isHovered 
                        ? 'border-noir-gold shadow-lg shadow-noir-gold/20' 
                        : isComplete
                          ? 'border-green-700/50'
                          : undiscovered > 0
                            ? 'border-noir-gold/40'
                            : 'border-noir-slate/30'
                    }`}
                    style={{
                      transform: isHovered ? 'rotate(-1deg)' : 'rotate(0deg)',
                    }}
                  >
                    {/* Pushpin */}
                    <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-noir-blood border-2 border-noir-blood/50 shadow-lg z-10" />
                    
                    {/* Room icon */}
                    <div 
                      className="text-4xl md:text-6xl mb-2 md:mb-3 transition-transform"
                      style={{
                        textShadow: isHovered ? '0 0 20px rgba(201, 162, 39, 0.5)' : 'none',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {room.icon}
                    </div>
                    
                    {/* Room name */}
                    <h3 
                      className="text-noir-cream font-serif text-sm md:text-base mb-1"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {room.name}
                    </h3>
                    
                    {/* Room description */}
                    <p className="text-noir-smoke text-[10px] md:text-xs italic text-center mb-2">
                      {room.description}
                    </p>

                    {/* Character thumbnails */}
                    {charactersHere.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mb-2">
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
                                target.parentElement!.innerHTML = `<span class="text-xs font-serif text-noir-gold/60 flex items-center justify-center h-full">${character.name.split(' ').map(n => n[0]).join('')}</span>`
                              }}
                            />
                            {/* Hover indicator */}
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
                    {totalEvidence > 0 && (
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
                    {isComplete && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-20">
                        ✓
                      </div>
                    )}

                    {/* Hover instruction */}
                    <AnimatePresence>
                      {isHovered && undiscovered > 0 && (
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
            <span className="font-bold">💡 Watson:</span>{' '}
            {discoveredEvidenceIds.length === 0
              ? "The manor holds many secrets. Search each room carefully for evidence."
              : `You've found ${discoveredEvidenceIds.length} piece${discoveredEvidenceIds.length !== 1 ? 's' : ''} of evidence. Keep searching!`
            }
          </p>
        </motion.div>
      </div>
    </div>
  )
}
