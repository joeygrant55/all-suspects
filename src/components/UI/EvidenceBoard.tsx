import { useState, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import type { EvidenceData } from '../../types/evidence'
import type { Contradiction } from '../../game/state'

interface EvidenceBoardProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getEvidenceImagePath(evidenceId: string, mysteryId: string | undefined): string {
  if (mysteryId && mysteryId !== 'ashford-affair' && mysteryId !== 'hollywood-premiere') {
    return `/generated/${mysteryId}/assets/evidence/${evidenceId}.webp`
  }
  return `/evidence/${evidenceId}.webp`
}

function getPortraitPath(characterId: string, mysteryId: string | undefined): string {
  if (mysteryId && mysteryId !== 'ashford-affair' && mysteryId !== 'hollywood-premiere') {
    return `/generated/${mysteryId}/assets/portraits/${characterId}.png`
  }
  return `/portraits/${characterId}.png`
}

function typeBadgeColor(type: EvidenceData['type']): string {
  switch (type) {
    case 'physical':
      return '#e74c3c'
    case 'document':
      return '#3498db'
    case 'testimony':
      return '#27ae60'
    default:
      return '#888'
  }
}

function pressureBarColor(level: number): string {
  if (level >= 71) return '#e74c3c'
  if (level >= 41) return '#f39c12'
  return '#27ae60'
}

// ─── Component ─────────────────────────────────────────────────────────

export function EvidenceBoard({ isOpen, onClose }: EvidenceBoardProps) {
  const collectedEvidence = useGameStore((s) => s.collectedEvidence)
  const contradictions = useGameStore((s) => s.contradictions)
  const characters = useGameStore((s) => s.characters)
  const messages = useGameStore((s) => s.messages)
  const discoveredEvidenceIds = useGameStore((s) => s.discoveredEvidenceIds)

  const activeMystery = useMysteryStore((s) => s.activeMystery)

  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const mysteryId = activeMystery?.id

  const allBlueprintEvidence: EvidenceData[] = useMemo(() => {
    if (!activeMystery?.evidence) return []
    return Object.values(activeMystery.evidence)
  }, [activeMystery])

  const discoveredSet = useMemo(() => {
    const ids = new Set<string>()
    collectedEvidence.forEach((e) => ids.add(e.id))
    discoveredEvidenceIds.forEach((id) => ids.add(id))
    return ids
  }, [collectedEvidence, discoveredEvidenceIds])

  const blueprintCharacters = activeMystery?.characters ?? []

  const messagesByCharacter = useMemo(() => {
    const map: Record<string, typeof messages> = {}
    messages.forEach((m) => {
      if (m.characterId && m.role === 'character') {
        if (!map[m.characterId]) map[m.characterId] = []
        map[m.characterId].push(m)
      }
    })
    return map
  }, [messages])

  const contradictionsByCharacter = useMemo(() => {
    const map: Record<string, Contradiction[]> = {}
    contradictions.forEach((c) => {
      const ids = [c.statement1.characterId, c.statement2.characterId]
      ids.forEach((id) => {
        if (!map[id]) map[id] = []
        if (!map[id].includes(c)) map[id].push(c)
      })
    })
    return map
  }, [contradictions])

  const timelineEntries = useMemo(() => {
    const entries: Array<{ time: string; text: string; source?: string }> = []

    const ws = activeMystery?.worldState
    if (ws) {
      if (ws.timeOfDeath) {
        entries.push({
          time: ws.timeOfDeath,
          text: `Victim (${ws.victim}) found dead at ${ws.location}`,
          source: 'case-file',
        })
      }
      ws.publicKnowledge?.forEach((fact) => {
        entries.push({ time: '', text: fact, source: 'public-knowledge' })
      })
    }

    blueprintCharacters.forEach((char) => {
      const charMsgs = messagesByCharacter[char.id] ?? []
      charMsgs.slice(0, 2).forEach((m) => {
        entries.push({
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: m.content.slice(0, 120) + (m.content.length > 120 ? '…' : ''),
          source: char.name,
        })
      })
    })

    return entries
  }, [activeMystery, blueprintCharacters, messagesByCharacter])

  if (!isOpen) return null

  const undiscoveredCount = allBlueprintEvidence.length - discoveredSet.size

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(135deg,_#0a0a0f_0%,_#1a1520_50%,_#0a0a0f_100%)] text-[#e8e0d0]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-noir-gold/40 bg-black/50 px-3 sm:px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl text-noir-gold tracking-[0.08em] uppercase leading-snug pr-2">
          📋 Case File — {activeMystery?.title ?? 'Evidence Board'}
        </h1>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-noir-gold/15 border border-noir-gold/50 text-noir-gold text-xs sm:text-sm"
        >
          ✕ CLOSE
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden md:flex">
        {/* Evidence locker */}
        <section className="w-full md:w-[30%] min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-noir-gold/30">
          <div className="px-3 sm:px-4 py-3 border-b border-noir-gold/20 bg-black/30">
            <h2 className="text-noir-gold text-sm sm:text-base">🔒 EVIDENCE LOCKER</h2>
            <p className="text-[11px] sm:text-xs text-[#888] mt-1">
              {discoveredSet.size} found · {undiscoveredCount > 0 ? `${undiscoveredCount} remaining` : 'All discovered'}
            </p>
          </div>
          <div className="min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-1">
              {allBlueprintEvidence.filter((e) => discoveredSet.has(e.id)).map((ev) => {
                const isExpanded = expandedEvidence === ev.id
                return (
                  <button
                    key={ev.id}
                    onClick={() => setExpandedEvidence(isExpanded ? null : ev.id)}
                    className={`text-left p-2 border ${
                      isExpanded ? 'bg-noir-gold/10 border-noir-gold/40' : 'bg-white/5 border-white/10'
                    } transition-colors rounded`}
                  >
                    <div className="flex gap-2 sm:gap-3 items-start">
                      {!imgErrors.has(ev.id) ? (
                        <img
                          src={getEvidenceImagePath(ev.id, mysteryId)}
                          alt={ev.name}
                          onError={() => handleImgError(ev.id)}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded border border-noir-gold/30 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-noir-gold/10 rounded border border-noir-gold/30 flex items-center justify-center text-lg flex-shrink-0">
                          {ev.type === 'physical' ? '🔍' : ev.type === 'document' ? '📄' : '💬'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold">{ev.name}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded text-white"
                            style={{ background: typeBadgeColor(ev.type) }}
                          >
                            {ev.type}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] sm:text-xs text-[#999] leading-snug">
                          {isExpanded ? ev.description : ev.description.slice(0, 120)}
                        </p>
                        {ev.pointsTo && (
                          <p className="text-noir-gold text-[11px] mt-1">Points to: {ev.pointsTo}</p>
                        )}
                        {isExpanded && ev.detailedDescription && (
                          <p className="mt-2 text-[#bbb] text-xs leading-relaxed border-l-2 border-noir-gold pl-2">
                            {ev.detailedDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {allBlueprintEvidence.filter((e) => !discoveredSet.has(e.id)).map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white/[0.03] border border-white/10 rounded p-2 opacity-60"
                >
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
                      🔒
                    </div>
                    <div>
                      <p className="text-xs text-[#666] italic">[REDACTED]</p>
                      <p className="text-[11px] text-[#444]">Evidence not yet discovered</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {allBlueprintEvidence.length === 0 && (
              <p className="text-center text-[#666] text-sm py-5">No evidence catalogued yet. Explore rooms and interrogate suspects.</p>
            )}
          </div>
        </section>

        {/* Suspect profiles */}
        <section className="w-full md:w-[40%] min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-noir-gold/30">
          <div className="px-3 sm:px-4 py-3 border-b border-noir-gold/20 bg-black/30">
            <h2 className="text-noir-gold text-sm sm:text-base">👤 SUSPECT PROFILES</h2>
          </div>
          <div className="min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2">
            {blueprintCharacters.map((char) => {
              const gameChar = characters.find((c) => c.id === char.id)
              const isExpanded = expandedSuspect === char.id
              const pressureLevel = gameChar?.pressure?.level ?? 0
              const charContradictions = contradictionsByCharacter[char.id] ?? []
              const charMessages = messagesByCharacter[char.id] ?? []

              return (
                <div key={char.id} className="border border-white/10 rounded bg-white/5">
                  <button
                    onClick={() => setExpandedSuspect(isExpanded ? null : char.id)}
                    className={`w-full text-left p-2 sm:p-3 border-b border-white/10 ${
                      isExpanded ? 'bg-noir-gold/10 border-noir-gold/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {!imgErrors.has(`portrait-${char.id}`) ? (
                        <img
                          src={getPortraitPath(char.id, mysteryId)}
                          alt={char.name}
                          onError={() => handleImgError(`portrait-${char.id}`)}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-noir-gold/40 flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-noir-gold/20 border border-noir-gold/40 flex items-center justify-center text-lg flex-shrink-0">
                          👤
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-semibold">{char.name}</p>
                        <p className="text-[11px] sm:text-xs text-[#999]">{char.role}</p>
                        <div className="mt-2 h-1 bg-white/10 rounded overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(pressureLevel, 100)}%`,
                              background: pressureBarColor(pressureLevel),
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-[#666]">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-2 sm:p-3 space-y-3">
                      <div>
                        <p className="text-[10px] sm:text-[11px] text-noir-gold uppercase tracking-[0.12em]">Alibi</p>
                        <p className="text-[#bbb] italic text-sm">{`"${char.alibi || 'No alibi provided.'}"`}</p>
                      </div>

                      {char.publicInfo && (
                        <div>
                          <p className="text-[10px] sm:text-[11px] text-noir-gold uppercase tracking-[0.12em]">Background</p>
                          <p className="text-[#bbb] text-sm">{char.publicInfo}</p>
                        </div>
                      )}

                      {charMessages.length > 0 && (
                        <div>
                          <p className="text-[10px] sm:text-[11px] text-noir-gold uppercase tracking-[0.12em]">Key Statements ({charMessages.length})</p>
                          <div className="space-y-1.5">
                            {charMessages.slice(0, 5).map((m) => (
                              <p key={m.id} className="text-xs text-[#aaa] border-l-2 border-noir-gold/50 pl-2">
                                {`"${m.content.slice(0, 150)}${m.content.length > 150 ? '…' : ''}"`}
                              </p>
                            ))}
                            {charMessages.length > 5 && (
                              <p className="text-[10px] text-[#666]">+{charMessages.length - 5} more statements</p>
                            )}
                          </div>
                        </div>
                      )}

                      {charContradictions.length > 0 ? (
                        <div>
                          <p className="text-[10px] sm:text-[11px] text-red-300 uppercase tracking-[0.12em]">⚠ Contradictions ({charContradictions.length})</p>
                          <div className="space-y-1.5">
                            {charContradictions.map((c) => (
                              <p key={c.id} className="text-xs text-[#e8a0a0] bg-red-900/20 border border-red-600/30 rounded p-2">
                                {c.explanation}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#555] italic">No interrogation data yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {blueprintCharacters.length === 0 && (
              <p className="text-center text-[#666] text-sm py-5">No suspects identified.</p>
            )}
          </div>
        </section>

        {/* Timeline + Contradictions */}
        <section className="w-full md:w-[30%] min-h-0 flex flex-col">
          <div className="px-3 sm:px-4 py-3 border-b border-noir-gold/20 bg-black/30">
            <h2 className="text-noir-gold text-sm sm:text-base">🕐 TIMELINE</h2>
          </div>
          <div className="min-h-0 overflow-y-auto px-3 sm:px-4 py-3">
            <div className="space-y-2">
              {timelineEntries.length > 0 ? (
                timelineEntries.map((entry, i) => (
                  <div key={i} className="flex gap-3 text-xs sm:text-sm border-l-2 border-noir-gold/40 pl-3">
                    <p className="w-10 sm:w-12 text-noir-gold font-semibold shrink-0">{entry.time || '—'}</p>
                    <div>
                      <p className="text-[#ccc] leading-relaxed">{entry.text}</p>
                      {entry.source && entry.source !== 'case-file' && entry.source !== 'public-knowledge' && (
                        <p className="text-[10px] text-[#888] mt-1">— {entry.source}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#666] text-center py-4">Timeline data will appear as you investigate.</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-red-500/30">
              <h3 className="text-sm text-red-300 uppercase tracking-[0.12em] mb-3">⚠ Contradictions ({contradictions.length})</h3>
              <div className="space-y-2">
                {contradictions.length > 0 ? (
                  contradictions.map((c) => (
                    <div key={c.id} className="rounded border border-red-500/30 bg-red-950/30 p-2 text-xs text-[#e8a0a0]">
                      <p className="text-noir-gold mb-1">{c.statement1.characterName} vs {c.statement2.characterName}
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px]">
                          {c.severity.toUpperCase()}
                        </span>
                      </p>
                      <div className="space-y-1">
                        <p className="border-l border-red-500/60 pl-2">{`“${c.statement1.content.slice(0, 100)}${c.statement1.content.length > 100 ? '…' : ''}”`}</p>
                        <p className="border-l border-red-500/60 pl-2">{`“${c.statement2.content.slice(0, 100)}${c.statement2.content.length > 100 ? '…' : ''}”`}</p>
                      </div>
                      <p className="italic text-[#e8a0a0] mt-2">{c.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#666] italic">No contradictions uncovered yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
