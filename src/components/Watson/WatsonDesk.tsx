/**
 * WatsonDesk Component
 * Full investigation interface - detective's desk aesthetic
 * Slides up from bottom with three-column layout
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { ContradictionCard } from './ContradictionCard'
import { TimelineView } from './TimelineView'
import { TheoryBuilder } from './TheoryBuilder'
import {
  getWatsonContradictions,
  getWatsonTimeline,
  evaluateWatsonTheory,
  quickEvaluateWatsonTheory,
} from '../../api/client'

export type DeskTab = 'contradictions' | 'timeline' | 'theory'

export interface Contradiction {
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

export interface TimelineEvent {
  time: string
  location: string
  description: string
  sources: string[]
  confirmed: boolean
  disputed: boolean
}

export interface WatsonDeskProps {
  isOpen: boolean
  onClose: () => void
  activeTab?: DeskTab
  onTabChange?: (tab: DeskTab) => void
  onOpenChat?: (characterId: string, suggestedQuestion?: string) => void
  onCompareVideos?: (contradictionId: string) => void
}

const CHARACTER_NAMES: Record<string, string> = {
  victoria: 'Victoria Ashford',
  thomas: 'Thomas Ashford',
  eleanor: 'Eleanor Crane',
  marcus: 'Dr. Marcus Webb',
  lillian: 'Lillian Moore',
  james: 'James',
}

export function WatsonDesk({
  isOpen,
  onClose,
  activeTab: propActiveTab,
  onTabChange,
  onOpenChat,
  onCompareVideos,
}: WatsonDeskProps) {
  const [activeTab, setActiveTab] = useState<DeskTab>(propActiveTab || 'contradictions')
  const [contradictions, setContradictions] = useState<Contradiction[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const characters = useGameStore((state) => state.characters)

  // Sync tab with prop
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab)
    }
  }, [propActiveTab])

  // Fetch data when desk opens
  useEffect(() => {
    if (isOpen) {
      fetchWatsonData()
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (!isOpen) {
        // 'W' opens the desk (handled by parent)
        return
      }

      // Escape closes desk
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // 1/2/3 switch tabs
      const tabMap: Record<string, DeskTab> = {
        '1': 'contradictions',
        '2': 'timeline',
        '3': 'theory',
      }

      if (tabMap[e.key]) {
        e.preventDefault()
        const newTab = tabMap[e.key]
        setActiveTab(newTab)
        onTabChange?.(newTab)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onTabChange])

  const fetchWatsonData = async () => {
    setIsLoading(true)
    try {
      const [contraRes, timeRes] = await Promise.all([
        getWatsonContradictions(),
        getWatsonTimeline(),
      ])
      setContradictions(contraRes.contradictions)
      setTimeline(timeRes.timeline)
    } catch (error) {
      console.error('Failed to fetch Watson data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowUp = useCallback(
    (characterId: string, question: string) => {
      onOpenChat?.(characterId, question)
      onClose()
    },
    [onOpenChat, onClose]
  )

  const handleEvaluateTheory = useCallback(
    async (theory: {
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
    },
    []
  )

  const handleQuickEvaluate = useCallback(
    async (theory: { accusedId: string; motive: string; opportunity: string }) => {
      return quickEvaluateWatsonTheory(theory)
    },
    []
  )

  const handleTabClick = (tab: DeskTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const tabs: { id: DeskTab; label: string; shortcut: string; badge?: number }[] = [
    {
      id: 'contradictions',
      label: 'Contradictions',
      shortcut: '1',
      badge: contradictions.length,
    },
    { id: 'timeline', label: 'Timeline', shortcut: '2' },
    { id: 'theory', label: 'Theory Board', shortcut: '3' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-noir-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Desk panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[50vh]
                       bg-gradient-to-b from-noir-charcoal to-noir-black
                       border-t border-noir-gold/40 shadow-2xl shadow-noir-black"
            style={{
              background: `
                linear-gradient(180deg,
                  rgba(26, 26, 26, 0.98) 0%,
                  rgba(10, 10, 10, 0.98) 100%
                ),
                url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a227' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
              `,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-noir-slate/30">
              <div className="flex items-center gap-4">
                {/* Watson Logo */}
                <div
                  className="w-10 h-10 rounded-full bg-noir-gold/20 border border-noir-gold/50
                             flex items-center justify-center"
                >
                  <span
                    className="text-noir-gold text-xl"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    W
                  </span>
                </div>
                <div>
                  <h2
                    className="text-noir-gold text-xl tracking-wide"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Watson's Desk
                  </h2>
                  <p className="text-noir-smoke text-xs">
                    Investigation Analysis & Theory Building
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 text-noir-smoke hover:text-noir-cream
                           transition-colors rounded border border-noir-slate/30 hover:border-noir-slate/50"
              >
                <span className="text-xs">Close</span>
                <kbd className="text-[10px] px-1.5 py-0.5 bg-noir-slate/50 rounded">
                  Esc
                </kbd>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b border-noir-slate/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-4 py-2 text-sm rounded-t transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-noir-slate/40 text-noir-gold border-b-2 border-noir-gold -mb-px'
                      : 'text-noir-smoke hover:text-noir-cream hover:bg-noir-slate/20'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        activeTab === tab.id
                          ? 'bg-noir-gold/20 text-noir-gold'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  <kbd
                    className={`text-[10px] px-1 py-0.5 rounded ${
                      activeTab === tab.id
                        ? 'bg-noir-gold/20 text-noir-gold'
                        : 'bg-noir-slate/30 text-noir-smoke'
                    }`}
                  >
                    {tab.shortcut}
                  </kbd>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(50vh - 140px)' }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-noir-smoke">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="italic" style={{ fontFamily: 'Georgia, serif' }}>
                      Watson is reviewing the evidence...
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Contradictions Tab */}
                  {activeTab === 'contradictions' && (
                    <div className="space-y-4">
                      {contradictions.length === 0 ? (
                        <EmptyState
                          icon="!"
                          title="No contradictions found"
                          description="Keep questioning the suspects. Their stories will eventually crack under scrutiny."
                        />
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {contradictions.map((contradiction) => (
                            <div key={contradiction.id} className="space-y-2">
                              <ContradictionCard
                                contradiction={contradiction}
                                onFollowUp={handleFollowUp}
                              />
                              {onCompareVideos && (
                                <button
                                  onClick={() => onCompareVideos(contradiction.id)}
                                  className="w-full py-2 text-xs text-noir-gold border border-noir-gold/30
                                             rounded hover:bg-noir-gold/10 transition-colors
                                             flex items-center justify-center gap-2"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                  Compare Videos Side-by-Side
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline Tab */}
                  {activeTab === 'timeline' && (
                    <TimelineView events={timeline} />
                  )}

                  {/* Theory Tab */}
                  {activeTab === 'theory' && (
                    <div className="max-w-2xl mx-auto">
                      <TheoryBuilder
                        characters={characters.map((c) => ({
                          id: c.id,
                          name: c.name,
                          role: c.role,
                        }))}
                        onEvaluate={handleEvaluateTheory}
                        onQuickEvaluate={handleQuickEvaluate}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Desk texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Empty state component
 */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="text-center py-12">
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-full bg-noir-slate/30
                   flex items-center justify-center text-2xl text-noir-smoke"
      >
        {icon}
      </div>
      <h3
        className="text-noir-cream text-lg mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-noir-smoke text-sm max-w-md mx-auto">{description}</p>
    </div>
  )
}
