import { useState, useEffect } from 'react'
import { useMysteryStore } from '../../game/mysteryState'
import { useGameStore } from '../../game/state'
import { fetchAllMysteries } from '../../mysteries/registry'
import { setActiveMysteryId } from '../../api/client'

interface MysterySelectProps {
  onCreateNew?: () => void
}

export function MysterySelect({ onCreateNew }: MysterySelectProps = {}) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
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
      await loadMystery(id)
      const mystery = useMysteryStore.getState().activeMystery
      if (mystery) {
        const info = availableMysteries.find(m => m.id === id)
        if (info?.isGenerated) {
          setActiveMysteryId(id)
        }
        initializeFromMystery(mystery)
        startGame()
      }
    } catch (error) {
      console.error('Failed to load mystery:', error)
    }
  }

  const handleGenerateMystery = async () => {
    try {
      await generateNewMystery(selectedDifficulty)
      const mystery = useMysteryStore.getState().activeMystery
      if (mystery) {
        initializeFromMystery(mystery)
        startGame()
      }
    } catch (error) {
      console.error('Failed to generate mystery:', error)
    }
  }

  const difficultyColor: Record<string, string> = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#ef4444',
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
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-noir-slate/20">
        <button
          onClick={() => {
            useMysteryStore.getState().clearMystery()
            useGameStore.getState().resetGame()
          }}
          className="text-noir-smoke text-sm tracking-wider hover:text-noir-gold transition-colors"
        >
          ← BACK
        </button>
        <h1
          className="text-lg tracking-[0.3em] text-noir-gold"
          style={{ textShadow: '0 0 30px rgba(201, 162, 39, 0.3)' }}
        >
          SELECT YOUR CASE
        </h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Mystery Architect — premium inline card */}
          <button
            onClick={() => onCreateNew ? onCreateNew() : handleGenerateMystery()}
            disabled={isGenerating}
            className="w-full group relative flex items-center gap-5 p-6 mb-8 border-2 border-noir-gold/80 bg-gradient-to-r from-noir-gold/5 to-transparent hover:from-noir-gold/10 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl">
              ✨
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl text-noir-gold font-bold mb-1">
                Mystery Architect
              </h2>
              <p className="text-noir-smoke text-sm">
                Generate a unique case with custom art, suspects & evidence
              </p>
            </div>
            <div className="flex-shrink-0 text-noir-gold text-sm tracking-widest font-bold opacity-80 group-hover:opacity-100 transition-opacity">
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-noir-gold border-t-transparent rounded-full animate-spin" />
                  CREATING...
                </span>
              ) : (
                'CREATE →'
              )}
            </div>
          </button>

          {/* Divider */}
          {availableMysteries.length > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-noir-gold/20" />
              <span className="text-[11px] text-noir-smoke/60 tracking-[0.25em]">YOUR CASE FILES</span>
              <div className="flex-1 h-px bg-noir-gold/20" />
            </div>
          )}

          {/* Mystery list */}
          <div className="flex flex-col gap-2">
            {availableMysteries.map((mystery) => (
              <button
                key={mystery.id}
                onClick={() => handleSelectMystery(mystery.id)}
                disabled={isLoading}
                className="w-full group flex items-center gap-4 p-4 border border-noir-slate/20 hover:border-noir-gold/50 bg-noir-black hover:bg-noir-gold/[0.03] transition-all duration-200 cursor-pointer text-left disabled:opacity-50"
              >
                {/* Era icon */}
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl rounded bg-noir-charcoal/50">
                  {eraIcon[mystery.era] || '🔍'}
                </div>

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm text-noir-cream font-bold truncate group-hover:text-noir-gold transition-colors">
                      {mystery.title}
                    </h3>
                    {mystery.isGenerated && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-noir-gold" title="AI Generated" />
                    )}
                  </div>
                  <p className="text-noir-smoke/60 text-xs truncate mt-0.5">
                    {mystery.subtitle || mystery.era}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-noir-smoke/40 tracking-wider hidden sm:inline">
                    {mystery.era}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-sm tracking-wider font-bold"
                    style={{
                      backgroundColor: `${difficultyColor[mystery.difficulty]}15`,
                      color: difficultyColor[mystery.difficulty],
                    }}
                  >
                    {mystery.difficulty.toUpperCase()}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-noir-smoke/30 group-hover:text-noir-gold transition-colors text-sm">
                  →
                </div>
              </button>
            ))}
          </div>

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
