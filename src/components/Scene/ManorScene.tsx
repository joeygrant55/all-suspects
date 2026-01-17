import { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Vignette, Bloom, Noise } from '@react-three/postprocessing'
import { Room } from './Room'
import { PlayerCharacter, MANOR_ROOM_BOUNDS } from './PlayerCharacter'
import { useGameStore } from '../../game/state'
import type { EvidenceData } from './InteractiveObject'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import * as THREE from 'three'

// Evidence positions in world coordinates (room position + local offset)
const EVIDENCE_WORLD_POSITIONS: Record<string, { position: [number, number, number]; roomPos: [number, number, number] }> = {
  // Study evidence (room at [0, 0, -4.5])
  'threatening-letter': { position: [-0.4, 0.42, -0.6], roomPos: [0, 0, -4.5] },
  'champagne-glass': { position: [0.3, 0.42, -0.4], roomPos: [0, 0, -4.5] },
  'body-outline': { position: [0, 0.01, -0.8], roomPos: [0, 0, -4.5] },
  // Parlor evidence (room at [-4.5, 0, -4.5])
  'burned-document': { position: [-1.2, 0.3, 0], roomPos: [-4.5, 0, -4.5] },
  'victoria-medication': { position: [1.0, 0.3, 0.5], roomPos: [-4.5, 0, -4.5] },
  // Dining room evidence (room at [4.5, 0, -4.5])
  'extra-place-setting': { position: [0.3, 0.36, 0], roomPos: [4.5, 0, -4.5] },
  // Kitchen evidence (room at [0, 0, 0])
  'rat-poison': { position: [-1.2, 0.5, -0.8], roomPos: [0, 0, 0] },
  // Hallway evidence (room at [-4.5, 0, 0])
  'stopped-clock': { position: [1.5, 0.8, -1.0], roomPos: [-4.5, 0, 0] },
  // Garden evidence (room at [4.5, 0, 0])
  'discarded-gloves': { position: [-0.8, 0.15, 0.8], roomPos: [4.5, 0, 0] },
}

interface ManorSceneProps {
  onExamineEvidence: (evidence: EvidenceData) => void
}

interface ManorProps {
  onExamineEvidence: (evidence: EvidenceData) => void
}

