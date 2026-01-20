/**
 * TheoryBuilder Component
 * Allows players to build and test theories about the case
 */

import { useState, useCallback } from 'react'

interface Character {
  id: string
  name: string
  role: string
}

interface TheoryEvaluation {
  score: number
  grade: string
  verdict: string
  supports?: string[]
  contradicts?: string[]
  missing?: string[]
  watsonComment?: string
}

interface TheoryBuilderProps {
  characters: Character[]
  onEvaluate: (theory: {
    accusedId: string
    motive: string
    method: string
    opportunity: string
  }) => Promise<TheoryEvaluation>
  onQuickEvaluate?: (theory: {
    accusedId: string
    motive: string
    opportunity: string
  }) => Promise<{ score: number; grade: string; verdict: string }>
}

export function TheoryBuilder({ characters, onEvaluate, onQuickEvaluate }: TheoryBuilderProps) {
  const [accusedId, setAccusedId] = useState('')
  const [motive, setMotive] = useState('')
  const [method, setMethod] = useState('')
  const [opportunity, setOpportunity] = useState('')
  const [evaluation, setEvaluation] = useState<TheoryEvaluation | null>(null)
  const [quickScore, setQuickScore] = useState<{ score: number; grade: string } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  // Quick evaluate on changes
  const handleQuickEvaluate = useCallback(async () => {
    if (!accusedId || !onQuickEvaluate) return
    try {
      const result = await onQuickEvaluate({ accusedId, motive, opportunity })
      setQuickScore({ score: result.score, grade: result.grade })
    } catch {
      // Silent fail for quick evaluate
    }
  }, [accusedId, motive, opportunity, onQuickEvaluate])

  const handleSubmit = async () => {
    if (!accusedId) return

    setIsEvaluating(true)
    try {
      const result = await onEvaluate({
        accusedId,
        motive,
        method,
        opportunity,
      })
      setEvaluation(result)
    } catch (error) {
      console.error('Theory evaluation failed:', error)
    } finally {
      setIsEvaluating(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-400'
      case 'B':
        return 'text-blue-400'
      case 'C':
        return 'text-yellow-400'
      case 'D':
        return 'text-orange-400'
      case 'F':
        return 'text-red-400'
      default:
        return 'text-noir-smoke'
    }
  }

  const getVerdictBadge = (verdict: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      compelling: { bg: 'bg-green-900/50', text: 'text-green-200' },
      plausible: { bg: 'bg-blue-900/50', text: 'text-blue-200' },
      weak: { bg: 'bg-yellow-900/50', text: 'text-yellow-200' },
      flawed: { bg: 'bg-orange-900/50', text: 'text-orange-200' },
      dismissed: { bg: 'bg-red-900/50', text: 'text-red-200' },
    }
    return badges[verdict] || { bg: 'bg-noir-slate', text: 'text-noir-smoke' }
  }

  return (
    <div className="space-y-4">
      {/* Theory Form */}
      <div className="space-y-3">
        {/* Suspect Selection */}
        <div>
          <label className="block text-xs text-noir-gold uppercase tracking-wider mb-1">
            Accused
          </label>
          <select
            value={accusedId}
            onChange={(e) => {
              setAccusedId(e.target.value)
              setEvaluation(null)
            }}
            onBlur={handleQuickEvaluate}
            className="w-full bg-noir-black/50 border border-noir-slate/50 rounded px-3 py-2 text-noir-cream text-sm focus:outline-none focus:border-noir-gold/50"
          >
            <option value="">Select a suspect...</option>
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name} - {char.role}
              </option>
            ))}
          </select>
        </div>

        {/* Motive */}
        <div>
          <label className="block text-xs text-noir-gold uppercase tracking-wider mb-1">
            Motive
          </label>
          <textarea
            value={motive}
            onChange={(e) => {
              setMotive(e.target.value)
              setEvaluation(null)
            }}
            onBlur={handleQuickEvaluate}
            placeholder="Why would they commit murder?"
            rows={2}
            className="w-full bg-noir-black/50 border border-noir-slate/50 rounded px-3 py-2 text-noir-cream text-sm placeholder-noir-smoke/50 focus:outline-none focus:border-noir-gold/50 resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </div>

        {/* Method */}
        <div>
          <label className="block text-xs text-noir-gold uppercase tracking-wider mb-1">
            Method
          </label>
          <textarea
            value={method}
            onChange={(e) => {
              setMethod(e.target.value)
              setEvaluation(null)
            }}
            placeholder="How did they do it?"
            rows={2}
            className="w-full bg-noir-black/50 border border-noir-slate/50 rounded px-3 py-2 text-noir-cream text-sm placeholder-noir-smoke/50 focus:outline-none focus:border-noir-gold/50 resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </div>

        {/* Opportunity */}
        <div>
          <label className="block text-xs text-noir-gold uppercase tracking-wider mb-1">
            Opportunity
          </label>
          <textarea
            value={opportunity}
            onChange={(e) => {
              setOpportunity(e.target.value)
              setEvaluation(null)
            }}
            onBlur={handleQuickEvaluate}
            placeholder="When and how did they have access?"
            rows={2}
            className="w-full bg-noir-black/50 border border-noir-slate/50 rounded px-3 py-2 text-noir-cream text-sm placeholder-noir-smoke/50 focus:outline-none focus:border-noir-gold/50 resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
          />
        </div>

        {/* Quick score indicator */}
        {quickScore && !evaluation && (
          <div className="flex items-center gap-2 p-2 bg-noir-black/30 rounded">
            <span className="text-xs text-noir-smoke">Preliminary assessment:</span>
            <span className={`text-sm font-bold ${getGradeColor(quickScore.grade)}`}>
              {quickScore.grade}
            </span>
            <span className="text-xs text-noir-smoke">({quickScore.score}/100)</span>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!accusedId || isEvaluating}
          className="w-full py-2 bg-noir-gold text-noir-black font-medium rounded hover:bg-noir-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {isEvaluating ? 'Watson is analyzing...' : 'Evaluate Theory'}
        </button>
      </div>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="p-4 bg-noir-black/50 rounded border border-noir-slate/30 space-y-4">
          {/* Score and Grade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-4xl font-bold ${getGradeColor(evaluation.grade)}`}>
                {evaluation.grade}
              </div>
              <div>
                <p className="text-noir-cream text-sm">Score: {evaluation.score}/100</p>
                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded ${getVerdictBadge(evaluation.verdict).bg} ${getVerdictBadge(evaluation.verdict).text}`}
                >
                  {evaluation.verdict}
                </span>
              </div>
            </div>
          </div>

          {/* Watson's Comment */}
          {evaluation.watsonComment && (
            <div className="p-3 bg-noir-gold/10 border-l-2 border-noir-gold rounded-r">
              <p className="text-xs text-noir-gold uppercase tracking-wider mb-1">
                Watson's Assessment
              </p>
              <p
                className="text-sm text-noir-cream italic"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                "{evaluation.watsonComment}"
              </p>
            </div>
          )}

          {/* Supporting Evidence */}
          {evaluation.supports && evaluation.supports.length > 0 && (
            <div>
              <p className="text-xs text-green-400 uppercase tracking-wider mb-1">
                Supporting Evidence
              </p>
              <ul className="space-y-1">
                {evaluation.supports.map((item, idx) => (
                  <li key={idx} className="text-xs text-noir-smoke flex items-start gap-1">
                    <span className="text-green-400">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contradicting Evidence */}
          {evaluation.contradicts && evaluation.contradicts.length > 0 && (
            <div>
              <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
                Contradicting Evidence
              </p>
              <ul className="space-y-1">
                {evaluation.contradicts.map((item, idx) => (
                  <li key={idx} className="text-xs text-noir-smoke flex items-start gap-1">
                    <span className="text-red-400">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Information */}
          {evaluation.missing && evaluation.missing.length > 0 && (
            <div>
              <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">
                To Strengthen This Theory
              </p>
              <ul className="space-y-1">
                {evaluation.missing.map((item, idx) => (
                  <li key={idx} className="text-xs text-noir-smoke flex items-start gap-1">
                    <span className="text-amber-400">?</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
