import { motion } from 'framer-motion'
import { useGameStore } from '../../game/state'
import analytics from '../../lib/analytics'

interface ManorMapProps {
  onRoomSelect: (room: string) => void
}

// Room positions on the floor plan (percentage-based)
const ROOM_POSITIONS: Record<string, { x: number; y: number; width: number; height: number }> = {
  'parlor': { x: 10, y: 35, width: 25, height: 30 },
  'study': { x: 10, y: 10, width: 25, height: 20 },
  'dining-room': { x: 40, y: 10, width: 30, height: 30 },
  'hallway': { x: 40, y: 45, width: 30, height: 25 },
  'kitchen': { x: 75, y: 10, width: 20, height: 30 },
  'garden': { x: 75, y: 45, width: 20, height: 25 },
}

const ROOM_LABELS: Record<string, string> = {
  'parlor': 'Parlor',
  'study': 'Study',
  'dining-room': 'Dining Room',
  'hallway': 'Hallway',
  'kitchen': 'Kitchen',
  'garden': 'Garden',
}

export function ManorMap({ onRoomSelect }: ManorMapProps) {
  const { characters, currentRoom } = useGameStore()

  // Get characters in each room
  const getCharactersInRoom = (room: string) => {
    return characters.filter((c) => c.location === room)
  }

  return (
    <div className="fixed inset-0 bg-noir-black flex items-center justify-center p-8">
      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <h1
          className="text-4xl font-serif text-noir-cream tracking-wider"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Ashford Manor
        </h1>
        <p className="text-noir-gold mt-2 text-sm italic">Select a room to investigate</p>
      </div>

      {/* Floor plan container */}
      <div className="relative w-full max-w-4xl aspect-[4/3]">
        {/* Manor outline/background */}
        <div className="absolute inset-0 border-2 border-noir-gold/30 bg-noir-charcoal/50 rounded-lg">
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-noir-gold" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-noir-gold" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-noir-gold" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-noir-gold" />
        </div>

        {/* Rooms */}
        {Object.entries(ROOM_POSITIONS).map(([roomId, pos]) => {
          const isCurrentRoom = currentRoom === roomId
          const charactersHere = getCharactersInRoom(roomId)

          return (
            <motion.button
              key={roomId}
              onClick={() => {
                analytics.roomVisited(roomId, charactersHere.length)
                onRoomSelect(roomId)
              }}
              className="absolute border-2 transition-all"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
                borderColor: isCurrentRoom ? '#c9a227' : '#4a4a4a',
                backgroundColor: isCurrentRoom
                  ? 'rgba(201, 162, 39, 0.15)'
                  : 'rgba(45, 45, 45, 0.3)',
              }}
              whileHover={{
                scale: 1.02,
                borderColor: '#c9a227',
                backgroundColor: 'rgba(201, 162, 39, 0.2)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Room label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <span
                  className="text-noir-cream font-serif text-sm sm:text-base lg:text-lg"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {ROOM_LABELS[roomId]}
                </span>

                {/* Character indicators */}
                {charactersHere.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {charactersHere.map((char) => (
                      <div
                        key={char.id}
                        className="w-2 h-2 rounded-full bg-noir-gold"
                        title={char.name}
                      />
                    ))}
                  </div>
                )}

                {/* Current room indicator */}
                {isCurrentRoom && (
                  <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 rounded-full bg-noir-gold animate-pulse" />
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 text-sm text-noir-smoke">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-noir-gold" />
          <span>Suspect present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-noir-gold bg-noir-gold/15" />
          <span>Current location</span>
        </div>
      </div>
    </div>
  )
}
