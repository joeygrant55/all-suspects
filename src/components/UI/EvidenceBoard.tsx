import { useCallback, useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../game/state'
import { useMysteryStore } from '../../game/mysteryState'
import type { EvidenceData } from '../../types/evidence'
import { CharacterPortrait } from './CharacterPortrait'
import { ExaminationModal } from './ExaminationModal'
import { evaluateWatsonTheory } from '../../api/client'

interface EvidenceBoardProps {
  isOpen: boolean
  onClose: () => void
}

interface TheoryScore {
  score: number
  grade: string
  verdict: string
  supports?: string[]
  contradicts?: string[]
  missing?: string[]
  watsonComment?: string
}

interface NodeLayout {
  id: string
  x: number
  y: number
}

function getEvidenceImagePath(evidence: EvidenceData, mysteryId: string | undefined): string {
  if (evidence.image) return evidence.image
  if (mysteryId && mysteryId !== 'ashford-affair' && mysteryId !== 'hollywood-premiere') {
    return `/generated/${mysteryId}/assets/evidence/${evidence.id}.webp`
  }
  return `/evidence/${evidence.id}.webp`
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
      return '#8b4513'
    case 'document':
      return '#2f5b8d'
    default:
      return '#5b8f3a'
  }
}

function evidenceIcon(type: EvidenceData['type']) {
  switch (type) {
    case 'physical':
      return '📎'
    case 'document':
      return '📄'
    default:
      return '🗣️'
  }
}

function rotateForCard(id: string): number {
  const hash = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return (hash % 7) - 3
}

function getTabButtonClass(isActive: boolean): string {
  return `relative px-4 py-3 text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase transition-colors ${
    isActive ? 'text-noir-gold' : 'text-noir-smoke'
  }`
}

const methods = ['poison', 'weapon', 'accident', 'strangulation', 'drowning', 'arson', 'negligence']
const motives = ['greed', 'jealousy', 'revenge', 'fear', 'power']

