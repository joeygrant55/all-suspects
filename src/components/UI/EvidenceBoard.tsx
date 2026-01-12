import { useState } from 'react'
import { useGameStore } from '../../game/state'

interface EvidenceBoardProps {
  isOpen: boolean
  onClose: () => void
}

export function EvidenceBoard({ isOpen, onClose }: EvidenceBoardProps) {
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const contradictions = useGameStore((state) => state.contradictions)
  const characters = useGameStore((state) => state.characters)
  const [activeTab, setActiveTab] = useState<'evidence' | 'contradictions' | 'suspects'>('evidence')

  if (!isOpen) return null

  const getCharacterName = (id: string) => {
    return characters.find((c) => c.id === id)?.name || id
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* Board container */}
      <div
        className="relative w-[900px] h-[600px] rounded-sm overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #3d3028 0%, #2a1f15 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)',
          border: '8px solid #1a1510',
        }}
      >
        {/* Cork texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div className="relative px-6 py-4 border-b border-noir-black/30 flex items-center justify-between">
          <h2
            className="text-2xl text-noir-cream tracking-wider"
            style={{
              fontFamily: 'Georgia, serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            EVIDENCE BOARD
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-noir-cream hover:text-noir-gold transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="relative px-6 py-2 flex gap-4 border-b border-noir-black/20">
          {[
            { id: 'evidence', label: 'Evidence', count: collectedEvidence.length },
            { id: 'contradictions', label: 'Contradictions', count: contradictions.length },
            { id: 'suspects', label: 'Suspects', count: characters.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'text-noir-gold border-b-2 border-noir-gold'
                  : 'text-noir-cream/70 hover:text-noir-cream'
              }`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="relative p-6 h-[calc(100%-120px)] overflow-y-auto">
          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {collectedEvidence.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-noir-cream/60 italic">No evidence collected yet.</p>
                  <p className="text-noir-cream/40 text-sm mt-2">
                    Interview suspects to gather clues.
                  </p>
                </div>
              ) : (
                collectedEvidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="p-4 bg-noir-cream/90 text-noir-black rounded-sm shadow-lg transform rotate-[-0.5deg] hover:rotate-0 transition-transform"
                    style={{
                      boxShadow: '4px 4px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                          {evidence.description}
                        </p>
                        <p className="text-sm text-noir-smoke mt-1">
                          Source: {evidence.source} &bull; {formatTimestamp(evidence.timestamp)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          evidence.type === 'testimony'
                            ? 'bg-blue-900 text-blue-100'
                            : evidence.type === 'contradiction'
                              ? 'bg-red-900 text-red-100'
                              : evidence.type === 'physical'
                                ? 'bg-green-900 text-green-100'
                                : 'bg-amber-900 text-amber-100'
                        }`}
                      >
                        {evidence.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Contradictions tab */}
          {activeTab === 'contradictions' && (
            <div className="space-y-4">
              {contradictions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-noir-cream/60 italic">No contradictions found yet.</p>
                  <p className="text-noir-cream/40 text-sm mt-2">
                    Pay attention to what suspects say - their stories may not match.
                  </p>
                </div>
              ) : (
                contradictions.map((contradiction) => (
                  <div
                    key={contradiction.id}
                    className="p-4 bg-noir-blood/20 border border-noir-blood/40 rounded-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-noir-blood font-bold">!</span>
                      <span className="text-noir-cream font-medium">
                        {getCharacterName(contradiction.characterId)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-noir-cream/80">
                        <span className="text-noir-smoke">Said:</span> "{contradiction.claim1}"
                      </p>
                      <p className="text-noir-cream/80">
                        <span className="text-noir-smoke">But also:</span> "{contradiction.claim2}"
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Suspects tab */}
          {activeTab === 'suspects' && (
            <div className="grid grid-cols-3 gap-4">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="p-4 bg-noir-black/40 border border-noir-slate/40 rounded-sm"
                >
                  <div
                    className="w-16 h-16 mx-auto mb-3 rounded-sm flex items-center justify-center text-2xl"
                    style={{
                      background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
                      border: '2px solid #4a4a4a',
                      fontFamily: 'Georgia, serif',
                      color: '#c9a227',
                    }}
                  >
                    {character.name.charAt(0)}
                  </div>
                  <h3
                    className="text-center text-noir-cream font-medium"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {character.name}
                  </h3>
                  <p className="text-center text-noir-smoke text-xs italic mt-1">{character.role}</p>
                  <p className="text-center text-noir-gold text-xs mt-2">
                    Located: {character.location}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pins decoration */}
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
      </div>
    </div>
  )
}