function Manor({ onExamineEvidence }: ManorProps) {
  const characters = useGameStore((state) => state.characters)
  const currentConversation = useGameStore((state) => state.currentConversation)
  const startConversation = useGameStore((state) => state.startConversation)
  const setCurrentRoom = useGameStore((state) => state.setCurrentRoom)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 2))
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 2])

  // Handle player position updates
  const handlePlayerPositionChange = useCallback((position: THREE.Vector3, room: string | null) => {
    playerPosRef.current.copy(position)
    setPlayerPos([position.x, position.y, position.z])
    if (room) {
      setCurrentRoom(room)
    }
  }, [setCurrentRoom])

  // Find nearest character to player
  const findNearestCharacter = useCallback(() => {
    const INTERACTION_DISTANCE = 1.5
    let nearestId: string | null = null
    let nearestDist = Infinity

    // Room positions for calculating world coords
    const roomPositions: Record<string, [number, number, number]> = {
      'parlor': [-4.5, 0, -4.5],
      'study': [0, 0, -4.5],
      'dining-room': [4.5, 0, -4.5],
      'hallway': [-4.5, 0, 0],
      'kitchen': [0, 0, 0],
      'garden': [4.5, 0, 0],
    }

    characters.forEach((char) => {
      const roomPos = roomPositions[char.location]
      if (!roomPos) return

      // Same positioning logic as in Room.tsx
      const roomChars = characters.filter(c => c.location === char.location)
      const charIndex = roomChars.findIndex(c => c.id === char.id)
      const angle = (charIndex - (roomChars.length - 1) / 2) * 0.6
      const radius = 0.7
      const charX = roomPos[0] + Math.sin(angle) * radius
      const charZ = roomPos[2] + 0.6 + Math.cos(angle) * 0.3

      const dx = playerPosRef.current.x - charX
      const dz = playerPosRef.current.z - charZ
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < INTERACTION_DISTANCE && dist < nearestDist) {
        nearestDist = dist
        nearestId = char.id
      }
    })

    return nearestId
  }, [characters])

  // Find nearest uncollected evidence to player
  const findNearestEvidence = useCallback(() => {
    const EVIDENCE_INTERACTION_DISTANCE = 1.8 // Slightly larger range for evidence
    let nearestId: string | null = null
    let nearestDist = Infinity

    // Get list of collected evidence IDs
    const collectedIds = new Set(collectedEvidence.map(e => e.source))

    Object.entries(EVIDENCE_WORLD_POSITIONS).forEach(([evidenceId, { position, roomPos }]) => {
      // Skip already collected evidence
      if (collectedIds.has(evidenceId)) return

      // Calculate world position
      const worldX = roomPos[0] + position[0]
      const worldZ = roomPos[2] + position[2]

      const dx = playerPosRef.current.x - worldX
      const dz = playerPosRef.current.z - worldZ
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < EVIDENCE_INTERACTION_DISTANCE && dist < nearestDist) {
        nearestDist = dist
        nearestId = evidenceId
      }
    })

    return nearestId
  }, [collectedEvidence])

  // Handle E key interaction (talk to character)
  const handleInteract = useCallback(() => {
    const nearestCharId = findNearestCharacter()
    if (nearestCharId) {
      startConversation(nearestCharId)
    }
  }, [findNearestCharacter, startConversation])

  // Handle F key interaction (examine evidence)
  const handleExamine = useCallback(() => {
    const nearestEvidenceId = findNearestEvidence()
    if (nearestEvidenceId) {
      const evidence = EVIDENCE_DATABASE[nearestEvidenceId]
      if (evidence) {
        onExamineEvidence(evidence)
      }
    }
  }, [findNearestEvidence, onExamineEvidence])

  // Group characters by room
  const charactersByRoom = characters.reduce(
    (acc, char) => {
      if (!acc[char.location]) {
        acc[char.location] = []
      }
      acc[char.location].push(char)
      return acc
    },
    {} as Record<string, typeof characters>
  )

  // Room layout (2x3 grid) with distinct colors
  const rooms = [
    { name: 'parlor', position: [-4.5, 0, -4.5] as [number, number, number], color: '#2a1a10' },
    { name: 'study', position: [0, 0, -4.5] as [number, number, number], color: '#1a2a1a' },
    { name: 'dining-room', position: [4.5, 0, -4.5] as [number, number, number], color: '#2a1f15' },
    { name: 'hallway', position: [-4.5, 0, 0] as [number, number, number], color: '#1a1a1a' },
    { name: 'kitchen', position: [0, 0, 0] as [number, number, number], color: '#252520' },
    { name: 'garden', position: [4.5, 0, 0] as [number, number, number], color: '#0a150a' },
  ]

  return (
    <group>
      {/* Ground/estate floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -2]} receiveShadow>
        <planeGeometry args={[30, 25]} />
        <meshStandardMaterial color="#0a0808" />
      </mesh>

      {/* Rooms */}
      {rooms.map((room) => (
        <Room
          key={room.name}
          name={room.name}
          position={room.position}
          color={room.color}
          characters={charactersByRoom[room.name] || []}
          currentConversation={currentConversation}
          playerPosition={playerPos}
          onCharacterClick={startConversation}
          onExamineEvidence={onExamineEvidence}
        />
      ))}

      {/* Player character */}
      <PlayerCharacter
        onPositionChange={handlePlayerPositionChange}
        onInteract={handleInteract}
        onExamine={handleExamine}
        roomBounds={MANOR_ROOM_BOUNDS}
      />
    </group>
  )
}

// Simplified lighting - reduced from ~11 lights to 4 for performance
function Lighting() {
  return (
    <>
      {/* Ambient - main fill light */}
      <ambientLight intensity={0.5} color="#9999bb" />

      {/* Main directional light with shadows (reduced shadow map) */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.0}
        color="#aabbdd"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Warm fill from opposite side (no shadows) */}
      <directionalLight
        position={[-8, 10, -5]}
        intensity={0.5}
        color="#ffaa66"
      />

      {/* Single warm interior light */}
      <pointLight position={[0, 3, -2]} intensity={0.8} color="#ffcc88" distance={20} decay={2} />
    </>
  )
}

// Noir atmosphere post-processing
function PostProcessingEffects() {
  return (
    <EffectComposer>
      {/* Vignette for classic noir frame */}
      <Vignette eskil={false} offset={0.4} darkness={0.5} />
      {/* Subtle bloom for mood lighting */}
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        intensity={0.3}
      />
      {/* Film grain for 1920s aesthetic */}
      <Noise opacity={0.04} />
    </EffectComposer>
  )
}

function LoadingFallback() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#c9a227" />
    </mesh>
  )
}

export function ManorScene({ onExamineEvidence }: ManorSceneProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#050505' }}>
      <Canvas
        shadows
        camera={{
          position: [15, 12, 15],
          fov: 40,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        {/* Fog for atmosphere - pushed back for better visibility */}
        <fog attach="fog" args={['#1a1a2f', 25, 60]} />

        {/* Lighting setup */}
        <Lighting />

        {/* The manor */}
        <Suspense fallback={<LoadingFallback />}>
          <Manor onExamineEvidence={onExamineEvidence} />
        </Suspense>

        {/* Post-processing effects */}
        <PostProcessingEffects />

        {/* Camera is now controlled by PlayerCharacter */}
      </Canvas>
    </div>
  )
}
