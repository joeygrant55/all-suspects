import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import type { EvidenceData } from '../../types/evidence'
import { GameTimer } from '../UI/GameTimer'
import { ManorView } from './ManorView'

interface CaseBoardProps {
  onSelectSuspect: (characterId: string) => void
  onOpenEvidence: () => void
  onAccuse: () => void
}

// Suspect IDs in display order (fallback for Ashford Affair)
const DEFAULT_SUSPECT_IDS = ['victoria', 'thomas', 'eleanor', 'marcus', 'lillian', 'james']

type ViewMode = 'suspects' | 'manor'

export function CaseBoard({ onSelectSuspect, onOpenEvidence, onAccuse }: CaseBoardProps) {
  const { 
    characters, 
    collectedEvidence, 
    contradictions, 
    accusationUnlocked, 
    messages,
    newEvidenceCount,
    hasSeenEvidenceBoard,
    markEvidenceBoardViewed,
    discoveredEvidenceIds,
    lastViewMode,
    setLastViewMode
  } = useGameStore()
  const [hoveredSuspect, setHoveredSuspect] = useState<string | null>(null)
  const [showEvidenceTooltip, setShowEvidenceTooltip] = useState(false)
  const [showLockedHint, setShowLockedHint] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(lastViewMode || 'manor')

  // Total evidence = room evidence + interrogation evidence
  const mystery = useMysteryStore.getState().activeMystery
  const mysteryTitle = mystery?.title || 'THE CASE'
  const mysterySubtitle = mystery?.worldState?.location || 'New Year\'s Eve, 1929'
  const suspectIds = characters.length > 0 ? characters.map((c) => c.id) : DEFAULT_SUSPECT_IDS
  const totalEvidence = discoveredEvidenceIds.length + collectedEvidence.length

  const allEvidenceData: Record<string, EvidenceData> = {
    ...(mystery?.evidence || {}),
    ...EVIDENCE_DATABASE,
  }

  const suspectEvidenceById = new Map<string, Array<{ source: string; data: EvidenceData }>>()

  const getSuspectEvidence = (suspectId: string) => {
    if (suspectEvidenceById.has(suspectId)) {
      return suspectEvidenceById.get(suspectId) || []
    }

    const evidenceForSuspect: Array<{ source: string; data: EvidenceData }> = []

    for (const collected of collectedEvidence) {
      const data = allEvidenceData[collected.source]
      if (!data) continue
      if (data.relatedCharacter === suspectId || data.pointsTo === suspectId) {
        evidenceForSuspect.push({
          source: collected.source,
          data,
        })
      }
    }

    suspectEvidenceById.set(suspectId, evidenceForSuspect)
    return evidenceForSuspect
  }

  const suspectEvidenceCount = new Map<string, { count: number; names: string[] }>()
  suspectIds.forEach((suspectId) => {
    const evidenceList = getSuspectEvidence(suspectId)
    suspectEvidenceCount.set(suspectId, {
      count: evidenceList.length,
      names: evidenceList.map((entry) => entry.data.name),
    })
  })

  const unlockedSuspectCount = suspectIds.reduce((count, suspectId) => {
    return count + (suspectEvidenceCount.get(suspectId)?.count ? 1 : 0)
  }, 0)


  // Wrapper to update both local and global view mode
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    setLastViewMode(mode)
  }

  // Show tooltip on first evidence collection
  useEffect(() => {
    if (collectedEvidence.length > 0 && !hasSeenEvidenceBoard) {
      setShowEvidenceTooltip(true)
    }
  }, [collectedEvidence.length, hasSeenEvidenceBoard])

  useEffect(() => {
    if (!showLockedHint) {
      return
    }

    const timer = setTimeout(() => setShowLockedHint(null), 1800)
    return () => clearTimeout(timer)
  }, [showLockedHint])

  const handleOpenEvidence = () => {
    markEvidenceBoardViewed()
    setShowEvidenceTooltip(false)
    onOpenEvidence()
  }

  // Get portrait image path — checks generated mystery assets first
  const getPortraitPath = (id: string) => {
    const mystery = useMysteryStore?.getState?.()?.activeMystery
    if (mystery?.id && mystery.id !== 'ashford-affair' && mystery.id !== 'hollywood-premiere') {
      // Generated mystery — portraits are in /generated/{id}/assets/portraits/
      return `/generated/${mystery.id}/assets/portraits/${id}.png`
    }
    return `/portraits/${id}.png`
  }

  // Get character by ID
  const getCharacter = (id: string) => characters.find(c => c.id === id)

  // Check if player has questioned this suspect
  const hasQuestioned = (id: string) => messages.some(m => m.characterId === id)

  // If in manor view, render ManorView component
  if (viewMode === 'manor') {
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

        {/* Header with tabs */}
        <div className="relative z-10 px-4 py-2 border-b border-noir-gold/20 flex-shrink-0">
          <div className="max-w-6xl mx-auto">
            {/* Title and tabs row */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 
                  className="text-xl md:text-2xl font-serif text-noir-gold tracking-wide"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {mysteryTitle}
                </h1>
                <p className="text-noir-smoke text-xs md:text-sm">{mysterySubtitle}</p>
              </div>
              
              {/* View mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSetViewMode('suspects')}
                  className="px-4 py-2 text-sm font-serif transition-all border-b-2 border-transparent hover:text-noir-gold"
                  style={{ 
                    color: '#6b6b6b',
                    fontFamily: 'var(--font-serif)' 
                  }}
                >
                  SUSPECTS ({unlockedSuspectCount}/{suspectIds.length})
                </button>
                <button
                  onClick={() => handleSetViewMode('manor')}
                  className="px-4 py-2 text-sm font-serif transition-all border-b-2 border-noir-gold text-noir-gold"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  MANOR
                </button>
              </div>

              {/* Progress indicators */}
              <div className="flex items-center gap-3 md:gap-6">
                {/* Timer */}
                <GameTimer />
                
                <div className="relative">
                  <motion.button
                    onClick={handleOpenEvidence}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/50 border transition-all ${
                      newEvidenceCount > 0 
                        ? 'border-noir-gold shadow-[0_0_8px_rgba(201,162,39,0.5)] animate-pulse' 
                        : 'border-noir-slate/50 hover:border-noir-gold/50'
                    }`}
                    animate={newEvidenceCount > 0 ? { 
                      borderColor: ['rgba(201,162,39,0.5)', 'rgba(201,162,39,1)', 'rgba(201,162,39,0.5)']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-noir-gold">📋</span>
                    <span className="text-noir-cream text-xs md:text-sm">
                      Ev: {totalEvidence}
                    </span>
                  </motion.button>
                  
                  {newEvidenceCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-noir-blood rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                    >
                      {newEvidenceCount}
                    </motion.div>
                  )}
                </div>
                
                <motion.button
                  onClick={onAccuse}
                  disabled={!accusationUnlocked}
                  className={`px-4 py-1.5 font-serif text-xs md:text-sm tracking-wide transition-all ${
                    accusationUnlocked
                      ? 'bg-noir-gold text-noir-black hover:bg-noir-cream'
                      : 'bg-noir-slate/30 text-noir-smoke cursor-not-allowed'
                  }`}
                  whileHover={accusationUnlocked ? { scale: 1.05 } : {}}
                  whileTap={accusationUnlocked ? { scale: 0.95 } : {}}
                >
                  {accusationUnlocked ? 'ACCUSE' : 'GATHER EVIDENCE'}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Manor view content */}
        <ManorView onSelectSuspect={onSelectSuspect} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-noir-black overflow-hidden flex flex-col">
      {/* Cork board background image */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/ui/case-board-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.35,
        }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-noir-black/60" />
      
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />

      {/* Decorative red string SVG connecting suspects */}
      <svg className="absolute inset-0 z-[1] pointer-events-none" width="100%" height="100%">
        <line x1="25%" y1="35%" x2="50%" y2="35%" stroke="#8b1a1a" strokeWidth="1" opacity="0.3" />
        <line x1="50%" y1="35%" x2="75%" y2="35%" stroke="#8b1a1a" strokeWidth="1" opacity="0.25" />
        <line x1="25%" y1="70%" x2="50%" y2="35%" stroke="#8b1a1a" strokeWidth="1" opacity="0.2" />
        <line x1="75%" y1="35%" x2="50%" y2="70%" stroke="#8b1a1a" strokeWidth="1" opacity="0.25" />
        <line x1="25%" y1="35%" x2="75%" y2="70%" stroke="#8b1a1a" strokeWidth="1" opacity="0.15" />
      </svg>

      {/* Header - compact */}
      <div className="relative z-10 px-4 py-2 border-b border-noir-gold/20 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          {/* Title and tabs row */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 
                className="text-xl md:text-2xl font-serif text-noir-gold tracking-wide"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {mysteryTitle}
              </h1>
              <p className="text-noir-smoke text-xs md:text-sm">{mysterySubtitle}</p>
            </div>
            
            {/* View mode tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('suspects')}
                className="px-4 py-2 text-sm font-serif transition-all border-b-2 border-noir-gold text-noir-gold"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                SUSPECTS ({unlockedSuspectCount}/{suspectIds.length})
              </button>
              <button
                onClick={() => setViewMode('manor')}
                className="px-4 py-2 text-sm font-serif transition-all border-b-2 border-transparent hover:text-noir-gold"
                style={{ 
                  color: '#6b6b6b',
                  fontFamily: 'var(--font-serif)' 
                }}
              >
                MANOR
              </button>
            </div>

            {/* Progress indicators */}
            <div className="flex items-center gap-3 md:gap-6">
            {/* Timer */}
            <GameTimer />
            
            <div className="relative">
              <motion.button
                onClick={handleOpenEvidence}
                className={`flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/50 border transition-all ${
                  newEvidenceCount > 0 
                    ? 'border-noir-gold shadow-[0_0_8px_rgba(201,162,39,0.5)] animate-pulse' 
                    : 'border-noir-slate/50 hover:border-noir-gold/50'
                }`}
                animate={newEvidenceCount > 0 ? { 
                  borderColor: ['rgba(201,162,39,0.5)', 'rgba(201,162,39,1)', 'rgba(201,162,39,0.5)']
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-noir-gold">📋</span>
                <span className="text-noir-cream text-xs md:text-sm">
                  Ev: {totalEvidence}
                </span>
              </motion.button>
              
              {/* Red badge for new evidence */}
              {newEvidenceCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-noir-blood rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                >
                  {newEvidenceCount}
                </motion.div>
              )}
              
              {/* First-time tooltip */}
              <AnimatePresence>
                {showEvidenceTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-2 right-0 bg-noir-gold text-noir-black px-3 py-2 rounded shadow-lg z-50 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👆</span>
                      <span className="text-sm font-serif">Review your evidence here!</span>
                    </div>
                    <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-noir-gold" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {contradictions.length > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-noir-blood/20 border border-noir-blood/30">
                <span className="text-noir-blood">⚡</span>
                <span className="text-noir-cream text-xs md:text-sm">
                  {contradictions.length} Contradiction{contradictions.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <motion.button
              onClick={onAccuse}
              disabled={!accusationUnlocked}
              className={`px-4 py-1.5 font-serif text-xs md:text-sm tracking-wide transition-all ${
                accusationUnlocked
                  ? 'bg-noir-gold text-noir-black hover:bg-noir-cream'
                  : 'bg-noir-slate/30 text-noir-smoke cursor-not-allowed'
              }`}
              whileHover={accusationUnlocked ? { scale: 1.05 } : {}}
              whileTap={accusationUnlocked ? { scale: 0.95 } : {}}
            >
              {accusationUnlocked ? 'ACCUSE' : 'GATHER EVIDENCE'}
            </motion.button>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showLockedHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-noir-black/85 border border-noir-gold/50 text-noir-gold px-3 py-2 rounded-sm text-sm"
          >
            {showLockedHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main case board area - flex-1 to fill remaining space */}
      <div className="relative z-10 flex-1 flex flex-col justify-center p-2 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
          
          {/* Section title */}
          <div className="text-center mb-1 flex-shrink-0">
            <h2 
              className="text-sm md:text-base font-serif text-noir-cream/80 tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              — Suspects —
            </h2>
            <p className="text-noir-smoke text-[10px] italic">
              Click a suspect to begin interrogation
            </p>
          </div>

          {/* Suspect grid - 3x2, constrained to fit viewport */}
          <div className="grid grid-cols-2 sm:grid-cols-3 sm:grid-rows-2 grid-rows-3 gap-1.5 md:gap-2 flex-1 min-h-0 max-h-[calc(100vh-140px)]">
            {suspectIds.map((id, index) => {
              const character = getCharacter(id)
              if (!character) return null

              const isHovered = hoveredSuspect === id
              const hasContradiction = contradictions.some(
                c => c.statement1.characterId === id || c.statement2.characterId === id
              )
              const questioned = hasQuestioned(id)
              const suspectEvidenceList = getSuspectEvidence(id)
              const unlockedEvidenceCount = suspectEvidenceList.length
              const isUnlocked = unlockedEvidenceCount > 0
              const firstEvidenceName = suspectEvidenceList[0]?.data.name

              return (
                <motion.button
                  key={id}
                  onClick={() => {
                    if (isUnlocked) {
                      onSelectSuspect(id)
                    } else {
                      setShowLockedHint('Find evidence related to this suspect first')
                    }
                  }}
                  onMouseEnter={() => setHoveredSuspect(id)}
                  onMouseLeave={() => setHoveredSuspect(null)}
                  className="group relative h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={isUnlocked ? { scale: 1.02 } : {}}
                  whileTap={isUnlocked ? { scale: 0.98 } : {}}
                >
                  {/* Suspect card - Polaroid style */}
                  <div 
                    className={`relative transition-all duration-300 h-full flex flex-col ${
                      isHovered 
                        ? 'shadow-xl shadow-noir-gold/30' 
                        : 'shadow-lg shadow-black/50'
                    }`}
                    style={{
                      transform: isHovered ? 'rotate(0deg) scale(1.02)' : `rotate(${[-2, 1.5, -1, 2.5, -1.5, 1][index]}deg)`,
                      background: '#f5f0e8',
                      padding: '6px 6px 28px 6px',
                      border: hasContradiction 
                        ? '2px solid rgba(139, 26, 26, 0.6)' 
                        : isHovered 
                          ? '2px solid rgba(201, 162, 39, 0.5)' 
                          : questioned 
                            ? '2px solid rgba(201, 162, 39, 0.25)' 
                            : '2px solid rgba(200, 195, 180, 0.3)',
                    }}
                  >
                    {/* Brass pin */}
                    <div 
                      className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full z-10 border-2"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #d4a843, #8b6914, #5c4a0e)',
                        borderColor: '#8b6914',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      }}
                    />
                    
                    {/* Photo area - fills available height */}
                    <div className="flex-1 min-h-0 bg-gradient-to-br from-noir-slate/50 to-noir-charcoal overflow-hidden relative">
                      <img 
                        src={getPortraitPath(id)}
                        alt={character.name}
                        className={`w-full h-full object-cover object-top filter sepia-[0.3] contrast-[1.1] ${
                          !isUnlocked ? 'brightness-[0.2] grayscale(1)' : questioned ? 'brightness-75' : ''
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.parentElement!.innerHTML = `<span class="text-2xl md:text-3xl font-serif text-noir-gold/60 flex items-center justify-center h-full">${character.name.split(' ').map(n => n[0]).join('')}</span>`
                        }}
                      />
                      
                      {/* Locked/unavailable overlay */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-3xl md:text-4xl text-noir-gold">🔒</span>
                        </div>
                      )}

                      {/* Questioned overlay */}
                      {questioned && isUnlocked && (
                        <div className="absolute inset-0 bg-noir-black/30 flex items-center justify-center">
                          <div className="absolute top-1 right-1 w-5 h-5 md:w-6 md:h-6 bg-noir-gold/90 rounded-full flex items-center justify-center">
                            <span className="text-noir-black text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Info strip - polaroid caption */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-0.5" style={{ background: '#f5f0e8' }}>
                      <h3 
                        className="text-xs md:text-sm truncate"
                        style={{ fontFamily: 'var(--font-serif)', color: '#2a2218' }}
                      >
                        {character.name}
                      </h3>

                      <p className="text-[10px] md:text-xs italic truncate" style={{ color: isUnlocked ? '#6b5c3e' : '#7a6b51' }}>
                        {isUnlocked ? character.role : 'Find evidence to unlock'}
                      </p>

                      {isUnlocked && firstEvidenceName && (
                        <p className="text-[9px] md:text-[10px] italic text-amber-600 truncate">
                          You have evidence: {firstEvidenceName}
                        </p>
                      )}
                    </div>

                    {/* Unlocked evidence badge */}
                    {isUnlocked && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-sm bg-black/70 text-noir-gold text-[9px] font-serif tracking-wide border border-noir-gold/70">
                        📋 {unlockedEvidenceCount}
                      </div>
                    )}

                    {/* Contradiction indicator */}
                    {hasContradiction && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-noir-blood rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-20">
                        !
                      </div>
                    )}

                    {/* Hover instruction */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute -bottom-6 left-0 right-0 text-center"
                        >
                          <span className="text-noir-gold text-xs">
                            {isUnlocked
                              ? questioned
                                ? 'Continue interrogation →'
                                : 'Click to interrogate →'
                              : 'Collect evidence to unlock →'}
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

      {/* Watson hint - compact sticky note at bottom */}
      <div className="relative z-20 flex-shrink-0 p-2 md:p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-100/95 px-3 py-1.5 shadow-lg max-w-xs mx-auto md:mx-0 md:ml-4"
          style={{
            transform: 'rotate(-1deg)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <p className="text-amber-900 text-xs">
            <span className="font-bold">💡 Watson:</span>{' '}
            {(() => {
              const hasQuestioned = messages.length > 0
              const hasExploredRooms = discoveredEvidenceIds.length > 0
              
              if (contradictions.length > 0) {
                return "You've found a contradiction! Press them on it."
              }
              if (!hasQuestioned) {
                return "Question the suspects. Look for inconsistencies."
              }
              if (!hasExploredRooms) {
                return "Perhaps we should examine the crime scene for physical evidence. Check the Manor tab."
              }
              if (hasExploredRooms && discoveredEvidenceIds.length < 5) {
                return "Keep searching the manor for more clues."
              }
              return "Gather more evidence by questioning suspects and exploring rooms."
            })()}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
