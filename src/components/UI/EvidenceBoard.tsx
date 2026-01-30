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

function typeBadgeColor(type: string): string {
  switch (type) {
    case 'physical': return '#e74c3c'
    case 'document': return '#3498db'
    case 'testimony': return '#27ae60'
    default: return '#888'
  }
}

function pressureBarColor(level: number): string {
  if (level >= 71) return '#e74c3c'
  if (level >= 41) return '#f39c12'
  return '#27ae60'
}

// ─── Component ─────────────────────────────────────────────────────────

export function EvidenceBoard({ isOpen, onClose }: EvidenceBoardProps) {
  const collectedEvidence = useGameStore(s => s.collectedEvidence)
  const contradictions = useGameStore(s => s.contradictions)
  const characters = useGameStore(s => s.characters)
  const messages = useGameStore(s => s.messages)
  const discoveredEvidenceIds = useGameStore(s => s.discoveredEvidenceIds)

  const activeMystery = useMysteryStore(s => s.activeMystery)

  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null)
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const mysteryId = activeMystery?.id

  // All evidence from blueprint
  const allBlueprintEvidence: EvidenceData[] = useMemo(() => {
    if (!activeMystery?.evidence) return []
    return Object.values(activeMystery.evidence)
  }, [activeMystery])

  // Discovered evidence (collected or discovered IDs)
  const discoveredSet = useMemo(() => {
    const ids = new Set<string>()
    collectedEvidence.forEach(e => ids.add(e.id))
    discoveredEvidenceIds.forEach(id => ids.add(id))
    return ids
  }, [collectedEvidence, discoveredEvidenceIds])

  // Blueprint characters
  const blueprintCharacters = activeMystery?.characters ?? []

  // Messages grouped by character
  const messagesByCharacter = useMemo(() => {
    const map: Record<string, typeof messages> = {}
    messages.forEach(m => {
      if (m.characterId && m.role === 'character') {
        if (!map[m.characterId]) map[m.characterId] = []
        map[m.characterId].push(m)
      }
    })
    return map
  }, [messages])

  // Contradictions by character
  const contradictionsByCharacter = useMemo(() => {
    const map: Record<string, Contradiction[]> = {}
    contradictions.forEach(c => {
      const ids = [c.statement1.characterId, c.statement2.characterId]
      ids.forEach(id => {
        if (!map[id]) map[id] = []
        if (!map[id].includes(c)) map[id].push(c)
      })
    })
    return map
  }, [contradictions])

  // Timeline entries from worldState + messages
  const timelineEntries = useMemo(() => {
    const entries: Array<{ time: string; text: string; source?: string }> = []

    // WorldState public knowledge as timeline
    const ws = activeMystery?.worldState
    if (ws) {
      if (ws.timeOfDeath) entries.push({ time: ws.timeOfDeath, text: `Victim (${ws.victim}) found dead at ${ws.location}`, source: 'case-file' })
      ws.publicKnowledge?.forEach((fact, i) => {
        entries.push({ time: '', text: fact, source: 'public-knowledge' })
      })
    }

    // Character statements as timeline entries (first 2 per character)
    blueprintCharacters.forEach(char => {
      const charMsgs = messagesByCharacter[char.id] ?? []
      charMsgs.slice(0, 2).forEach(m => {
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
    setImgErrors(prev => new Set(prev).add(id))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1520 50%, #0a0a0f 100%)',
      color: '#e8e0d0',
      fontFamily: 'Georgia, "Times New Roman", serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(212,175,55,0.3)',
        background: 'rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#d4af37', letterSpacing: 2, textTransform: 'uppercase' }}>
          📋 Case File — {activeMystery?.title ?? 'Evidence Board'}
        </h1>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
            color: '#d4af37', padding: '8px 20px', cursor: 'pointer',
            fontFamily: 'Georgia, serif', fontSize: 14, letterSpacing: 1,
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Three-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── LEFT: Evidence Locker (30%) ─── */}
        <div style={{
          width: '30%', borderRight: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(212,175,55,0.15)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#d4af37', letterSpacing: 1 }}>
              🔒 EVIDENCE LOCKER
            </h2>
            <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
              {discoveredSet.size} found · {undiscoveredCount > 0 ? `${undiscoveredCount} remaining` : 'All discovered'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {/* Discovered evidence */}
            {allBlueprintEvidence.filter(e => discoveredSet.has(e.id)).map(ev => {
              const isExpanded = expandedEvidence === ev.id
              return (
                <div
                  key={ev.id}
                  onClick={() => setExpandedEvidence(isExpanded ? null : ev.id)}
                  style={{
                    background: isExpanded ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isExpanded ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 4, marginBottom: 8, padding: 10, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Thumbnail */}
                    {!imgErrors.has(ev.id) ? (
                      <img
                        src={getEvidenceImagePath(ev.id, mysteryId)}
                        alt={ev.name}
                        onError={() => handleImgError(ev.id)}
                        style={{
                          width: 48, height: 48, objectFit: 'cover', borderRadius: 3,
                          border: '1px solid rgba(212,175,55,0.3)', flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, background: 'rgba(212,175,55,0.1)',
                        borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {ev.type === 'physical' ? '🔍' : ev.type === 'document' ? '📄' : '💬'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 13 }}>{ev.name}</span>
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 3,
                          background: typeBadgeColor(ev.type), color: '#fff',
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>
                          {ev.type}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                        {ev.description}
                      </div>
                      {ev.pointsTo && (
                        <div style={{ fontSize: 11, color: '#d4af37', marginTop: 3 }}>
                          Points to: {ev.pointsTo}
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded && ev.detailedDescription && (
                    <div style={{
                      marginTop: 10, padding: '8px 10px', fontSize: 12, lineHeight: 1.6,
                      background: 'rgba(0,0,0,0.3)', borderRadius: 3,
                      borderLeft: '2px solid #d4af37', color: '#ccc',
                    }}>
                      {ev.detailedDescription}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Undiscovered evidence placeholders */}
            {allBlueprintEvidence.filter(e => !discoveredSet.has(e.id)).map(ev => (
              <div
                key={ev.id}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 4, marginBottom: 8, padding: 10, opacity: 0.5,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, background: 'rgba(255,255,255,0.05)',
                    borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>🔒</div>
                  <div>
                    <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>[REDACTED]</div>
                    <div style={{ fontSize: 11, color: '#444' }}>Evidence not yet discovered</div>
                  </div>
                </div>
              </div>
            ))}

            {allBlueprintEvidence.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#666', fontSize: 13 }}>
                No evidence catalogued yet. Explore rooms and interrogate suspects.
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER: Suspect Profiles (40%) ─── */}
        <div style={{
          width: '40%', borderRight: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(212,175,55,0.15)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#d4af37', letterSpacing: 1 }}>
              👤 SUSPECT PROFILES
            </h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {blueprintCharacters.map(char => {
              const gameChar = characters.find(c => c.id === char.id)
              const isExpanded = expandedSuspect === char.id
              const pressureLevel = gameChar?.pressure?.level ?? 0
              const charContradictions = contradictionsByCharacter[char.id] ?? []
              const charMessages = messagesByCharacter[char.id] ?? []

              return (
                <div
                  key={char.id}
                  style={{
                    background: isExpanded ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isExpanded ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 4, marginBottom: 8, overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Collapsed header */}
                  <div
                    onClick={() => setExpandedSuspect(isExpanded ? null : char.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {!imgErrors.has(`portrait-${char.id}`) ? (
                      <img
                        src={getPortraitPath(char.id, mysteryId)}
                        alt={char.name}
                        onError={() => handleImgError(`portrait-${char.id}`)}
                        style={{
                          width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
                          border: '2px solid rgba(212,175,55,0.4)', flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(212,175,55,0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                      }}>👤</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 14 }}>{char.name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{char.role}</div>
                      {/* Pressure meter */}
                      <div style={{
                        marginTop: 4, height: 4, background: 'rgba(255,255,255,0.1)',
                        borderRadius: 2, overflow: 'hidden', width: '100%',
                      }}>
                        <div style={{
                          height: '100%', width: `${Math.min(pressureLevel, 100)}%`,
                          background: pressureBarColor(pressureLevel),
                          borderRadius: 2, transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                    <span style={{ color: '#666', fontSize: 16 }}>{isExpanded ? '▾' : '▸'}</span>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Alibi */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: '#d4af37', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                          Alibi
                        </div>
                        <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, fontStyle: 'italic' }}>
                          "{char.alibi || 'No alibi provided.'}"
                        </div>
                      </div>

                      {/* Public info as motive proxy */}
                      {char.publicInfo && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: '#d4af37', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Background
                          </div>
                          <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
                            {char.publicInfo}
                          </div>
                        </div>
                      )}

                      {/* Key statements */}
                      {charMessages.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: '#d4af37', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Key Statements ({charMessages.length})
                          </div>
                          {charMessages.slice(0, 5).map(m => (
                            <div key={m.id} style={{
                              fontSize: 11, color: '#aaa', lineHeight: 1.4, marginBottom: 4,
                              paddingLeft: 8, borderLeft: '2px solid rgba(255,255,255,0.1)',
                            }}>
                              "{m.content.slice(0, 150)}{m.content.length > 150 ? '…' : ''}"
                            </div>
                          ))}
                          {charMessages.length > 5 && (
                            <div style={{ fontSize: 10, color: '#666' }}>
                              +{charMessages.length - 5} more statements
                            </div>
                          )}
                        </div>
                      )}

                      {/* Contradictions */}
                      {charContradictions.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: '#e74c3c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            ⚠ Contradictions ({charContradictions.length})
                          </div>
                          {charContradictions.map(c => (
                            <div key={c.id} style={{
                              fontSize: 11, padding: 8, marginBottom: 4,
                              background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)',
                              borderRadius: 3, lineHeight: 1.4,
                            }}>
                              <div style={{ color: '#e8a0a0' }}>{c.explanation}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {charMessages.length === 0 && charContradictions.length === 0 && (
                        <div style={{ marginTop: 10, fontSize: 11, color: '#555', fontStyle: 'italic' }}>
                          No interrogation data yet. Question this suspect to learn more.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {blueprintCharacters.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#666', fontSize: 13 }}>
                No suspects identified.
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Timeline + Contradictions (30%) ─── */}
        <div style={{
          width: '30%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Timeline */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(212,175,55,0.15)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, color: '#d4af37', letterSpacing: 1 }}>
              🕐 TIMELINE
            </h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {timelineEntries.length > 0 ? timelineEntries.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 10, fontSize: 12,
                paddingLeft: 12, borderLeft: '2px solid rgba(212,175,55,0.3)',
              }}>
                <div style={{ minWidth: 50, color: '#d4af37', fontWeight: 'bold', fontSize: 11 }}>
                  {entry.time || '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ccc', lineHeight: 1.4 }}>{entry.text}</div>
                  {entry.source && entry.source !== 'case-file' && entry.source !== 'public-knowledge' && (
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>— {entry.source}</div>
                  )}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#666', fontSize: 12 }}>
                Timeline data will appear as you investigate.
              </div>
            )}

            {/* Contradictions section */}
            <div style={{
              marginTop: 16, paddingTop: 16,
              borderTop: '1px solid rgba(231,76,60,0.3)',
            }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#e74c3c', letterSpacing: 1 }}>
                ⚠ CONTRADICTIONS ({contradictions.length})
              </h3>
              {contradictions.length > 0 ? contradictions.map(c => (
                <div key={c.id} style={{
                  background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
                  borderRadius: 4, padding: 10, marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11, marginBottom: 6, color: '#d4af37' }}>
                    {c.statement1.characterName} vs {c.statement2.characterName}
                    <span style={{
                      marginLeft: 8, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      background: c.severity === 'major' ? '#e74c3c' : c.severity === 'significant' ? '#e67e22' : '#888',
                      color: '#fff',
                    }}>
                      {c.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', gap: 8, fontSize: 11, lineHeight: 1.4,
                  }}>
                    <div style={{
                      flex: 1, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3,
                      borderLeft: '2px solid #e74c3c',
                    }}>
                      <div style={{ color: '#999', fontSize: 10, marginBottom: 2 }}>{c.statement1.characterName}</div>
                      <div style={{ color: '#ddd' }}>"{c.statement1.content.slice(0, 100)}{c.statement1.content.length > 100 ? '…' : ''}"</div>
                    </div>
                    <div style={{
                      flex: 1, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3,
                      borderLeft: '2px solid #e74c3c',
                    }}>
                      <div style={{ color: '#999', fontSize: 10, marginBottom: 2 }}>{c.statement2.characterName}</div>
                      <div style={{ color: '#ddd' }}>"{c.statement2.content.slice(0, 100)}{c.statement2.content.length > 100 ? '…' : ''}"</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#e8a0a0', marginTop: 6, fontStyle: 'italic' }}>
                    {c.explanation}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  No contradictions uncovered yet. Cross-reference suspect statements to find conflicts.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
