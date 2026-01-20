/**
 * ContradictionCard Component
 * Displays a detected contradiction between two statements
 */

import { useState } from 'react'

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

interface ContradictionCardProps {
  contradiction: Contradiction
  onFollowUp?: (characterId: string, question: string) => void
}

export function ContradictionCard({ contradiction, onFollowUp }: ContradictionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const severityColors = {
    minor: 'border-amber-600/50 bg-amber-900/10',
    significant: 'border-orange-600/50 bg-orange-900/10',
    critical: 'border-red-600/50 bg-red-900/20',
  }

  const severityBadgeColors = {
    minor: 'bg-amber-900/50 text-amber-200',
    significant: 'bg-orange-900/50 text-orange-200',
    critical: 'bg-red-900/50 text-red-200',
  }

  const typeLabels = {
    direct: 'Direct Conflict',
    logical: 'Logical Inconsistency',
    timeline: 'Timeline Conflict',
  }

  return (
    <div
      className={`p-3 rounded border ${severityColors[contradiction.severity]} cursor-pointer transition-all hover:border-opacity-80`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-lg">!</span>
          <span className="text-xs text-noir-smoke uppercase tracking-wider">
            {typeLabels[contradiction.type]}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded ${severityBadgeColors[contradiction.severity]}`}
        >
          {contradiction.severity}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-sm text-noir-cream mb-3" style={{ fontFamily: 'Georgia, serif' }}>
        {contradiction.explanation}
      </p>

      {/* Conflicting statements */}
      <div className="space-y-2">
        {/* Statement 1 */}
        <div className="bg-noir-black/40 p-2 rounded-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-noir-gold text-xs font-medium">
              {contradiction.statement1.characterName}
            </span>
          </div>
          <p className="text-xs text-noir-smoke italic line-clamp-2">
            "{contradiction.statement1.content.slice(0, 120)}
            {contradiction.statement1.content.length > 120 ? '...' : ''}"
          </p>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center">
          <span className="text-xs text-red-500 font-bold">VS</span>
        </div>

        {/* Statement 2 */}
        <div className="bg-noir-black/40 p-2 rounded-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-noir-gold text-xs font-medium">
              {contradiction.statement2.characterName}
            </span>
          </div>
          <p className="text-xs text-noir-smoke italic line-clamp-2">
            "{contradiction.statement2.content.slice(0, 120)}
            {contradiction.statement2.content.length > 120 ? '...' : ''}"
          </p>
        </div>
      </div>

      {/* Expanded section with follow-up questions */}
      {expanded && contradiction.suggestedFollowUp && contradiction.suggestedFollowUp.length > 0 && (
        <div className="mt-3 pt-3 border-t border-noir-slate/30">
          <p className="text-xs text-noir-gold uppercase tracking-wider mb-2">
            Suggested Follow-ups
          </p>
          <div className="space-y-1">
            {contradiction.suggestedFollowUp.map((question, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  // Determine which character to ask based on the question
                  const targetId =
                    question.toLowerCase().includes(contradiction.statement1.characterName.toLowerCase())
                      ? contradiction.statement1.characterId
                      : contradiction.statement2.characterId
                  onFollowUp?.(targetId, question)
                }}
                className="w-full text-left p-2 bg-noir-slate/30 rounded text-xs text-noir-cream hover:bg-noir-slate/50 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                "{question}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expand indicator */}
      <div className="mt-2 text-center">
        <span className="text-[10px] text-noir-smoke">
          {expanded ? '▲ Less' : '▼ More'}
        </span>
      </div>
    </div>
  )
}
