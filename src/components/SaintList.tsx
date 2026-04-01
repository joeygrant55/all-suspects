import { useCallback, useEffect, useState } from 'react'
import { useSaintsStore } from '../game/state'
import { buildApiUrl } from '../api/client'

interface SaintSummary {
  id: string
  name: string
  titles: string[]
  patronage: string[]
  topics: string[]
  feastDay: string | null
}

export function SaintList() {
  const [saints, setSaints] = useState<SaintSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectedSaintId = useSaintsStore((s) => s.selectedSaintId)
  const selectSaint = useSaintsStore((s) => s.selectSaint)

  const requestSaints = useCallback(() => {
    return fetch(buildApiUrl('/api/saints'))
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unable to load the saint roster right now.')
        }

        return (await res.json()) as SaintSummary[]
      })
      .then((data) => {
        setSaints(data)
        setLoading(false)
      })
      .catch((loadError) => {
        setSaints([])
        setLoading(false)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the saint roster right now.'
        )
      })
  }, [])

  const loadSaints = useCallback(() => {
    setLoading(true)
    setError(null)
    void requestSaints()
  }, [requestSaints])

  useEffect(() => {
    void requestSaints()
  }, [requestSaints])

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Saints
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[220px] animate-pulse rounded-xl border border-[#222] bg-[var(--bg-secondary)] p-4 lg:min-w-0"
            >
              <div className="h-5 w-32 rounded bg-[#242424]" />
              <div className="mt-3 h-3 w-40 rounded bg-[#1d1d1d]" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-[#1d1d1d]" />
                <div className="h-5 w-20 rounded-full bg-[#1d1d1d]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Saints
        </h2>
        <div className="rounded-xl border border-[#3a2b2b] bg-[#1b1515] p-4 text-sm text-[var(--text-secondary)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={loadSaints}
            className="mt-3 rounded-full border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition-colors hover:bg-[var(--accent-dim)]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (saints.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Saints
        </h2>
        <div className="rounded-xl border border-[#222] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          No saints are available yet.
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 p-4">
      <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Saints
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-6">
        {saints.map((saint) => {
          const isSelected = selectedSaintId === saint.id

          return (
            <button
              key={saint.id}
              type="button"
              onClick={() => selectSaint(saint.id)}
              className={`min-w-[240px] rounded-xl border p-4 text-left transition-all lg:min-w-0 ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[0_0_0_1px_rgba(212,175,55,0.15)]'
                  : 'border-[#222] bg-[var(--bg-secondary)] hover:border-[#444]'
              }`}
            >
              <span className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                {saint.name}
              </span>
              {saint.titles.length > 0 && (
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  {saint.titles.slice(0, 2).join(' · ')}
                </span>
              )}
              {saint.patronage.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {saint.patronage.slice(0, 3).map((patronage) => (
                    <span
                      key={patronage}
                      className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                    >
                      {patronage}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
