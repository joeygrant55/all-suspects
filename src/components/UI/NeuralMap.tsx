/**
 * NeuralMap Component
 * Visual node-and-edge graph showing relationships between victim, suspects, and evidence
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import './NeuralMap.css'

interface NeuralMapProps {
  width?: number
  height?: number
}

interface Node {
  id: string
  x: number
  y: number
  type: 'victim' | 'suspect' | 'evidence'
  label: string
  subtitle?: string
  discovered: boolean
  size: number
}

interface Edge {
  from: string
  to: string
  type: 'evidence' | 'contradiction'
  discovered: boolean
  label?: string
}

export function NeuralMap({ width = 800, height = 600 }: NeuralMapProps) {
  const characters = useGameStore((state) => state.characters)
  const discoveredEvidenceIds = useGameStore((state) => state.discoveredEvidenceIds)
  const contradictions = useGameStore((state) => state.contradictions)
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Build the graph data
  const { nodes, edges } = useMemo(() => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Center node: Edmund Ashford (victim)
    nodes.push({
      id: 'victim',
      x: centerX,
      y: centerY,
      type: 'victim',
      label: 'Edmund',
      subtitle: 'Ashford',
      discovered: true,
      size: 60,
    })

    // Suspect nodes in a circle around the victim
    characters.forEach((character, index) => {
      const angle = (index * 2 * Math.PI) / characters.length - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      nodes.push({
        id: character.id,
        x,
        y,
        type: 'suspect',
        label: character.name.split(' ')[0],
        subtitle: character.name.split(' ').slice(1).join(' '),
        discovered: true,
        size: 45,
      })
    })

    // Evidence nodes - positioned around their related suspects
    const evidenceNodes: Node[] = []
    Object.values(EVIDENCE_DATABASE).forEach((evidence) => {
      const isDiscovered = discoveredEvidenceIds.includes(evidence.id)
      
      if (!evidence.relatedCharacter && !evidence.pointsTo) return

      const targetCharacterId = evidence.relatedCharacter || evidence.pointsTo
      const suspectNode = nodes.find((n) => n.id === targetCharacterId)
      
      if (!suspectNode) return

      // Position evidence around the suspect with some randomness for visual variety
      const evidenceIndex = evidenceNodes.filter(
        (e) => edges.some((edge) => edge.from === e.id && edge.to === targetCharacterId)
      ).length
      
      const angleOffset = (evidenceIndex * Math.PI) / 3 + Math.random() * 0.3
      const distanceFromSuspect = 80 + Math.random() * 20
      const angle = Math.atan2(suspectNode.y - centerY, suspectNode.x - centerX) + angleOffset
      
      const ex = suspectNode.x + Math.cos(angle) * distanceFromSuspect
      const ey = suspectNode.y + Math.sin(angle) * distanceFromSuspect

      const evidenceNode: Node = {
        id: evidence.id,
        x: ex,
        y: ey,
        type: 'evidence',
        label: evidence.name.split(' ').slice(0, 2).join(' '),
        discovered: isDiscovered,
        size: 28,
      }

      evidenceNodes.push(evidenceNode)

      // Edge from evidence to suspect
      edges.push({
        from: evidence.id,
        to: targetCharacterId!,
        type: 'evidence',
        discovered: isDiscovered,
      })

      // If evidence pointsTo someone, make that edge stronger/different
      if (evidence.pointsTo) {
        const pointsToNode = nodes.find((n) => n.id === evidence.pointsTo)
        if (pointsToNode && evidence.pointsTo !== targetCharacterId) {
          edges.push({
            from: evidence.id,
            to: evidence.pointsTo,
            type: 'evidence',
            discovered: isDiscovered,
            label: 'points to',
          })
        }
      }
    })

    nodes.push(...evidenceNodes)

    // Contradiction edges between suspects
    contradictions.forEach((contradiction) => {
      const char1Id = contradiction.statement1.characterId
      const char2Id = contradiction.statement2.characterId
      
      // Avoid duplicate edges
      const edgeId = [char1Id, char2Id].sort().join('-')
      if (!edges.some((e) => e.type === 'contradiction' && [e.from, e.to].sort().join('-') === edgeId)) {
        edges.push({
          from: char1Id,
          to: char2Id,
          type: 'contradiction',
          discovered: true,
          label: contradiction.severity,
        })
      }
    })

    return { nodes, edges }
  }, [characters, discoveredEvidenceIds, contradictions, width, height])

  const getNode = (id: string) => nodes.find((n) => n.id === id)

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId)
  }

  const getConnectedNodes = (nodeId: string): string[] => {
    const connected = new Set<string>()
    edges.forEach((edge) => {
      if (edge.from === nodeId) connected.add(edge.to)
      if (edge.to === nodeId) connected.add(edge.from)
    })
    return Array.from(connected)
  }

  const isNodeHighlighted = (nodeId: string): boolean => {
    if (!selectedNode && !hoveredNode) return true
    const activeNode = selectedNode || hoveredNode
    if (nodeId === activeNode) return true
    return getConnectedNodes(activeNode!).includes(nodeId)
  }

  const isEdgeHighlighted = (edge: Edge): boolean => {
    if (!selectedNode && !hoveredNode) return edge.discovered
    const activeNode = selectedNode || hoveredNode
    return edge.from === activeNode || edge.to === activeNode
  }

  const getNodeDetails = (node: Node) => {
    if (node.type === 'victim') {
      return {
        title: 'Edmund Ashford',
        subtitle: 'The Victim',
        description: 'Found dead in his study at 11:47 PM on New Year\'s Eve, 1929. Poisoned champagne.',
      }
    }
    
    if (node.type === 'suspect') {
      const character = characters.find((c) => c.id === node.id)
      const connectedEvidence = edges
        .filter((e) => e.to === node.id && e.type === 'evidence' && e.discovered)
        .map((e) => getNode(e.from))
        .filter(Boolean)
      
      return {
        title: character?.name || node.label,
        subtitle: character?.role || '',
        description: `${connectedEvidence.length} piece${connectedEvidence.length !== 1 ? 's' : ''} of evidence connected`,
        evidence: connectedEvidence,
      }
    }
    
    if (node.type === 'evidence') {
      const evidenceData = EVIDENCE_DATABASE[node.id]
      return {
        title: evidenceData?.name || node.label,
        subtitle: evidenceData?.type || 'evidence',
        description: evidenceData?.description || '',
        hint: evidenceData?.hint,
      }
    }
    
    return null
  }

  return (
    <div className="relative w-full h-full">
      {/* SVG Canvas */}
      <svg
        width={width}
        height={height}
        className="w-full h-full"
        style={{
          background: 'radial-gradient(circle at center, #1a1510 0%, #0d0a08 100%)',
        }}
      >
        {/* Grid pattern overlay */}
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(201, 162, 39, 0.05)"
              strokeWidth="0.5"
            />
          </pattern>
          
          {/* Glow filters */}
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker for directed edges */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#c9a227" opacity="0.6" />
          </marker>
        </defs>

        <rect width={width} height={height} fill="url(#grid)" />

        {/* Edges */}
        <g className="edges">
          {edges.map((edge, index) => {
            const fromNode = getNode(edge.from)
            const toNode = getNode(edge.to)
            if (!fromNode || !toNode) return null

            const isHighlighted = isEdgeHighlighted(edge)
            const isContradiction = edge.type === 'contradiction'
            const opacity = isHighlighted ? (edge.discovered ? 1 : 0.3) : 0.1

            // Calculate edge path
            const dx = toNode.x - fromNode.x
            const dy = toNode.y - fromNode.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Shorten the line to account for node size
            const shortenBy = (fromNode.size + toNode.size) / 2
            const ratio = (distance - shortenBy) / distance
            const startX = fromNode.x + dx * (1 - ratio) / 2
            const startY = fromNode.y + dy * (1 - ratio) / 2
            const endX = toNode.x - dx * (1 - ratio) / 2
            const endY = toNode.y - dy * (1 - ratio) / 2

            const edgeKey = `${edge.from}-${edge.to}-${index}`

            return (
              <g key={edgeKey}>
                {isContradiction ? (
                  // Contradiction edge - wavy red line
                  <path
                    d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${(startY + endY) / 2 - 20} ${endX} ${endY}`}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeDasharray="5,5"
                    opacity={opacity}
                    filter={isHighlighted ? 'url(#glow-red)' : undefined}
                    className="transition-all duration-300"
                    style={{
                      animation: isHighlighted ? 'pulse 2s ease-in-out infinite' : undefined,
                    }}
                  />
                ) : (
                  // Evidence edge - straight or with label
                  <>
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="#c9a227"
                      strokeWidth={edge.label ? 2.5 : 1.5}
                      strokeDasharray={edge.discovered ? undefined : '3,3'}
                      opacity={opacity}
                      filter={isHighlighted && edge.discovered ? 'url(#glow-gold)' : undefined}
                      className="transition-all duration-300"
                      markerEnd={edge.label ? 'url(#arrowhead)' : undefined}
                    />
                    {edge.label && isHighlighted && (
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 5}
                        fill="#c9a227"
                        fontSize="10"
                        textAnchor="middle"
                        opacity={0.8}
                      >
                        {edge.label}
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {nodes.map((node) => {
            const isHighlighted = isNodeHighlighted(node.id)
            const isSelected = selectedNode === node.id
            const isHovered = hoveredNode === node.id
            const opacity = isHighlighted ? (node.discovered ? 1 : 0.3) : 0.2

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer transition-all duration-300"
                style={{
                  transform: isSelected || isHovered ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
              >
                {/* Node circle */}
                <circle
                  r={node.size / 2}
                  fill={
                    node.type === 'victim'
                      ? '#c9a227'
                      : node.type === 'suspect'
                        ? '#e5e5e5'
                        : '#c9a227'
                  }
                  stroke={
                    isSelected
                      ? '#c9a227'
                      : node.type === 'victim'
                        ? '#fbbf24'
                        : node.type === 'suspect'
                          ? '#9ca3af'
                          : '#d97706'
                  }
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={opacity}
                  filter={
                    (isSelected || isHovered) && node.discovered
                      ? 'url(#glow-gold)'
                      : undefined
                  }
                  className="transition-all duration-300"
                />

                {/* Inner circle for victim */}
                {node.type === 'victim' && (
                  <circle
                    r={node.size / 2 - 8}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    opacity={opacity * 0.6}
                  />
                )}

                {/* Label */}
                {node.discovered && (
                  <>
                    <text
                      y={node.type === 'evidence' ? 0 : -2}
                      fill={node.type === 'victim' ? '#0d0a08' : '#0d0a08'}
                      fontSize={node.type === 'evidence' ? 9 : 11}
                      fontWeight={node.type === 'victim' ? 'bold' : 'normal'}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      opacity={opacity}
                      style={{ pointerEvents: 'none', fontFamily: 'Georgia, serif' }}
                    >
                      {node.label}
                    </text>
                    {node.subtitle && (
                      <text
                        y={node.type === 'evidence' ? 10 : 10}
                        fill={node.type === 'victim' ? '#0d0a08' : '#1a1510'}
                        fontSize={node.type === 'evidence' ? 8 : 9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity={opacity * 0.8}
                        style={{ pointerEvents: 'none', fontFamily: 'Georgia, serif' }}
                      >
                        {node.subtitle}
                      </text>
                    )}
                  </>
                )}

                {/* Undiscovered indicator */}
                {!node.discovered && (
                  <text
                    y={0}
                    fill="#6b7280"
                    fontSize={16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={0.4}
                    style={{ pointerEvents: 'none' }}
                  >
                    ?
                  </text>
                )}

                {/* Pulse animation for selected/hovered */}
                {(isSelected || isHovered) && node.discovered && (
                  <circle
                    r={node.size / 2}
                    fill="none"
                    stroke="#c9a227"
                    strokeWidth="2"
                    opacity="0"
                    style={{ pointerEvents: 'none' }}
                  >
                    <animate
                      attributeName="r"
                      from={node.size / 2}
                      to={node.size / 2 + 15}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Info Panel */}
      {(selectedNode || hoveredNode) && (
        <div
          className="absolute top-4 right-4 w-64 p-4 rounded-sm border bg-noir-charcoal/95 backdrop-blur-sm"
          style={{
            borderColor: selectedNode ? '#c9a227' : '#4a4a4a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {(() => {
            const activeNode = getNode(selectedNode || hoveredNode!)
            if (!activeNode) return null
            
            const details = getNodeDetails(activeNode)
            if (!details) return null

            return (
              <>
                <h3
                  className="text-noir-gold text-lg font-medium mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {details.title}
                </h3>
                {details.subtitle && (
                  <p className="text-noir-smoke text-xs uppercase tracking-wider mb-2">
                    {details.subtitle}
                  </p>
                )}
                <p className="text-noir-cream text-sm mb-3">
                  {details.description}
                </p>
                
                {details.hint && (
                  <p className="text-noir-gold/80 text-xs italic border-l-2 border-noir-gold/50 pl-2">
                    "{details.hint}"
                  </p>
                )}

                {details.evidence && details.evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-noir-slate/30">
                    <p className="text-noir-smoke text-xs uppercase tracking-wider mb-1">
                      Connected Evidence:
                    </p>
                    <ul className="space-y-1">
                      {details.evidence.filter(ev => ev).map((ev) => (
                        <li key={ev!.id} className="text-noir-cream text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-noir-gold" />
                          {ev!.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedNode && (
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="mt-3 text-xs text-noir-smoke hover:text-noir-cream transition-colors"
                  >
                    Click again to close
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-noir-charcoal/90 backdrop-blur-sm p-3 rounded-sm border border-noir-slate/30">
        <p className="text-noir-gold text-xs uppercase tracking-wider mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Legend
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-noir-gold border border-yellow-600" />
            <span className="text-noir-cream">Victim / Evidence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-noir-cream border border-noir-slate" />
            <span className="text-noir-cream">Suspect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-noir-gold" />
            <span className="text-noir-cream">Evidence link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-red-600" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #dc2626, #dc2626 4px, transparent 4px, transparent 8px)' }} />
            <span className="text-noir-cream">Contradiction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-noir-slate" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #64748b, #64748b 2px, transparent 2px, transparent 4px)' }} />
            <span className="text-noir-smoke">Undiscovered</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!selectedNode && !hoveredNode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-noir-charcoal/80 backdrop-blur-sm px-4 py-2 rounded-sm border border-noir-gold/30">
          <p className="text-noir-cream text-xs text-center" style={{ fontFamily: 'Georgia, serif' }}>
            Click or hover over nodes to explore connections
          </p>
        </div>
      )}
    </div>
  )
}
