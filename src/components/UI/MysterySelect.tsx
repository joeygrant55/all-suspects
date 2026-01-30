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

  // Load available mysteries on mount (including generated ones)
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
        // Route chat to universal character agent for generated mysteries
        const info = availableMysteries.find(m => m.id === id)
        if (info?.isGenerated) {
          setActiveMysteryId(id)
        }
        // Initialize the game store with this mystery
        initializeFromMystery(mystery)
        // Start the game (shows intro sequence)
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

  const difficultyColor = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#ef4444',
  }

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Fog effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(201, 162, 39, 0.1) 50%, transparent 100%)',
          animation: 'fog 10s ease-in-out infinite',
        }}
      />

      {/* Header */}
      <div className="relative z-10 text-center mb-12">
        <h1
          className="text-5xl font-bold tracking-wider mb-2"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#c9a227',
            textShadow: '0 0 40px rgba(201, 162, 39, 0.5)',
          }}
        >
          SELECT YOUR CASE
        </h1>
        <div
          className="text-noir-smoke text-sm tracking-[0.3em]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Each mystery presents unique suspects and motives
        </div>
      </div>

      {/* Hero: Create New Mystery */}
      <div className="relative z-10 max-w-2xl w-full px-8 mb-10">
        <div
          className="group relative bg-gradient-to-br from-noir-black to-noir-charcoal border-2 border-noir-gold p-8 cursor-pointer"
          style={{ fontFamily: 'Georgia, serif' }}
          onClick={() => onCreateNew ? onCreateNew() : handleGenerateMystery()}
        >
          <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-noir-gold" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-noir-gold" />

          <div className="relative text-center">
            <h2 className="text-3xl font-bold text-noir-gold mb-3 flex items-center justify-center gap-3">
              <span className="text-3xl">✨</span>
              Mystery Architect
            </h2>
            <p className="text-noir-cream text-sm mb-6 max-w-md mx-auto">
              Generate a unique, never-before-seen murder mystery — crafted by AI with custom art, suspects, and evidence
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateNew ? onCreateNew() : handleGenerateMystery()
              }}
              disabled={isGenerating}
              className="px-12 py-4 bg-noir-gold text-noir-black text-lg font-bold tracking-widest hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50"
            >
              {isGenerating ? 'GENERATING...' : 'CREATE NEW MYSTERY →'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing mysteries — compact horizontal scroll or small grid */}
      {availableMysteries.length > 0 && (
        <div className="relative z-10 max-w-5xl w-full px-8 mb-8">
          <h3
            className="text-sm text-noir-smoke tracking-[0.3em] mb-4 text-center"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            — OR INVESTIGATE AN EXISTING CASE —
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableMysteries.map((mystery) => (
              <div
                key={mystery.id}
                className="group relative bg-noir-black/80 border border-noir-slate/40 hover:border-noir-gold transition-all duration-300 p-4 cursor-pointer"
                onClick={() => handleSelectMystery(mystery.id)}
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {mystery.isGenerated && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-noir-gold text-noir-black px-1.5 py-0.5 font-bold">
                    AI
                  </span>
                )}
                <h4 className="text-sm font-bold text-noir-gold mb-1 leading-tight">
                  {mystery.title}
                </h4>
                <p className="text-noir-smoke text-xs mb-2 line-clamp-1">
                  {mystery.subtitle || mystery.era}
                </p>
                <div className="flex items-center justify-between text-[10px] text-noir-smoke">
                  <span>{mystery.era}</span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${difficultyColor[mystery.difficulty]}20`,
                      color: difficultyColor[mystery.difficulty],
                      fontSize: '10px',
                    }}
                  >
                    {mystery.difficulty.toUpperCase()}
                  </span>
                </div>
                <div className="absolute inset-0 bg-noir-gold opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="relative z-10 mt-6 p-4 border-2 border-red-500 bg-red-500 bg-opacity-10 text-red-400 text-center text-sm max-w-2xl">
          <p className="font-bold mb-1">ERROR</p>
          <p>{error}</p>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => {
          // Clear any selected mystery
          useMysteryStore.getState().clearMystery()
          // Reset the game state
          useGameStore.getState().resetGame()
        }}
        className="relative z-10 px-8 py-2 border border-noir-slate text-noir-slate text-sm tracking-wider hover:border-noir-gold hover:text-noir-gold transition-all duration-300"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        ← BACK TO TITLE
      </button>

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-noir-gold opacity-30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-noir-gold opacity-30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-noir-gold opacity-30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-noir-gold opacity-30" />
    </div>
  )
}
