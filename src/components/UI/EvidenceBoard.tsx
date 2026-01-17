import { useState, useEffect } from 'react'
import { useGameStore } from '../../game/state'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import { VideoComparison } from '../VideoPlayer/VideoComparison'
import { isVideoAvailable } from '../../api/client'

interface EvidenceBoardProps {
  isOpen: boolean
  onClose: () => void
}

export function EvidenceBoard({ isOpen, onClose }: EvidenceBoardProps) {
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const contradictions = useGameStore((state) => state.contradictions)
  const characters = useGameStore((state) => state.characters)
  const [activeTab, setActiveTab] = useState<'evidence' | 'suspects' | 'timeline'>('evidence')
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [selectedContradiction, setSelectedContradiction] = useState<{
    testimony1: { characterId: string; characterName: string; testimony: string; question: string }
    testimony2: { characterId: string; characterName: string; testimony: string; question: string }
    explanation: string
    type: 'timeline' | 'location' | 'witness' | 'factual' | 'behavioral'
  } | null>(null)

  // Check video availability
  useEffect(() => {
    isVideoAvailable().then(setVideoEnabled)
  }, [])

  // Calculate suspicion levels based on collected evidence
  const getSuspicionLevel = (characterId: string): number => {
    let level = 0
    collectedEvidence.forEach((e) => {
      const evidenceData = EVIDENCE_DATABASE[e.source]
      if (evidenceData?.pointsTo === characterId) {
        level += 1
      }
      if (evidenceData?.relatedCharacter === characterId) {
        level += 0.5
      }
    })
    return Math.min(level, 5) // Cap at 5
  }

  // Character details for the suspects tab
  const characterDetails: Record<string, { alibi: string; motive: string; relationship: string }> = {
    victoria: {
      alibi: 'Claims she was in the parlor all evening',
      motive: 'Unhappy marriage, possible affairs',
      relationship: 'Wife of 25 years',
    },
    thomas: {
      alibi: 'Says he was in the garden, then the study',
      motive: 'About to be disinherited',
      relationship: 'Only son, sole heir',
    },
    eleanor: {
      alibi: 'Working in the study until 11 PM',
      motive: 'Knows family secrets',
      relationship: 'Secretary for 8 years',
    },
    marcus: {
      alibi: 'Claims he arrived late, around 10:30 PM',
      motive: 'Medical debts, supplies medication',
      relationship: 'Family physician, close friend',
    },
    lillian: {
      alibi: 'Was in the garden most of the night',
      motive: 'Old flame rekindled?',
      relationship: 'Old family friend, knew Edmund decades',
    },
    james: {
      alibi: 'Serving duties throughout the house',
      motive: 'Loyal but underpaid for 30 years',
      relationship: 'Butler since before Thomas was born',
    },
  }

  // Timeline events
  const timelineEvents = [
    { time: '10:00 PM', event: 'Guests arrive, cocktails in parlor', suspects: ['victoria', 'lillian', 'marcus'] },
    { time: '10:30 PM', event: 'Dr. Webb arrives late', suspects: ['marcus'] },
    { time: '11:00 PM', event: 'Eleanor finishes work in study', suspects: ['eleanor', 'thomas'] },
    { time: '11:15 PM', event: 'Thomas seen arguing with Edmund', suspects: ['thomas'], important: true },
    { time: '11:32 PM', event: 'Grandfather clock stops (someone in hallway)', suspects: [], important: true },
    { time: '11:45 PM', event: 'Midnight toast prepared', suspects: ['james', 'thomas'] },
    { time: '11:47 PM', event: 'Edmund found dead by James', suspects: ['james'], important: true },
    { time: '12:00 AM', event: 'Police called, manor sealed', suspects: [] },
  ]

  if (!isOpen) return null

  const getCharacterName = (id: string) => {
    return characters.find((c) => c.id === id)?.name || id
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
            { id: 'evidence', label: 'Evidence', count: collectedEvidence.length, max: 5 },
            { id: 'suspects', label: 'Suspects', count: characters.length },
            { id: 'timeline', label: 'Timeline' },
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
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1">
                  ({tab.count}{tab.max ? `/${tab.max}` : ''})
                </span>
              )}
            </button>
          ))}
          {/* Contradictions badge if any */}
          {contradictions.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-noir-blood">
              <span className="text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                {contradictions.length} Contradiction{contradictions.length > 1 ? 's' : ''} Found
              </span>
              <span className="w-2 h-2 rounded-full bg-noir-blood animate-pulse" />
            </div>
          )}
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
                    Explore the manor and examine glowing objects to find clues.
                  </p>
                </div>
              ) : (
                <>
                  {collectedEvidence.length < 5 && (
                    <div className="text-center py-2 mb-4 bg-noir-gold/10 border border-noir-gold/30 rounded-sm">
                      <p className="text-noir-gold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                        Collect {5 - collectedEvidence.length} more piece{5 - collectedEvidence.length > 1 ? 's' : ''} of evidence to make an accusation
                      </p>
                    </div>
                  )}
                  {collectedEvidence.map((evidence) => {
                    const evidenceData = EVIDENCE_DATABASE[evidence.source]
                    return (
                      <div
                        key={evidence.id}
                        className="p-4 bg-noir-cream/90 text-noir-black rounded-sm shadow-lg transform rotate-[-0.5deg] hover:rotate-0 transition-transform"
                        style={{
                          boxShadow: '4px 4px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                              {evidenceData?.name || evidence.description}
                            </p>
                            <p className="text-sm text-noir-smoke mt-1">
                              {evidenceData?.description || evidence.source}
                            </p>
                            {evidenceData?.hint && (
                              <p className="text-sm text-amber-800 mt-2 italic" style={{ fontFamily: 'Georgia, serif' }}>
                                "{evidenceData.hint}"
                              </p>
                            )}
                            {evidenceData?.relatedCharacter && (
                              <p className="text-xs text-noir-smoke/70 mt-1">
                                Related to: {getCharacterName(evidenceData.relatedCharacter)}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded shrink-0 ${
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
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* Suspects tab */}
          {activeTab === 'suspects' && (
            <div className="space-y-6">
              {/* Contradictions section */}
              {contradictions.length > 0 && (
                <div className="bg-noir-blood/10 border border-noir-blood/30 rounded-sm p-4 mb-4">
                  <h3
                    className="text-noir-blood text-sm font-bold uppercase tracking-wider mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Detected Contradictions ({contradictions.length})
                  </h3>
                  <div className="space-y-3">
                    {contradictions.map((contradiction) => (
                      <div
                        key={contradiction.id}
                        className="bg-noir-black/40 p-3 rounded-sm border-l-2 border-noir-blood"
                      >
                        <p className="text-noir-cream text-sm mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                          {contradiction.explanation}
                        </p>
                        <div className="flex gap-4 text-xs">
                          <div className="flex-1">
                            <span className="text-noir-gold">{contradiction.statement1.characterName}:</span>
                            <p className="text-noir-smoke italic truncate">"{contradiction.statement1.content.slice(0, 60)}..."</p>
                          </div>
                          <div className="text-noir-blood font-bold self-center">vs</div>
                          <div className="flex-1">
                            <span className="text-noir-gold">{contradiction.statement2.characterName}:</span>
                            <p className="text-noir-smoke italic truncate">"{contradiction.statement2.content.slice(0, 60)}..."</p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          {/* Compare Videos button */}
                          {videoEnabled && (
                            <button
                              onClick={() => setSelectedContradiction({
                                testimony1: {
                                  characterId: contradiction.statement1.characterId,
                                  characterName: contradiction.statement1.characterName,
                                  testimony: contradiction.statement1.content,
                                  question: contradiction.statement1.playerQuestion,
                                },
                                testimony2: {
                                  characterId: contradiction.statement2.characterId,
                                  characterName: contradiction.statement2.characterName,
                                  testimony: contradiction.statement2.content,
                                  question: contradiction.statement2.playerQuestion,
                                },
                                explanation: contradiction.explanation,
                                type: 'factual', // Default type
                              })}
                              className="text-xs text-noir-gold hover:text-noir-cream transition-colors flex items-center gap-1"
                            >
                              🎬 Compare Videos
                            </button>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            contradiction.severity === 'major' ? 'bg-noir-blood/50 text-noir-cream' :
                            contradiction.severity === 'significant' ? 'bg-amber-900/50 text-amber-200' :
                            'bg-noir-slate/50 text-noir-smoke'
                          }`}>
                            {contradiction.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspects grid */}
              <div className="grid grid-cols-2 gap-4">
                {characters.map((character) => {
                  const details = characterDetails[character.id]
                  const suspicion = getSuspicionLevel(character.id)
                  // Check if this character has contradictions
                  const charContradictions = contradictions.filter(
                    (c) => c.statement1.characterId === character.id || c.statement2.characterId === character.id
                  )
                  return (
                    <div
                      key={character.id}
                      className={`p-4 bg-noir-black/40 border rounded-sm hover:border-noir-gold/40 transition-colors ${
                        charContradictions.length > 0 ? 'border-noir-blood/50' : 'border-noir-slate/40'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Portrait */}
                        <div
                          className="w-16 h-16 shrink-0 rounded-sm flex items-center justify-center text-2xl relative"
                          style={{
                            background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
                            border: suspicion > 2 ? '2px solid #c9a227' : '2px solid #4a4a4a',
                            fontFamily: 'Georgia, serif',
                            color: '#c9a227',
                          }}
                        >
                          {character.name.charAt(0)}
                          {charContradictions.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-noir-blood rounded-full flex items-center justify-center text-[10px] text-white">
                              !
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-noir-cream font-medium"
                            style={{ fontFamily: 'Georgia, serif' }}
                          >
                            {character.name}
                          </h3>
                          <p className="text-noir-smoke text-xs italic">{character.role}</p>
                          {/* Suspicion meter */}
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-noir-smoke">Suspicion:</span>
                              <div className="flex gap-0.5">
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <div
                                    key={i}
                                    className={`w-3 h-1.5 rounded-sm ${
                                      i < suspicion ? 'bg-noir-blood' : 'bg-noir-slate/50'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Details */}
                      {details && (
                        <div className="mt-3 pt-3 border-t border-noir-slate/30 space-y-1.5 text-xs">
                          <p className="text-noir-cream/80">
                            <span className="text-noir-smoke">Alibi:</span> {details.alibi}
                          </p>
                          <p className="text-noir-cream/80">
                            <span className="text-noir-smoke">Possible motive:</span> {details.motive}
                          </p>
                          {charContradictions.length > 0 && (
                            <p className="text-noir-blood text-[10px]">
                              {charContradictions.length} contradiction{charContradictions.length > 1 ? 's' : ''} found
                            </p>
                          )}
                          <p className="text-noir-gold/80 text-[10px]">
                            Currently in: {character.location}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div className="relative">
              <h3
                className="text-noir-cream text-center mb-6"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                New Year's Eve, 1929 — The Night of the Murder
              </h3>
              {/* Timeline line */}
              <div className="absolute left-[100px] top-16 bottom-4 w-0.5 bg-noir-slate/50" />
              {/* Events */}
              <div className="space-y-4">
                {timelineEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 ${event.important ? 'relative' : ''}`}
                  >
                    {/* Time */}
                    <div
                      className={`w-[80px] text-right shrink-0 ${
                        event.important ? 'text-noir-gold font-bold' : 'text-noir-smoke'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {event.time}
                    </div>
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                        event.important
                          ? 'bg-noir-gold shadow-[0_0_8px_rgba(201,162,39,0.5)]'
                          : 'bg-noir-slate'
                      }`}
                    />
                    {/* Event */}
                    <div className="flex-1">
                      <p
                        className={`${event.important ? 'text-noir-cream font-medium' : 'text-noir-cream/80'}`}
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {event.event}
                      </p>
                      {event.suspects.length > 0 && (
                        <p className="text-xs text-noir-smoke mt-1">
                          Present: {event.suspects.map((s) => getCharacterName(s)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Note */}
              <div className="mt-8 p-4 bg-noir-blood/10 border border-noir-blood/30 rounded-sm">
                <p className="text-noir-cream/80 text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>
                  Key question: Who had access to Edmund between 11:32 PM and 11:47 PM?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pins decoration */}
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
      </div>

      {/* Video Comparison Modal */}
      {selectedContradiction && (
        <VideoComparison
          testimony1={selectedContradiction.testimony1}
          testimony2={selectedContradiction.testimony2}
          contradictionExplanation={selectedContradiction.explanation}
          contradictionType={selectedContradiction.type}
          onClose={() => setSelectedContradiction(null)}
        />
      )}
    </div>
  )
}
