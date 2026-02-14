import { useState } from 'react'
import { useGameStore } from '../../game/state'
import { CharacterPortrait } from './CharacterPortrait'

export function CharacterList() {
  const currentRoom = useGameStore((state) => state.currentRoom)
  const characters = useGameStore((state) => state.characters)
  const startConversation = useGameStore((state) => state.startConversation)
  const currentConversation = useGameStore((state) => state.currentConversation)
  const [isExpanded, setIsExpanded] = useState(true)

  const charactersInRoom = characters.filter((c) => c.location === currentRoom)

  const formatRoomName = (room: string) => {
    return room
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const effectiveExpanded = currentConversation ? isExpanded : true

  if (!effectiveExpanded && currentConversation) {
    return (
      <div className="px-4 py-2 flex items-center justify-between bg-noir-black/30">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-noir-gold rotate-45" />
          <span
            className="text-sm text-noir-gold tracking-wider"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {formatRoomName(currentRoom)}
          </span>
          <span className="text-noir-smoke text-xs">
            ({charactersInRoom.length} {charactersInRoom.length === 1 ? 'suspect' : 'suspects'})
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-noir-smoke hover:text-noir-gold transition-colors p-1"
          title="Show suspects"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-noir-gold rotate-45" />
          <h3
            className="text-sm text-noir-gold tracking-wider"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {formatRoomName(currentRoom)}
          </h3>
        </div>
        {currentConversation && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-noir-smoke hover:text-noir-gold transition-colors p-1"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-xs text-noir-smoke tracking-widest uppercase mb-2">
        {charactersInRoom.length > 0 ? 'Suspects Present' : 'No One Present'}
      </p>

      {charactersInRoom.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-noir-ash text-sm italic">The room is empty...</p>
        </div>
      ) : (
        <div className="flex md:block overflow-x-auto gap-2 pb-1 md:pb-0 no-scrollbar">
          {charactersInRoom.map((character) => {
            const isActive = currentConversation === character.id
            return (
              <button
                key={character.id}
                onClick={() => startConversation(character.id)}
                disabled={isActive}
                className={`w-60 md:w-full shrink-0 md:shrink text-left p-2 rounded-sm transition-all group ${
                  isActive
                    ? 'bg-noir-gold/20 border border-noir-gold'
                    : 'bg-noir-black/30 border border-noir-slate hover:border-noir-gold/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CharacterPortrait
                    characterId={character.id}
                    name={character.name}
                    role={character.role}
                    size="small"
                    isActive={isActive}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${
                        isActive ? 'text-noir-gold' : 'text-noir-cream group-hover:text-noir-gold'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {character.name}
                    </div>
                    <div className="text-xs text-noir-smoke truncate">{character.role}</div>
                  </div>
                  {isActive && (
                    <span className="text-xs text-noir-gold uppercase tracking-wider">Talking</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
