import { useState, useEffect } from 'react'
import { useMysteryStore } from '../../game/mysteryState'
import { useGameStore } from '../../game/state'
import { fetchAllMysteries } from '../../mysteries/registry'
import { setActiveMysteryId } from '../../api/client'
import analytics from '../../lib/analytics'

interface MysterySelectProps {
  onCreateNew?: () => void
}

export function MysterySelect({ onCreateNew }: MysterySelectProps = {}) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [showSavedMysteries, setShowSavedMysteries] = useState(false)
  
  const {
    availableMysteries,
    loadMystery,
    generateNewMystery,
    isLoading,
    isGenerating,
    error,
  } = useMysteryStore()

  const initializeFromMystery = useGameStore((state) => state.initializeFromMystery)
  const startGame = useGameStore((state) => state.startGame)

  useEffect(() => {
    fetchAllMysteries().then(mysteries => {
      useMysteryStore.setState({ availableMysteries: mysteries })
    })
  }, [])

  const handleSelectMystery = async (id: string) => {
    try {
      const info = availableMysteries.find(m => m.id === id)
      analytics.mysterySelected(id, info?.title)
      
      await loadMystery(id)
      const mystery = useMysteryStore.getState().activeMystery
      if (mystery) {
        if (info?.isGenerated) {
          setActiveMysteryId(id)
        }
        initializeFromMystery(mystery)
        analytics.gameStarted(id, { isGenerated: info?.isGenerated, difficulty: info?.difficulty })
        startGame()
      }
    } catch (error) {
      console.error('Failed to load mystery:', error)
    }
  }

  const handleGenerateMystery = async () => {
    try {
      analytics.mysterySelected('generated', 'AI Generated Mystery')
      await generateNewMystery(selectedDifficulty)
      const mystery = useMysteryStore.getState().activeMystery
      if (mystery) {
        initializeFromMystery(mystery)
        analytics.gameStarted(mystery.id || 'generated', { isGenerated: true, difficulty: selectedDifficulty })
        startGame()
      }
    } catch (error) {
      console.error('Failed to generate mystery:', error)
    }
  }

  const difficultyConfig = {
    easy: { color: '#4ade80', label: 'EASY', desc: 'Clear clues, forgiving' },
    medium: { color: '#fbbf24', label: 'MEDIUM', desc: 'Balanced challenge' },
    hard: { color: '#ef4444', label: 'HARD', desc: 'Expert detective' },
  }

  const eraIcon: Record<string, string> = {
    '1920s': '🥃',
    '1940s': '🎬',
    '1970s': '🪩',
    '2050s': '🔬',
    'medieval': '⚔️',
    'Custom': '✨',
  }

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col" style={{ fontFamily: 'Georgia, serif' }}>
      
      {/* Fixed top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-noir-slate/20">
        <button
          onClick={() => {
            useMysteryStore.getState().clearMystery()
            useGameStore.getState().resetGame()
          }}
          className="text-noir-smoke text-sm tracking-wider hover:text-noir-gold transition-colors min-h-[48px] flex items-center"
        >
          ← BACK
        </button>
        <h1
          className="text-base sm:text-lg tracking-[0.3em] text-noir-gold"
          style={{ textShadow: '0 0 30px rgba(201, 162, 39, 0.3)' }}
        >
          SELECT CASE
        </h1>
        <div className="w-12 sm:w-16" /> {/* Spacer for centering */}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* HERO: Generate New Mystery */}
          <div className="mb-8">
            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl text-noir-gold font-bold mb-2 tracking-wide">
                Generate New Mystery
              </h2>
              <p className="text-noir-smoke text-sm sm:text-base">
                AI creates unique cases with suspects, evidence & art
              </p>
            </div>

            {/* Difficulty selector - mobile-first card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {(Object.keys(difficultyConfig) as Array<'easy' | 'medium' | 'hard'>).map((diff) => {
                const config = difficultyConfig[diff]
                const isSelected = selectedDifficulty === diff
                return (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`
                      min-h-[80px] p-4 border-2 transition-all duration-200
                      ${isSelected 
                        ? 'border-noir-gold bg-noir-gold/10 scale-[1.02]' 
                        : 'border-noir-slate/30 bg-noir-black hover:border-noir-gold/50'
                      }
                    `}
                  >
                    <div
                      className={`text-xs font-bold tracking-widest mb-1 ${
                        isSelected ? 'text-noir-gold' : 'text-noir-smoke'
                      }`}
                      style={isSelected ? {} : { color: config.color }}
                    >
                      {config.label}
                    </div>
                    <div className="text-[11px] text-noir-smoke/70">
                      {config.desc}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Generate button - BIG and unmissable */}
            <button
              onClick={() => onCreateNew ? onCreateNew() : handleGenerateMystery()}
              disabled={isGenerating}
              className="
                w-full min-h-[64px] px-6 py-4
                border-2 border-noir-gold bg-gradient-to-r from-noir-gold/10 to-noir-gold/5
                hover:from-noir-gold/20 hover:to-noir-gold/10
                text-noir-gold font-bold text-lg tracking-widest
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
              "
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-noir-gold border-t-transparent rounded-full animate-spin" />
                  CREATING YOUR MYSTERY...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✨ CREATE MYSTERY
                </span>
              )}
            </button>
          </div>

          {/* Divider */}
          {availableMysteries.length > 0 && (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-noir-gold/20" />
              <span className="text-[10px] sm:text-[11px] text-noir-smoke/60 tracking-[0.25em]">
                OR CONTINUE A CASE
              </span>
              <div className="flex-1 h-px bg-noir-gold/20" />
            </div>
          )}

          {/* Saved mysteries - collapsible on mobile, always visible on desktop */}
          {availableMysteries.length > 0 && (
            <>
              {/* Mobile: collapsible toggle */}
              <button
                onClick={() => setShowSavedMysteries(!showSavedMysteries)}
                className="w-full sm:hidden min-h-[56px] px-4 py-3 mb-3 border border-noir-slate/30 bg-noir-black hover:border-noir-gold/30 transition-colors flex items-center justify-between"
              >
                <span className="text-noir-smoke text-sm tracking-wide">
                  {availableMysteries.length} Saved {availableMysteries.length === 1 ? 'Case' : 'Cases'}
                </span>
                <span className={`text-noir-gold transition-transform ${showSavedMysteries ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Mystery grid/list */}
              <div className={`
                ${showSavedMysteries ? 'block' : 'hidden'} sm:block
                grid grid-cols-1 sm:grid-cols-2 gap-3
              `}>
                {availableMysteries.map((mystery) => {
                  const config = difficultyConfig[mystery.difficulty as keyof typeof difficultyConfig]
                  return (
                    <button
                      key={mystery.id}
                      onClick={() => handleSelectMystery(mystery.id)}
                      disabled={isLoading}
                      className="
                        group min-h-[80px] p-4
                        border border-noir-slate/20 hover:border-noir-gold/50
                        bg-noir-black hover:bg-noir-gold/[0.03]
                        transition-all duration-200
                        text-left disabled:opacity-50
                        active:scale-[0.98]
                      "
                    >
                      <div className="flex items-start gap-3">
                        {/* Era icon */}
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl rounded bg-noir-charcoal/50">
                          {eraIcon[mystery.era] || '🔍'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-noir-cream group-hover:text-noir-gold transition-colors truncate">
                              {mystery.title}
                            </h3>
                            {mystery.isGenerated && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-noir-gold" title="AI Generated" />
                            )}
                          </div>
                          <p className="text-noir-smoke/60 text-xs truncate mb-2">
                            {mystery.subtitle || mystery.era}
                          </p>
                          {/* Tags row */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-noir-smoke/40 tracking-wider">
                              {mystery.era}
                            </span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-sm tracking-wider font-bold"
                              style={{
                                backgroundColor: `${config?.color || '#888'}15`,
                                color: config?.color || '#888',
                              }}
                            >
                              {mystery.difficulty.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex-shrink-0 text-noir-smoke/30 group-hover:text-noir-gold transition-colors self-center">
                          →
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 border border-red-500/40 bg-red-500/5 text-red-400 text-center text-sm">
              <p className="font-bold mb-1">ERROR</p>
              <p>{error}</p>
            </div>
          )}

          {/* Bottom breathing room */}
          <div className="h-12" />
        </div>
      </div>
    </div>
  )
}
