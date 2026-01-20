/**
 * WatsonPanel Component
 * Main Watson investigation assistant UI
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../../game/state'
import { ContradictionCard } from './ContradictionCard'
import { TimelineView } from './TimelineView'
import { TheoryBuilder } from './TheoryBuilder'
import { SuggestionList } from './SuggestionCard'
import {
  getWatsonContradictions,
  getWatsonTimeline,
  getWatsonSuggestions,
  evaluateWatsonTheory,
  quickEvaluateWatsonTheory,
  getWatsonSummary,
} from '../../api/client'

type Tab = 'contradictions' | 'timeline' | 'theory' | 'suggestions'

interface WatsonPanelProps {
  isOpen?: boolean
  onClose?: () => void
  onOpenChat?: (characterId: string, suggestedQuestion?: string) => void
}

interface Contradiction {
  id: string
  type: 'direct' | 'logical' | 'timeline'
  severity: 'minor' | 'significant' | 'critical'
  statement1: {
    characterId: string
    characterName: string
    content: string
  }
  statement2: {
    characterId: string
    characterName: string
    content: string
  }
  explanation: string
  suggestedFollowUp?: string[]
}

interface TimelineEvent {
  time: string
  location: string
  description: string
  sources: string[]
  confirmed: boolean
  disputed: boolean
}

interface Suggestion {
  id: string
  type: 'follow_up' | 'new_line' | 'evidence' | 'comparison'
  priority: 'low' | 'medium' | 'high'
  text: string
  reasoning: string
  targetCharacter?: string
}

interface Summary {
  totalStatements: number
  contradictionCount: number
  timelineEvents: number
}

const CHARACTER_NAMES: Record<string, string> = {
  victoria: 'Victoria Ashford',
  thomas: 'Thomas Ashford',
  eleanor: 'Eleanor Crane',
  marcus: 'Dr. Marcus Webb',
  lillian: 'Lillian Moore',
  james: 'James',
}

export function WatsonPanel({ isOpen: propIsOpen, onClose, onOpenChat }: WatsonPanelProps) {
  const [isOpen, setIsOpen] = useState(propIsOpen ?? false)
  const [activeTab, setActiveTab] = useState<Tab>('contradictions')
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasNewContradictions, setHasNewContradictions] = useState(false)

  const characters = useGameStore((state) => state.characters)

  // Sync with prop
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen)
    }
  }, [propIsOpen])

  // Fetch data when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchWatsonData()
    }
  }, [isOpen])

  const fetchWatsonData = async () => {
    setIsLoading(true)
    try {
      const [contraRes, timeRes, suggRes, summaryRes] = await Promise.all([
        getWatsonContradictions(),
        getWatsonTimeline(),
        getWatsonSuggestions(),
        getWatsonSummary(),
      ])

      // Check for new contradictions
      if (contraRes.contradictions.length > contradictions.length) {
        setHasNewContradictions(true)
      }

      setContradictions(contraRes.contradictions)
      setTimeline(timeRes.timeline)
      setSuggestions(suggRes.suggestions)
      setSummary(summaryRes)
    } catch (error) {
      console.error('Failed to fetch Watson data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowUp = useCallback((characterId: string, question: string) => {
    onOpenChat?.(characterId, question)
    setIsOpen(false)
    onClose?.()
  }, [onOpenChat, onClose])

  const handleSuggestionAction = useCallback((suggestion: Suggestion) => {
    if (suggestion.targetCharacter) {
      onOpenChat?.(suggestion.targetCharacter)
      setIsOpen(false)
      onClose?.()
    }
  }, [onOpenChat, onClose])

  const handleEvaluateTheory = useCallback(async (theory: {
    accusedId: string
    motive: string
    method: string
    opportunity: string
  }) => {
    const result = await evaluateWatsonTheory({
      accusedId: theory.accusedId,
      accusedName: CHARACTER_NAMES[theory.accusedId] || theory.accusedId,
      motive: theory.motive,
      method: theory.method,
      opportunity: theory.opportunity,
    })
    return result.evaluation
  }, [])

  const handleQuickEvaluate = useCallback(async (theory: {
    accusedId: string
    motive: string
    opportunity: string
  }) => {
    return quickEvaluateWatsonTheory(theory)
  }, [])

  const handleToggle = () => {
    if (isOpen) {
      onClose?.()
    }
    setIsOpen(!isOpen)
    setHasNewContradictions(false)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`fixed right-4 bottom-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isOpen
            ? 'bg-noir-slate text-noir-smoke'
            : 'bg-noir-gold text-noir-black hover:bg-noir-gold/90'
        }`}
        title="Watson - Investigation Assistant"
      >
        <span className="text-2xl font-serif">W</span>
        {/* Notification badge */}
        {hasNewContradictions && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            !
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-noir-charcoal border-l border-noir-gold/30 z-40 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-noir-slate/30 bg-noir-black/30">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-noir-gold text-xl"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Watson
                </h2>
                <p className="text-noir-smoke text-xs mt-0.5">
                  Your investigation assistant
                </p>
              </div>
              <button
                onClick={handleToggle}
                className="w-8 h-8 flex items-center justify-center text-noir-smoke hover:text-noir-cream transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            {summary && (
              <div className="flex gap-4 mt-3 text-xs">
                <div>
                  <span className="text-noir-smoke">Statements:</span>
                  <span className="text-noir-gold ml-1">{summary.totalStatements}</span>
                </div>
                <div>
                  <span className="text-noir-smoke">Contradictions:</span>
                  <span className={`ml-1 ${summary.contradictionCount > 0 ? 'text-red-400' : 'text-noir-gold'}`}>
                    {summary.contradictionCount}
                  </span>
                </div>
                <div>
                  <span className="text-noir-smoke">Timeline:</span>
                  <span className="text-noir-gold ml-1">{summary.timelineEvents}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-noir-slate/30">
            {([
              { id: 'contradictions' as Tab, label: 'Conflicts', badge: contradictions.length },
              { id: 'timeline' as Tab, label: 'Timeline' },
              { id: 'theory' as Tab, label: 'Theory' },
              { id: 'suggestions' as Tab, label: 'Hints', badge: suggestions.filter(s => s.priority === 'high').length },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'contradictions') {
                    setHasNewContradictions(false)
                  }
                }}
                className={`flex-1 py-3 text-[10px] uppercase tracking-wider transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-noir-gold border-b-2 border-noir-gold'
                    : 'text-noir-smoke hover:text-noir-cream'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-1 ${
                    tab.id === 'contradictions' ? 'text-red-400' : 'text-noir-gold'
                  }`}>
                    ({tab.badge})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-noir-smoke text-sm animate-pulse">
                  Watson is analyzing...
                </div>
              </div>
            ) : (
              <>
                {/* Contradictions tab */}
                {activeTab === 'contradictions' && (
                  <div className="space-y-3">
                    {contradictions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-noir-smoke text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>
                          No contradictions detected yet.
                        </p>
                        <p className="text-noir-smoke/60 text-xs mt-2">
                          Keep questioning suspects - their stories will unravel.
                        </p>
                      </div>
                    ) : (
                      contradictions.map((contradiction) => (
                        <ContradictionCard
                          key={contradiction.id}
                          contradiction={contradiction}
                          onFollowUp={handleFollowUp}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Timeline tab */}
                {activeTab === 'timeline' && (
                  <TimelineView events={timeline} />
                )}

                {/* Theory tab */}
                {activeTab === 'theory' && (
                  <TheoryBuilder
                    characters={characters.map((c) => ({
                      id: c.id,
                      name: c.name,
                      role: c.role,
                    }))}
                    onEvaluate={handleEvaluateTheory}
                    onQuickEvaluate={handleQuickEvaluate}
                  />
                )}

                {/* Suggestions tab */}
                {activeTab === 'suggestions' && (
                  <SuggestionList
                    suggestions={suggestions}
                    onAction={handleSuggestionAction}
                    characterNames={CHARACTER_NAMES}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer - Top suggestion */}
          {suggestions.length > 0 && activeTab !== 'suggestions' && (
            <div className="p-3 border-t border-noir-slate/30 bg-noir-black/30">
              <p className="text-[10px] text-noir-gold uppercase tracking-wider mb-1">
                Watson suggests
              </p>
              <p
                className="text-xs text-noir-cream/80 line-clamp-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {suggestions[0]?.text}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
