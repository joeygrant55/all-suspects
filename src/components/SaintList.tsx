import { useEffect, useState } from 'react'
import { useSaintsStore } from '../game/state'

interface SaintSummary {
  id: string
  name: string
  titles: string[]
  patronage: string[]
  topics: string[]
  feastDay: string | null
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function SaintList() {
  const [saints, setSaints] = useState<SaintSummary[]>([])
  const [loading, setLoading] = useState(true)
  const selectedSaintId = useSaintsStore((s) => s.selectedSaintId)
  const selectSaint = useSaintsStore((s) => s.selectSaint)

  useEffect(() => {
    fetch(`${API_BASE}/api/saints`)
      .then((res) => res.json())
      .then((data) => {
        setSaints(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-[var(--text-secondary)]">
        Loading saints...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Saints
      </h2>
      {saints.map((saint) => {
        const isSelected = selectedSaintId === saint.id
        return (
          <button
            key={saint.id}
            onClick={() => selectSaint(saint.id)}
            className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-all ${
              isSelected
                ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                : 'border-[#222] bg-[var(--bg-secondary)] hover:border-[#444]'
            }`}
          >
            <span className="font-serif text-lg font-semibold text-[var(--text-primary)]">
              {saint.name}
            </span>
            {saint.titles.length > 0 && (
              <span className="text-xs text-[var(--text-secondary)]">
                {saint.titles.slice(0, 2).join(' · ')}
              </span>
            )}
            {saint.patronage.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {saint.patronage.slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