export function EvidenceBoard({ isOpen, onClose }: EvidenceBoardProps) {
  const collectedEvidence = useGameStore((s) => s.collectedEvidence)
  const discoveredEvidenceIds = useGameStore((s) => s.discoveredEvidenceIds)
  const contradictions = useGameStore((s) => s.contradictions)
  const messages = useGameStore((s) => s.messages)
  const characters = useGameStore((s) => s.characters)
  const caseTheory = useGameStore((s) => s.caseTheory)
  const setCaseTheory = useGameStore((s) => s.setCaseTheory)
  const getCaseStrength = useGameStore((s) => s.getCaseStrength)

  const activeMystery = useMysteryStore((s) => s.activeMystery)
  const mysteryId = activeMystery?.id

  const [activeTab, setActiveTab] = useState<'wall' | 'connections' | 'case'>('wall')
  const [selectedEvidenceForModal, setSelectedEvidenceForModal] = useState<EvidenceData | null>(null)
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(caseTheory.suspectId)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(caseTheory.method)
  const [selectedMotive, setSelectedMotive] = useState<string | null>(caseTheory.motive)
  const [supportingEvidence, setSupportingEvidence] = useState<string[]>(caseTheory.supportingEvidence)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState<TheoryScore | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedSuspect(caseTheory.suspectId)
    setSelectedMethod(caseTheory.method)
    setSelectedMotive(caseTheory.motive)
    setSupportingEvidence(caseTheory.supportingEvidence)
    setResultMessage(null)
    setResultError(null)
  }, [caseTheory.suspectId, caseTheory.method, caseTheory.motive, caseTheory.supportingEvidence])

  const allBlueprintEvidence: EvidenceData[] = useMemo(() => {
    if (!activeMystery?.evidence) return []
    return Object.values(activeMystery.evidence)
  }, [activeMystery])

  const evidenceCatalog = useMemo(() => {
    const map = new Map<string, EvidenceData>()
    allBlueprintEvidence.forEach((entry) => map.set(entry.id, entry))
    return map
  }, [allBlueprintEvidence])

  const discoveredSet = useMemo(() => {
    const ids = new Set<string>()
    collectedEvidence.forEach((e) => ids.add(e.source))
    discoveredEvidenceIds.forEach((id) => ids.add(id))
    return ids
  }, [collectedEvidence, discoveredEvidenceIds])

  const blueprintCharacters = activeMystery?.characters ?? []

  const displayedSuspects = useMemo(() => {
    return blueprintCharacters
      .map((blueprintChar) => {
        const gameChar = characters.find((c) => c.id === blueprintChar.id)
        return {
          id: blueprintChar.id,
          name: gameChar?.name ?? blueprintChar.name,
          role: gameChar?.role ?? blueprintChar.role,
        }
      })
  }, [blueprintCharacters, characters])

  const suspectById = useMemo(() => {
    const map = new Map<string, string>()
    displayedSuspects.forEach((s) => map.set(s.id, s.name))
    return map
  }, [displayedSuspects])

  const suspectedColorForChar = useMemo(() => {
    const colors = ['#8b2d2d', '#2a4e8f', '#5c6b3d', '#6b2f7f', '#6b4b2f', '#2f5f64', '#705c2c']
    const map = new Map<string, string>()
    displayedSuspects.forEach((suspect, index) => map.set(suspect.id, colors[index % colors.length]))
    return map
  }, [displayedSuspects])

  const suspectQuestionedCount = useMemo(() => {
    const askedIds = new Set<string>()
    messages
      .filter((m) => m.role === 'player' && m.characterId)
      .forEach((m) => m.characterId && askedIds.add(m.characterId))
    return askedIds.size
  }, [messages])

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

    return entries
  }, [activeMystery?.worldState])

  const suspectNodes: NodeLayout[] = useMemo(() => {
    const count = displayedSuspects.length || 1
    const hStep = 100 / (count + 1)

    return displayedSuspects.map((_, i) => ({
      id: displayedSuspects[i].id,
      x: 18,
      y: 12 + hStep * (i + 1),
    }))
  }, [displayedSuspects])

  const evidenceNodes: NodeLayout[] = useMemo(() => {
    const columns = Math.max(2, Math.ceil(Math.sqrt(Math.max(allBlueprintEvidence.length, 1))))
    const xGap = 72 / columns

    return allBlueprintEvidence.map((evidence, i) => {
      const col = i % columns
      const row = Math.floor(i / columns)
      return {
        id: evidence.id,
        x: 55 + col * xGap,
        y: 14 + row * 16,
      }
    })
  }, [allBlueprintEvidence])

  const suspectNodeById = useMemo(
    () => new Map(suspectNodes.map((node) => [node.id, node])),
    [suspectNodes]
  )
  const evidenceNodeById = useMemo(
    () => new Map(evidenceNodes.map((node) => [node.id, node])),
    [evidenceNodes]
  )

  const contradictionPairs = useMemo(() => {
    const pairs = new Set<string>()
    const unique: Array<{ a: string; b: string }> = []

    contradictions.forEach((contradiction) => {
      const a = contradiction.statement1.characterId
      const b = contradiction.statement2.characterId
      if (!a || !b || a === b) return
      const key = [a, b].sort().join('::')
      if (!pairs.has(key)) {
        pairs.add(key)
        unique.push({ a, b })
      }
    })

    return unique
  }, [contradictions])

  const minSuspectsQuestionedMet = suspectQuestionedCount >= 2
  const minEvidenceMet = collectedEvidence.length >= 3
  const strength = Math.max(0, Math.min(100, getCaseStrength()))

  const lineColorForEvidence = useCallback(
    (evidence: EvidenceData, discovered: boolean) => {
      if (!discovered) return '#666'
      if (evidence.pointsTo) return '#d4af37'
      if (evidence.relatedCharacter && contradictions.some((c) => c.statement1.characterId === evidence.relatedCharacter || c.statement2.characterId === evidence.relatedCharacter)) {
        return '#e74c3c'
      }
      return '#2ecc71'
    },
    [contradictions]
  )

  const openEvidence = (id: string) => {
    const evidence = evidenceCatalog.get(id)
    if (evidence) {
      setSelectedEvidenceForModal(evidence)
    }
  }

  const toggleSupportingEvidence = (id: string) => {
    if (supportingEvidence.includes(id)) {
      const next = supportingEvidence.filter((item) => item !== id)
      setSupportingEvidence(next)
      setCaseTheory({ supportingEvidence: next })
      return
    }

    if (supportingEvidence.length < 3) {
      const next = [...supportingEvidence, id]
      setSupportingEvidence(next)
      setCaseTheory({ supportingEvidence: next })
    }
  }

  const handlePresentCase = useCallback(async () => {
    if (!selectedSuspect || !selectedMethod || !selectedMotive) return

    setIsSubmitting(true)
    setResultError(null)
    setResultMessage(null)

    try {
      setCaseTheory({
        suspectId: selectedSuspect,
        method: selectedMethod,
        motive: selectedMotive,
        supportingEvidence,
      })

      const selectedEvidence = collectedEvidence
        .filter((entry) => supportingEvidence.includes(entry.source))
        .map((entry) => entry.source)

      const selectedCharacter = displayedSuspects.find((s) => s.id === selectedSuspect)
      const evaluation = await evaluateWatsonTheory({
        accusedId: selectedSuspect,
        accusedName: selectedCharacter?.name ?? selectedSuspect,
        motive: selectedMotive,
        method: selectedMethod,
        opportunity: selectedMethod,
        supportingEvidence: selectedEvidence,
      })

      setResultMessage({
        score: evaluation.evaluation.score,
        grade: evaluation.evaluation.grade,
        verdict: evaluation.evaluation.verdict,
        supports: evaluation.evaluation.supports,
        contradicts: evaluation.evaluation.contradicts,
        missing: evaluation.evaluation.missing,
        watsonComment: evaluation.evaluation.watsonComment,
      })
    } catch (error) {
      console.error('Theory evaluation failed:', error)
      setResultError('The evidence desk is temporarily unavailable. Try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedSuspect, selectedMethod, selectedMotive, supportingEvidence, setCaseTheory, displayedSuspects, collectedEvidence])

  const canPresent = useMemo(
    () =>
      selectedSuspect !== null &&
      selectedMethod !== null &&
      selectedMotive !== null &&
      minEvidenceMet &&
      minSuspectsQuestionedMet,
    [selectedSuspect, selectedMethod, selectedMotive, minEvidenceMet, minSuspectsQuestionedMet]
  )

  const requiredError = useMemo(() => {
    if (minEvidenceMet && minSuspectsQuestionedMet) return null
    return `Need at least ${Math.max(0, 3 - collectedEvidence.length)} more evidence and ${Math.max(0, 2 - suspectQuestionedCount)} more suspects questioned to file the case.`
  }, [collectedEvidence.length, suspectQuestionedCount, minEvidenceMet, minSuspectsQuestionedMet])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[radial-gradient(circle_at_20%_10%,#7a5b36_0%,#412f20_35%,#211711_100%)] text-noir-cream">
      <div className="relative shrink-0 border-b border-noir-gold/45 bg-black/50 px-3 sm:px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm sm:text-lg text-noir-gold tracking-[0.18em] uppercase">The Detective&apos;s Board</h1>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] border border-noir-gold/50 text-noir-gold hover:bg-noir-gold/10"
        >
          ✕ Close
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'wall' && (
            <motion.div
              key="wall"
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25 }}
            >
              <div className="h-full grid lg:grid-cols-[1fr_2px_1fr] gap-3 p-4 pb-16 overflow-y-auto">
                <section className="rounded-sm border border-noir-gold/30 bg-black/35 p-3">
                  <header className="mb-3 border-b border-noir-gold/20 pb-2">
                    <h2 className="text-noir-gold text-xs sm:text-sm uppercase tracking-[0.14em]">Evidence Wall</h2>
                    <p className="text-[11px] text-noir-smoke mt-1">
                      {discoveredSet.size}/{allBlueprintEvidence.length} Evidence Collected
                    </p>
                  </header>

                  <div className="space-y-3">
                    {allBlueprintEvidence.map((evidence) => {
                      const discovered = discoveredSet.has(evidence.id)
                      const angle = rotateForCard(evidence.id)
                      const colorTag = evidence.relatedCharacter ? suspectedColorForChar.get(evidence.relatedCharacter) : '#666'

                      return (
                        <motion.button
                          key={evidence.id}
                          onClick={() => discovered && openEvidence(evidence.id)}
                          className={`w-full text-left rounded-sm border p-3 transition ${
                            discovered
                              ? 'bg-[#f6ecce]/90 border-[#d8c7a7] shadow-[2px_3px_12px_rgba(0,0,0,0.4)]'
                              : 'bg-black/15 border-dashed border-white/25'
                          }`}
                          initial={{ opacity: 0.85, rotate: 0 }}
                          animate={{ opacity: discovered ? 1 : 0.85, rotate: `${angle}deg` }}
                          whileHover={discovered ? { scale: 1.02, rotate: `${angle + 1}deg` } : undefined}
                          disabled={!discovered}
                        >
                          <div className="flex gap-3 items-start">
                            {discovered ? (
                              <>
                                <div className="relative w-14 h-14 bg-noir-black/30 rounded-sm border border-noir-gold/20 overflow-hidden">
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-noir-gold bg-noir-gold/15 px-1.5 py-0.5 text-[10px] rounded-b-sm">📌</div>
                                  {(() => {
                                    const src = getEvidenceImagePath(evidence, mysteryId)
                                    return (
                                      <img
                                        src={src}
                                        alt={evidence.name}
                                        className="w-full h-full object-cover"
                                        onError={(event) => {
                                          event.currentTarget.style.display = 'none'
                                        }}
                                      />
                                    )
                                  })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold font-serif text-[#1f1910] leading-tight">{evidence.name}</p>
                                  <p className="text-[10px] text-noir-smoke mt-1 leading-tight">{evidence.description}</p>
                                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-noir-cream/20 text-noir-black uppercase">{evidence.type}</span>
                                    {evidence.relatedCharacter && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: colorTag }}
                                      >
                                        {suspectById.get(evidence.relatedCharacter) ?? evidence.relatedCharacter}
                                      </span>
                                    )}
                                    <span
                                      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border text-[#6e4f1f] border-[#a7822a]/50"
                                      style={{ background: typeBadgeColor(evidence.type) }}
                                    >
                                      {evidenceIcon(evidence.type)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-16 border border-dashed border-white/25 rounded-sm bg-black/25 flex items-center justify-center text-noir-smoke uppercase tracking-[0.2em] text-xs">
                                <span>?</span>
                              </div>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </section>

                <div className="hidden lg:block w-full bg-gradient-to-b from-noir-gold/20 to-transparent" />

                <aside className="rounded-sm border border-noir-gold/30 bg-black/35 p-3 overflow-hidden">
                  <h3 className="text-noir-gold text-xs sm:text-sm uppercase tracking-[0.14em] mb-3">Timeline</h3>
                  <div className="space-y-2 text-xs">
                    {timelineEntries.length > 0 ? (
                      timelineEntries.map((entry, idx) => (
                        <div key={idx} className="flex gap-2 border-l-2 border-noir-gold/30 pl-2">
                          <span className="w-12 shrink-0 text-noir-gold/80">{entry.time || '—'}</span>
                          <p className="text-noir-smoke leading-relaxed">{entry.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-noir-smoke italic">No timeline details unlocked yet.</p>
                    )}
                  </div>
                </aside>
              </div>
            </motion.div>
          )}

          {activeTab === 'connections' && (
            <motion.div
              key="connections"
              className="absolute inset-0 overflow-auto"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25 }}
            >
              <div className="h-full min-h-[72vh] p-4 relative">
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-noir-smoke">
                  Suspect-Evidence Network
                </div>
                <div className="rounded-sm border border-noir-gold/30 bg-black/35 p-2 h-full relative">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] pointer-events-none">
                    {allBlueprintEvidence.map((evidence) => {
                      const node = evidenceNodeById.get(evidence.id)
                      const suspectId = evidence.relatedCharacter
                      const suspectNode = suspectId ? suspectNodeById.get(suspectId) : undefined

                      if (!node || !suspectNode) return null
                      const discovered = discoveredSet.has(evidence.id)
                      const hue = lineColorForEvidence(evidence, discovered)
                      const strokeWidth = discovered ? 2 : 1.2
                      const animate = discovered ? '' : '8;4'

                      return (
                        <motion.line
                          key={`link-${evidence.id}`}
                          x1={suspectNode.x}
                          y1={suspectNode.y}
                          x2={node.x}
                          y2={node.y}
                          stroke={hue}
                          strokeWidth={strokeWidth}
                          strokeDasharray={animate || undefined}
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: discovered ? 0 : 16 }}
                          animate={discovered ? {} : { strokeDashoffset: [16, 0, 16] }}
                          transition={{ duration: discovered ? 0 : 3, repeat: discovered ? 0 : Infinity }}
                        />
                      )
                    })}

                    {contradictionPairs.map(({ a, b }) => {
                      const nodeA = suspectNodeById.get(a)
                      const nodeB = suspectNodeById.get(b)
                      if (!nodeA || !nodeB) return null
                      const midX = (nodeA.x + nodeB.x) / 2
                      const midY = (nodeA.y + nodeB.y) / 2

                      return (
                        <g key={`contradiction-${a}-${b}`}>
                          <motion.line
                            x1={nodeA.x}
                            y1={nodeA.y}
                            x2={nodeB.x}
                            y2={nodeB.y}
                            stroke="#ef4444"
                            strokeWidth={2.2}
                            strokeDasharray="6 4"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45 }}
                          />
                          <text x={midX} y={midY} textAnchor="middle" fill="#fbbf24" fontSize="5" className="drop-shadow">
                            ⚡
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  <div className="absolute inset-0 flex">
                    <div className="w-1/4 flex flex-col gap-3 pr-6 overflow-auto pr-4 py-2">
                      {displayedSuspects.map((suspect) => {
                        const node = suspectNodeById.get(suspect.id)
                        if (!node) return null
                        return (
                          <div
                            key={suspect.id}
                            className="absolute"
                            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                          >
                            <div className="relative w-20 h-20 rounded-full border-2 border-noir-gold/80 bg-black/60 shadow-[0_0_0_4px_rgba(0,0,0,0.4)] overflow-hidden">
                              <img
                                src={getPortraitPath(suspect.id, mysteryId)}
                                alt={suspect.name}
                                className="w-full h-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = '/portraits/default.webp'
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                              <p className="absolute inset-x-0 bottom-1 text-center text-[8px] uppercase text-noir-gold" style={{ fontFamily: 'Georgia, serif' }}>
                                {suspect.name}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="w-3/4 h-full relative">
                      {allBlueprintEvidence.map((evidence) => {
                        const node = evidenceNodeById.get(evidence.id)
                        if (!node) return null
                        const discovered = discoveredSet.has(evidence.id)

                        return (
                          <div
                            key={evidence.id}
                            className={`absolute rounded-sm border transition ${
                              discovered
                                ? 'bg-[#f8f1df]/80 border-[#be9f53]'
                                : 'bg-white/10 border-white/20'
                            }`}
                            style={{
                              left: `${node.x}%`,
                              top: `${node.y}%`,
                              width: 36,
                              height: 36,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <div className="w-full h-full flex items-center justify-center text-[14px] text-noir-black">{evidenceIcon(evidence.type)}</div>
                            {discovered && (
                              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full" style={{ background: lineColorForEvidence(evidence, true) }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-noir-smoke">
                  Legend — Green: corroborated, Gold: key evidence, Red: suspicious links, ⚡: contradiction.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'case' && (
            <motion.div
              key="case"
              className="absolute inset-0 overflow-auto"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.25 }}
            >
              <div className="h-full p-4 pb-16">
                <section className="rounded-sm border border-noir-gold/30 bg-black/35 p-4">
                  <h2 className="text-noir-gold uppercase tracking-[0.16em] text-sm mb-3">Case Strength</h2>
                  <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-noir-gold/40">
                    <div className="h-full bg-noir-gold transition-all duration-300" style={{ width: `${strength}%` }} />
                  </div>
                  <p className="text-xs mt-2 text-noir-smoke">{strength}/100</p>
                  <p className="text-[11px] text-noir-smoke mt-1">Formula: evidence, contradictions, and suspects questioned.</p>

                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <label className="text-xs uppercase tracking-[0.14em]">
                      Select killer
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {displayedSuspects.map((suspect) => {
                          const active = suspect.id === selectedSuspect
                          return (
                            <button
                              key={suspect.id}
                              onClick={() => {
                                setSelectedSuspect(suspect.id)
                                setCaseTheory({ suspectId: suspect.id })
                              }}
                              className={`rounded border p-2 transition ${
                                active
                                  ? 'bg-noir-gold/15 border-noir-gold text-noir-gold'
                                  : 'bg-black/20 border-white/20 hover:border-noir-gold/50'
                              }`}
                            >
                              <CharacterPortrait
                                characterId={suspect.id}
                                name={suspect.name}
                                role={suspect.role}
                                size="small"
                                isActive={active}
                              />
                              <p className="mt-1 text-[11px] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                                {suspect.name}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </label>

                    <div>
                      <label className="text-xs uppercase tracking-[0.14em] block text-noir-gold">Method</label>
                      <select
                        value={selectedMethod ?? ''}
                        onChange={(e) => {
                          const value = e.target.value || null
                          setSelectedMethod(value)
                          setCaseTheory({ method: value })
                        }}
                        className="mt-2 w-full bg-black/50 border border-noir-gold/40 rounded px-3 py-2 text-noir-cream"
                      >
                        <option value="">Choose method</option>
                        {methods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>

                      <label className="text-xs uppercase tracking-[0.14em] block text-noir-gold mt-4">Motive</label>
                      <select
                        value={selectedMotive ?? ''}
                        onChange={(e) => {
                          const value = e.target.value || null
                          setSelectedMotive(value)
                          setCaseTheory({ motive: value })
                        }}
                        className="mt-2 w-full bg-black/50 border border-noir-gold/40 rounded px-3 py-2 text-noir-cream"
                      >
                        <option value="">Choose motive</option>
                        {motives.map((motive) => (
                          <option key={motive} value={motive}>
                            {motive}
                          </option>
                        ))}
                      </select>

                      <label className="text-xs uppercase tracking-[0.14em] block text-noir-gold mt-4">
                        Supporting evidence (max 3)
                      </label>
                      <div className="mt-2 space-y-1 max-h-44 overflow-auto border border-white/10 rounded p-2 bg-black/20">
                        {collectedEvidence.length === 0 && <p className="text-xs text-noir-smoke">No evidence collected yet.</p>}
                        {collectedEvidence.map((entry) => {
                          const evidenceData = evidenceCatalog.get(entry.source)
                          const selected = supportingEvidence.includes(entry.source)
                          const disabled = !selected && supportingEvidence.length >= 3
                          return (
                            <button
                              key={entry.id}
                              onClick={() => toggleSupportingEvidence(entry.source)}
                              disabled={disabled}
                              className={`w-full text-left rounded border px-2 py-1.5 text-left text-xs transition ${
                                selected
                                  ? 'bg-noir-gold/20 border-noir-gold text-noir-gold'
                                  : disabled
                                    ? 'opacity-40'
                                    : 'border-white/20 hover:border-noir-gold/40'
                              }`}
                            >
                              <span>{selected ? '✓ ' : '+ '}</span>
                              {evidenceData?.name ?? entry.description}
                              {evidenceData?.relatedCharacter && (
                                <span className="ml-2 text-noir-smoke">• {suspectById.get(evidenceData.relatedCharacter) ?? evidenceData.relatedCharacter}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {requiredError && <p className="mt-4 text-sm text-red-300">{requiredError}</p>}

                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <button
                      onClick={handlePresentCase}
                      disabled={!canPresent || isSubmitting}
                      className="px-6 py-3 rounded-sm text-sm uppercase tracking-[0.16em] font-semibold bg-noir-gold text-noir-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting Theory...' : 'Present Case'}
                    </button>
                    {resultMessage && (
                      <div className="px-3 py-2 bg-black/40 border border-noir-gold/40 text-xs">
                        Backend score: <span className="text-noir-gold">{resultMessage.grade}</span>
                        <span className="ml-2">({resultMessage.score}/100)</span>
                        <span className="ml-2 text-noir-smoke">{resultMessage.verdict}</span>
                      </div>
                    )}
                    {resultError && <p className="text-sm text-red-300">{resultError}</p>}
                  </div>
                </section>

                <section className="mt-4 rounded-sm border border-noir-slate/50 bg-black/30 p-4 text-sm text-noir-smoke">
                  <h3 className="text-noir-gold uppercase tracking-[0.16em] text-xs mb-2">Case Notes</h3>
                  <p>Suspects questioned: <span className="text-noir-cream">{suspectQuestionedCount}</span></p>
                  <p>Evidence in file: <span className="text-noir-cream">{collectedEvidence.length}</span></p>
                  <p>Contradictions found: <span className="text-noir-cream">{contradictions.length}</span></p>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-noir-gold/40 bg-black/55 p-2 sm:p-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            className={`flex-1 ${getTabButtonClass(activeTab === 'wall')}`}
            onClick={() => setActiveTab('wall')}
          >
            1) Evidence Wall
          </button>
          <button
            type="button"
            className={`flex-1 ${getTabButtonClass(activeTab === 'connections')}`}
            onClick={() => setActiveTab('connections')}
          >
            2) Connections
          </button>
          <button
            type="button"
            className={`flex-1 ${getTabButtonClass(activeTab === 'case')}`}
            onClick={() => setActiveTab('case')}
          >
            3) Build Your Case
          </button>
        </div>
        <div
          className="h-[2px] bg-noir-gold/20 mt-2 mx-2"
          style={{
            background:
              activeTab === 'wall'
                ? 'linear-gradient(90deg, transparent 0%, #d4af37 33%, transparent 33%, transparent 100%)'
                : activeTab === 'connections'
                  ? 'linear-gradient(90deg, transparent 0%, transparent 34%, #d4af37 34%, #d4af37 67%, transparent 67%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, transparent 67%, #d4af37 67%, #d4af37 100%)',
          }}
        />
      </div>

      <ExaminationModal
        evidence={selectedEvidenceForModal}
        isOpen={!!selectedEvidenceForModal}
        onClose={() => setSelectedEvidenceForModal(null)}
        isAlreadyCollected={true}
      />
    </div>
  )
}
