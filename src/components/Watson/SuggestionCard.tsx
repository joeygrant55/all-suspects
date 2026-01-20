/**
 * SuggestionCard Component
 * Displays Watson's investigation suggestions
 */

interface Suggestion {
  id: string
  type: 'follow_up' | 'new_line' | 'evidence' | 'comparison'
  priority: 'low' | 'medium' | 'high'
  text: string
  reasoning: string
  targetCharacter?: string
}

interface SuggestionCardProps {
  suggestion: Suggestion
  onAction?: (suggestion: Suggestion) => void
  characterNames?: Record<string, string>
}

export function SuggestionCard({ suggestion, onAction, characterNames }: SuggestionCardProps) {
  const priorityColors = {
    low: 'border-noir-slate/50',
    medium: 'border-amber-600/30',
    high: 'border-noir-gold/50',
  }

  const priorityBadges = {
    low: { bg: 'bg-noir-slate/50', text: 'text-noir-smoke' },
    medium: { bg: 'bg-amber-900/50', text: 'text-amber-200' },
    high: { bg: 'bg-noir-gold/20', text: 'text-noir-gold' },
  }

  const typeIcons = {
    follow_up: '?',
    new_line: '→',
    evidence: '!',
    comparison: '⇄',
  }

  const typeLabels = {
    follow_up: 'Follow Up',
    new_line: 'New Lead',
    evidence: 'Examine Evidence',
    comparison: 'Compare',
  }

  return (
    <div
      className={`p-3 bg-noir-black/30 rounded border ${priorityColors[suggestion.priority]} hover:bg-noir-black/50 transition-colors cursor-pointer`}
      onClick={() => onAction?.(suggestion)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-noir-gold text-lg">{typeIcons[suggestion.type]}</span>
          <span className="text-[10px] text-noir-smoke uppercase tracking-wider">
            {typeLabels[suggestion.type]}
          </span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${priorityBadges[suggestion.priority].bg} ${priorityBadges[suggestion.priority].text}`}
        >
          {suggestion.priority}
        </span>
      </div>

      {/* Suggestion text */}
      <p
        className="text-sm text-noir-cream mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {suggestion.text}
      </p>

      {/* Reasoning */}
      <p className="text-xs text-noir-smoke italic">
        {suggestion.reasoning}
      </p>

      {/* Target character if applicable */}
      {suggestion.targetCharacter && characterNames && (
        <div className="mt-2 pt-2 border-t border-noir-slate/30 flex items-center gap-2">
          <span className="text-[10px] text-noir-smoke">Target:</span>
          <span className="text-xs text-noir-gold">
            {characterNames[suggestion.targetCharacter] || suggestion.targetCharacter}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * SuggestionList Component
 * Displays a list of suggestions with categories
 */
interface SuggestionListProps {
  suggestions: Suggestion[]
  onAction?: (suggestion: Suggestion) => void
  characterNames?: Record<string, string>
}

export function SuggestionList({ suggestions, onAction, characterNames }: SuggestionListProps) {
  // Group by priority
  const highPriority = suggestions.filter((s) => s.priority === 'high')
  const mediumPriority = suggestions.filter((s) => s.priority === 'medium')
  const lowPriority = suggestions.filter((s) => s.priority === 'low')

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-noir-smoke text-sm italic">
          No suggestions at this time.
        </p>
        <p className="text-noir-smoke/60 text-xs mt-1">
          Continue investigating to receive guidance.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* High priority */}
      {highPriority.length > 0 && (
        <div>
          <p className="text-xs text-noir-gold uppercase tracking-wider mb-2">
            Recommended
          </p>
          <div className="space-y-2">
            {highPriority.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAction={onAction}
                characterNames={characterNames}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium priority */}
      {mediumPriority.length > 0 && (
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-wider mb-2">
            Worth Exploring
          </p>
          <div className="space-y-2">
            {mediumPriority.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAction={onAction}
                characterNames={characterNames}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low priority */}
      {lowPriority.length > 0 && (
        <div>
          <p className="text-xs text-noir-smoke uppercase tracking-wider mb-2">
            Optional
          </p>
          <div className="space-y-2">
            {lowPriority.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAction={onAction}
                characterNames={characterNames}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
