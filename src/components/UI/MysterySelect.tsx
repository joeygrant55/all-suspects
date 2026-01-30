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

      {/* Mystery Cards Grid */}
      <div className="relative z-10 max-w-6xl w-full px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Hardcoded mysteries */}
          {availableMysteries.map((mystery) => (
            <div
              key={mystery.id}
              className="group relative bg-noir-black border-2 border-noir-slate hover:border-noir-gold transition-all duration-300 p-6 cursor-pointer"
              onClick={() => handleSelectMystery(mystery.id)}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {/* Decorative corner */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-noir-gold opacity-50" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-noir-gold opacity-50" />

              {/* Content */}
              <div className="relative">
                {/* AI badge for generated mysteries */}
                {mystery.isGenerated && (
                  <span className="absolute -top-2 -right-2 text-xs bg-noir-gold text-noir-black px-2 py-0.5 font-bold tracking-wider">
                    ✨ AI
                  </span>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-noir-gold mb-2">
                  {mystery.title}
                </h3>

                {/* Subtitle */}
                <p className="text-noir-cream text-sm mb-4">
                  {mystery.subtitle}
                </p>

                {/* Meta info */}
                <div className="flex items-center justify-between text-xs text-noir-smoke mb-4">
                  <span>{mystery.era}</span>
                  <span
                    className="px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${difficultyColor[mystery.difficulty]}20`,
                      color: difficultyColor[mystery.difficulty],
                    }}
                  >
                    {mystery.difficulty.toUpperCase()}
                  </span>
                </div>

                {/* Play button */}
                <button
                  className="w-full py-2 border border-noir-gold text-noir-gold text-sm tracking-wider hover:bg-noir-gold hover:text-noir-black transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectMystery(mystery.id)
                  }}
                >
                  {isLoading ? 'LOADING...' : 'INVESTIGATE'}
                </button>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-noir-gold opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
            </div>
          ))}

          {/* Generate New Mystery Card */}
          <div
            className="group relative bg-gradient-to-br from-noir-black to-noir-charcoal border-2 border-noir-gold p-6 cursor-pointer"
            style={{ fontFamily: 'Georgia, serif' }}
            onClick={() => onCreateNew ? onCreateNew() : handleGenerateMystery()}
          >
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-noir-gold" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-noir-gold" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-noir-gold mb-2 flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Mystery Architect
                </h3>
                <p className="text-noir-cream text-sm mb-6">
                  Generate a unique, never-before-seen case crafted by AI
                </p>

                {!onCreateNew && (
                  /* Difficulty selector - only shown in legacy mode */
                  <div className="mb-6">
                    <label className="block text-noir-smoke text-xs mb-2 tracking-wider">
                      DIFFICULTY
                    </label>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={(e) => { e.stopPropagation(); setSelectedDifficulty(diff) }}
                          className={`flex-1 py-2 text-xs tracking-wider transition-all duration-300 ${
                            selectedDifficulty === diff
                              ? 'bg-noir-gold text-noir-black'
                              : 'border border-noir-slate text-noir-smoke hover:border-noir-gold'
                          }`}
                        >
                          {diff.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateNew ? onCreateNew() : handleGenerateMystery()
                }}
                disabled={isGenerating}
                className="w-full py-3 bg-noir-gold text-noir-black text-sm font-bold tracking-wider hover:bg-opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-noir-black border-t-transparent rounded-full animate-spin" />
                    GENERATING...
                  </span>
                ) : onCreateNew ? (
                  'CREATE NEW MYSTERY →'
                ) : (
                  'GENERATE MYSTERY'
                )}
              </button>

              {/* Loading message */}
              {isGenerating && (
                <div className="mt-4 text-center">
                  <p className="text-noir-gold text-xs italic animate-pulse">
                    The Mystery Architect is crafting your case...
                  </p>
                  <p className="text-noir-smoke text-xs mt-1">
                    This may take 30-60 seconds
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 border-2 border-red-500 bg-red-500 bg-opacity-10 text-red-400 text-center text-sm">
            <p className="font-bold mb-1">ERROR</p>
            <p>{error}</p>
          </div>
        )}
      </div>

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
