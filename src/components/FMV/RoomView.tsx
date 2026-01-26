import { motion } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from '../UI/CharacterPortrait'

interface RoomViewProps {
  onCharacterSelect: (characterId: string) => void
  onEvidenceSelect?: (evidenceId: string) => void
  onReturnToMap: () => void
}

// Room atmosphere descriptions
const ROOM_ATMOSPHERES: Record<string, { description: string; mood: string }> = {
  parlor: {
    description: 'Velvet drapes and crystal chandeliers. The scent of champagne lingers.',
    mood: 'elegant',
  },
  study: {
    description: 'Dark wood paneling. Books line every wall. A cigar smolders in the ashtray.',
    mood: 'mysterious',
  },
  'dining-room': {
    description: 'A long mahogany table set for twelve. Half-empty wine glasses catch the light.',
    mood: 'formal',
  },
  hallway: {
    description: 'Marble floors echo every footstep. Family portraits watch from the walls.',
    mood: 'eerie',
  },
  kitchen: {
    description: 'Copper pots gleam. The servants entrance looms in shadow.',
    mood: 'utilitarian',
  },
  garden: {
    description: 'Moonlight filters through bare winter branches. Frost covers the stone path.',
    mood: 'cold',
  },
}

// Placeholder for room background colors (will be replaced with actual images/video)
const ROOM_COLORS: Record<string, string> = {
  parlor: 'linear-gradient(180deg, #2a1a1a 0%, #1a0a0a 100%)',
  study: 'linear-gradient(180deg, #1a2a1a 0%, #0a1a0a 100%)',
  'dining-room': 'linear-gradient(180deg, #2a1a0a 0%, #1a0a0a 100%)',
  hallway: 'linear-gradient(180deg, #1a1a2a 0%, #0a0a1a 100%)',
  kitchen: 'linear-gradient(180deg, #2a2a1a 0%, #1a1a0a 100%)',
  garden: 'linear-gradient(180deg, #0a1a2a 0%, #0a0a1a 100%)',
}

export function RoomView({ onCharacterSelect, onReturnToMap }: RoomViewProps) {
  const { currentRoom, characters } = useGameStore()

  const atmosphere = ROOM_ATMOSPHERES[currentRoom] || ROOM_ATMOSPHERES.parlor
  const charactersInRoom = characters.filter((c) => c.location === currentRoom)

  return (
    <div className="fixed inset-0 bg-noir-black">
      {/* Room background */}
      <div
        className="absolute inset-0"
        style={{
          background: ROOM_COLORS[currentRoom] || ROOM_COLORS.parlor,
        }}
      >
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(10,10,10,0.6) 70%, rgba(10,10,10,0.9) 100%)',
          }}
        />
      </div>

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-noir-black letterbox-border" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-noir-black letterbox-border" />

      {/* Back button */}
      <motion.button
        onClick={onReturnToMap}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-noir-charcoal/80 border border-noir-slate hover:border-noir-gold text-noir-cream text-sm font-serif transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← Map
      </motion.button>

      {/* Room title */}
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <h2
          className="text-3xl font-serif text-noir-cream tracking-wider"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {ROOM_ATMOSPHERES[currentRoom]
            ? currentRoom
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            : 'Unknown Room'}
        </h2>
      </div>

      {/* Room description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-20 left-0 right-0 text-center px-8"
      >
        <p className="text-noir-gold text-sm italic max-w-2xl mx-auto">
          {atmosphere.description}
        </p>
      </motion.div>

      {/* Characters in room */}
      {charactersInRoom.length > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center gap-8 px-8">
          {charactersInRoom.map((character, index) => (
            <motion.button
              key={character.id}
              onClick={() => onCharacterSelect(character.id)}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <CharacterPortrait
                characterId={character.id}
                name={character.name}
                role={character.role}
                size="large"
              />
              <div className="mt-4 text-center">
                <p className="text-noir-cream font-serif text-lg">{character.name}</p>
                <p className="text-noir-smoke text-sm italic">{character.role}</p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-noir-smoke italic"
          >
            <p className="text-lg">No one is here...</p>
            <p className="text-sm mt-2">Return to the map to find the suspects.</p>
          </motion.div>
        </div>
      )}

      {/* Evidence hotspots placeholder */}
      {/* TODO: Add interactive evidence hotspots when evidence system is integrated */}
    </div>
  )
}
