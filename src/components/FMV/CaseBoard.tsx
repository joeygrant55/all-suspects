import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'

interface CaseBoardProps {
  onSelectSuspect: (characterId: string) => void
  onOpenEvidence: () => void
  onAccuse: () => void
}

// Suspect card positions on the board (percentage-based for responsiveness)
const SUSPECT_POSITIONS = [
  { id: 'victoria', x: 15, y: 20 },
  { id: 'thomas', x: 50, y: 15 },
  { id: 'eleanor', x: 85, y: 20 },
  { id: 'marcus', x: 15, y: 55 },
  { id: 'lillian', x: 50, y: 60 },
  { id: 'james', x: 85, y: 55 },
]

export function CaseBoard({ onSelectSuspect, onOpenEvidence, onAccuse }: CaseBoardProps) {
  const { characters, collectedEvidence, contradictions, accusationUnlocked } = useGameStore()
  const [hoveredSuspect, setHoveredSuspect] = useState<string | null>(null)

  // Get portrait image path
  const getPortraitPath = (id: string) => `/portraits/${id}.png`

  // Get character by ID
  const getCharacter = (id: string) => characters.find(c => c.id === id)

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden">
      {/* Cork board background texture */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #1a1510 0%, #0d0a08 50%, #1a1510 100%)',
        }}
      />
      
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-noir-gold/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 
              className="text-2xl font-serif text-noir-gold tracking-wide"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              THE ASHFORD CASE
            </h1>
            <p className="text-noir-smoke text-sm mt-1">New Year's Eve, 1929</p>
          </div>
          
          {/* Progress indicators */}
          <div className="flex items-center gap-6">
            <button
              onClick={onOpenEvidence}
              className="flex items-center gap-2 px-4 py-2 bg-noir-charcoal/50 border border-noir-slate/50 hover:border-noir-gold/50 transition-colors"
            >
              <span className="text-noir-gold">📋</span>
              <span className="text-noir-cream text-sm">
                Evidence: {collectedEvidence.length}/5
              </span>
            </button>
            
            {contradictions.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-noir-blood/20 border border-noir-blood/30">
                <span className="text-noir-blood">⚡</span>
                <span className="text-noir-cream text-sm">
                  {contradictions.length} Contradiction{contradictions.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <motion.button
              onClick={onAccuse}
              disabled={!accusationUnlocked}
              className={`px-6 py-2 font-serif tracking-wide transition-all ${
                accusationUnlocked
                  ? 'bg-noir-gold text-noir-black hover:bg-noir-cream'
                  : 'bg-noir-slate/30 text-noir-smoke cursor-not-allowed'
              }`}
              whileHover={accusationUnlocked ? { scale: 1.05 } : {}}
              whileTap={accusationUnlocked ? { scale: 0.95 } : {}}
            >
              {accusationUnlocked ? 'MAKE ACCUSATION' : 'GATHER MORE EVIDENCE'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main case board area */}
      <div className="relative z-10 flex-1 p-8">
        <div className="max-w-6xl mx-auto h-full">
          
          {/* Section title */}
          <div className="text-center mb-8">
            <h2 
              className="text-xl font-serif text-noir-cream/80 tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              — Suspects —
            </h2>
            <p className="text-noir-smoke text-sm mt-2 italic">
              Click a suspect to begin interrogation
            </p>
          </div>

          {/* Suspect grid */}
          <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
            {SUSPECT_POSITIONS.map(({ id }, index) => {
              const character = getCharacter(id)
              if (!character) return null

              const isHovered = hoveredSuspect === id
              const hasContradiction = contradictions.some(
                c => c.statement1.characterId === id || c.statement2.characterId === id
              )

              return (
                <motion.button
                  key={id}
                  onClick={() => onSelectSuspect(id)}
                  onMouseEnter={() => setHoveredSuspect(id)}
                  onMouseLeave={() => setHoveredSuspect(null)}
                  className="group relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Suspect card */}
                  <div 
                    className={`relative bg-noir-charcoal/80 border-2 transition-all duration-300 ${
                      isHovered 
                        ? 'border-noir-gold shadow-lg shadow-noir-gold/20' 
                        : hasContradiction
                          ? 'border-noir-blood/50'
                          : 'border-noir-slate/30'
                    }`}
                    style={{
                      transform: isHovered ? 'rotate(-1deg)' : 'rotate(0deg)',
                    }}
                  >
                    {/* Pushpin */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-noir-blood border-2 border-noir-blood/50 shadow-lg z-10" />
                    
                    {/* Photo area */}
                    <div className="aspect-[3/4] bg-gradient-to-br from-noir-slate/50 to-noir-charcoal overflow-hidden">
                      <img 
                        src={getPortraitPath(id)}
                        alt={character.name}
                        className="w-full h-full object-cover object-top filter sepia-[0.3] contrast-[1.1]"
                        onError={(e) => {
                          // Fallback to initials if image fails
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.parentElement!.innerHTML = `<span class="text-4xl font-serif text-noir-gold/60 flex items-center justify-center h-full">${character.name.split(' ').map(n => n[0]).join('')}</span>`
                        }}
                      />
                    </div>
                    
                    {/* Info strip */}
                    <div className="p-4 bg-noir-black/50">
                      <h3 
                        className="text-noir-cream font-serif text-lg"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {character.name}
                      </h3>
                      <p className="text-noir-gold/70 text-sm italic mt-1">
                        {character.role}
                      </p>
                    </div>

                    {/* Contradiction indicator */}
                    {hasContradiction && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-noir-blood rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        !
                      </div>
                    )}

                    {/* Hover instruction */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -bottom-8 left-0 right-0 text-center"
                        >
                          <span className="text-noir-gold text-sm">
                            Click to interrogate →
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Evidence row at bottom */}
          {collectedEvidence.length > 0 && (
            <div className="mt-12 pt-8 border-t border-noir-slate/20">
              <h3 className="text-noir-smoke text-sm uppercase tracking-widest mb-4 text-center">
                Collected Evidence
              </h3>
              <div className="flex justify-center gap-4 flex-wrap">
                {collectedEvidence.map((evidence, i) => (
                  <motion.div
                    key={evidence.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-4 py-2 bg-noir-charcoal/50 border border-noir-gold/30 text-noir-cream text-sm"
                    style={{ transform: `rotate(${(i % 3 - 1) * 2}deg)` }}
                  >
                    📌 {evidence.description.substring(0, 30)}...
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Watson hint (if any) */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-100/90 px-6 py-4 shadow-lg"
            style={{
              transform: 'rotate(-1deg)',
              fontFamily: 'var(--font-serif)',
            }}
          >
            <p className="text-amber-900 text-sm">
              <span className="font-bold">Watson notes:</span>{' '}
              {collectedEvidence.length === 0
                ? "Begin by questioning the suspects. Look for inconsistencies in their stories."
                : contradictions.length > 0
                  ? "You've found a contradiction! Press the suspects on their conflicting statements."
                  : "Keep gathering evidence. Something doesn't add up here..."
              }
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
