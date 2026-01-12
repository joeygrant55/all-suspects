import { useState, useMemo } from 'react'
import { useGameStore } from '../../game/state'
import * as THREE from 'three'
import { InteractiveObject, type EvidenceData } from './InteractiveObject'
import { EVIDENCE_DATABASE, EVIDENCE_BY_ROOM } from '../../data/evidence'

interface RoomProps {
  name: string
  position: [number, number, number]
  color: string
  characterCount?: number
  onExamineEvidence: (evidence: EvidenceData) => void
}

export function Room({ name, position, color, characterCount = 0, onExamineEvidence }: RoomProps) {
  const [hovered, setHovered] = useState(false)
  const setCurrentRoom = useGameStore((state) => state.setCurrentRoom)
  const currentRoom = useGameStore((state) => state.currentRoom)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const isActive = currentRoom === name

  const handleClick = () => {
    setCurrentRoom(name)
  }

  // Get evidence for this room
  const roomEvidenceIds = EVIDENCE_BY_ROOM[name] || []

  // Check if evidence is collected
  const isEvidenceCollected = (evidenceId: string) => {
    return collectedEvidence.some((e) => e.source === evidenceId)
  }

  // Create gradient material for floor
  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isActive ? '#c9a227' : hovered ? '#3a3a3a' : color,
      roughness: 0.9,
      metalness: 0.1,
    })
  }, [isActive, hovered, color])

  // Get furniture component with evidence objects
  const renderFurniture = () => {
    switch (name) {
      case 'parlor':
        return <ParlorFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      case 'study':
        return <StudyFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      case 'dining-room':
        return <DiningRoomFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      case 'hallway':
        return <HallwayFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      case 'kitchen':
        return <KitchenFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      case 'garden':
        return <GardenFurniture roomEvidenceIds={roomEvidenceIds} onExamine={onExamineEvidence} isCollected={isEvidenceCollected} />
      default:
        return null
    }
  }

  return (
    <group position={position}>
      {/* Room floor with rug effect */}
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[3.8, 3.8]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* Rug/carpet in center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial
          color={isActive ? '#8b6914' : '#2a2020'}
          roughness={1}
        />
      </mesh>

      {/* Room walls with wainscoting effect */}
      <group>
        {/* Back wall */}
        <mesh position={[0, 0.6, -1.95]} castShadow receiveShadow>
          <boxGeometry args={[4, 1.2, 0.1]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
        {/* Front wall */}
        <mesh position={[0, 0.6, 1.95]} castShadow receiveShadow>
          <boxGeometry args={[4, 1.2, 0.1]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
        {/* Left wall */}
        <mesh position={[-1.95, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.2, 4]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
        {/* Right wall */}
        <mesh position={[1.95, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.2, 4]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
      </group>

      {/* Wainscoting trim */}
      <group>
        <mesh position={[0, 0.15, -1.9]}>
          <boxGeometry args={[3.9, 0.05, 0.05]} />
          <meshStandardMaterial color="#2a2218" />
        </mesh>
        <mesh position={[0, 0.15, 1.9]}>
          <boxGeometry args={[3.9, 0.05, 0.05]} />
          <meshStandardMaterial color="#2a2218" />
        </mesh>
      </group>

      {/* Room-specific furniture with evidence */}
      {renderFurniture()}

      {/* Character indicators (elegant lamp-like markers) */}
      {Array.from({ length: characterCount }).map((_, index) => (
        <group key={index} position={[-0.8 + index * 0.6, 0, 0.8]}>
          {/* Character presence glow */}
          <pointLight
            position={[0, 0.5, 0]}
            intensity={0.3}
            color="#ff6b6b"
            distance={2}
          />
          {/* Visual marker */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
            <meshStandardMaterial
              color="#722f37"
              emissive="#722f37"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Room ambient light */}
      <pointLight
        position={[0, 1.5, 0]}
        intensity={isActive ? 0.5 : 0.2}
        color={isActive ? '#c9a227' : '#ffaa55'}
        distance={5}
        castShadow
      />
    </group>
  )
}

// Props for furniture components
interface FurnitureProps {
  roomEvidenceIds: string[]
  onExamine: (evidence: EvidenceData) => void
  isCollected: (id: string) => boolean
}

// Parlor furniture - fireplace, armchairs, small table
function ParlorFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Fireplace */}
      <mesh position={[0, 0.4, -1.6]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.3]} />
        <meshStandardMaterial color="#3d3028" />
      </mesh>
      <mesh position={[0, 0.6, -1.5]}>
        <boxGeometry args={[0.8, 0.4, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Fire glow */}
      <pointLight position={[0, 0.3, -1.4]} intensity={0.4} color="#ff6633" distance={2} />

      {/* EVIDENCE: Burned document in fireplace */}
      {roomEvidenceIds.includes('burned-document') && (
        <InteractiveObject
          position={[0.2, 0.25, -1.45]}
          geometry="box"
          size={[0.15, 0.02, 0.1]}
          baseColor="#2a2020"
          evidence={EVIDENCE_DATABASE['burned-document']}
          onExamine={onExamine}
          isDiscovered={isCollected('burned-document')}
        />
      )}

      {/* Armchairs */}
      <Armchair position={[-1, 0, 0]} rotation={[0, Math.PI / 4, 0]} />
      <Armchair position={[1, 0, 0]} rotation={[0, -Math.PI / 4, 0]} />

      {/* Side table */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>

      {/* EVIDENCE: Victoria's medication on side table */}
      {roomEvidenceIds.includes('victoria-medication') && (
        <InteractiveObject
          position={[0.1, 0.55, 0]}
          geometry="cylinder"
          size={[0.04, 0.12]}
          baseColor="#4a3020"
          evidence={EVIDENCE_DATABASE['victoria-medication']}
          onExamine={onExamine}
          isDiscovered={isCollected('victoria-medication')}
        />
      )}
    </group>
  )
}

// Study furniture - desk, bookshelf, chair (CRIME SCENE)
function StudyFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Large desk */}
      <mesh position={[0, 0.35, -0.8]} castShadow>
        <boxGeometry args={[1.8, 0.1, 0.9]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>
      {/* Desk legs */}
      <mesh position={[-0.7, 0.15, -0.8]} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.8]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>
      <mesh position={[0.7, 0.15, -0.8]} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.8]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>

      {/* EVIDENCE: Threatening letter in desk drawer */}
      {roomEvidenceIds.includes('threatening-letter') && (
        <InteractiveObject
          position={[-0.4, 0.42, -0.6]}
          geometry="box"
          size={[0.2, 0.02, 0.15]}
          baseColor="#f5f0e6"
          evidence={EVIDENCE_DATABASE['threatening-letter']}
          onExamine={onExamine}
          isDiscovered={isCollected('threatening-letter')}
        />
      )}

      {/* EVIDENCE: Poisoned champagne glass */}
      {roomEvidenceIds.includes('champagne-glass') && (
        <InteractiveObject
          position={[0.5, 0.45, -0.9]}
          geometry="cylinder"
          size={[0.04, 0.12]}
          baseColor="#aabbcc"
          evidence={EVIDENCE_DATABASE['champagne-glass']}
          onExamine={onExamine}
          isDiscovered={isCollected('champagne-glass')}
        />
      )}

      {/* Desk lamp */}
      <pointLight position={[0.5, 0.6, -0.8]} intensity={0.3} color="#ffcc77" distance={2} />

      {/* Bookshelf */}
      <mesh position={[-1.5, 0.5, 0]} castShadow>
        <boxGeometry args={[0.4, 1, 1.5]} />
        <meshStandardMaterial color="#1a1510" />
      </mesh>

      {/* Chair - slightly askew for crime scene feel */}
      <mesh position={[0.1, 0.2, 0.1]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#4a3020" />
      </mesh>

      {/* EVIDENCE: Body outline / position marker */}
      {roomEvidenceIds.includes('body-outline') && (
        <InteractiveObject
          position={[0, 0.05, -0.3]}
          geometry="box"
          size={[0.6, 0.02, 0.3]}
          baseColor="#722f37"
          evidence={EVIDENCE_DATABASE['body-outline']}
          onExamine={onExamine}
          isDiscovered={isCollected('body-outline')}
        />
      )}

      {/* Crime scene atmosphere - subtle red accent light */}
      <pointLight position={[0, 0.5, -0.5]} intensity={0.15} color="#ff4444" distance={2} />
    </group>
  )
}

// Dining room furniture - long table, chairs
function DiningRoomFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Long dining table */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.5, 0.08, 1]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>
      {/* Table legs */}
      {[[-1, -0.3], [-1, 0.3], [1, -0.3], [1, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]} castShadow>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#2a1f15" />
        </mesh>
      ))}

      {/* EVIDENCE: Extra place setting */}
      {roomEvidenceIds.includes('extra-place-setting') && (
        <InteractiveObject
          position={[1.0, 0.42, 0]}
          geometry="cylinder"
          size={[0.12, 0.02]}
          baseColor="#f5f0e6"
          evidence={EVIDENCE_DATABASE['extra-place-setting']}
          onExamine={onExamine}
          isDiscovered={isCollected('extra-place-setting')}
        />
      )}

      {/* Chairs along table */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.2, -0.8]} castShadow>
            <boxGeometry args={[0.35, 0.4, 0.35]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
          <mesh position={[x, 0.2, 0.8]} castShadow>
            <boxGeometry args={[0.35, 0.4, 0.35]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
        </group>
      ))}

      {/* Chandelier light */}
      <pointLight position={[0, 1.2, 0]} intensity={0.5} color="#ffdd99" distance={4} />
    </group>
  )
}

// Hallway furniture - coat rack, small table, clock
function HallwayFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Coat rack */}
      <mesh position={[-1.2, 0.5, -1]} castShadow>
        <cylinderGeometry args={[0.05, 0.1, 1, 8]} />
        <meshStandardMaterial color="#1a1510" />
      </mesh>

      {/* Console table */}
      <mesh position={[0, 0.35, -1.5]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#2a1f15" />
      </mesh>

      {/* Grandfather clock silhouette */}
      <mesh position={[1.2, 0.6, -1.2]} castShadow>
        <boxGeometry args={[0.4, 1.2, 0.3]} />
        <meshStandardMaterial color="#1a1510" />
      </mesh>

      {/* EVIDENCE: Stopped clock face */}
      {roomEvidenceIds.includes('stopped-clock') && (
        <InteractiveObject
          position={[1.2, 0.9, -1.03]}
          geometry="cylinder"
          size={[0.12, 0.02]}
          baseColor="#c9a227"
          evidence={EVIDENCE_DATABASE['stopped-clock']}
          onExamine={onExamine}
          isDiscovered={isCollected('stopped-clock')}
        />
      )}

      {/* Dim hallway light */}
      <pointLight position={[0, 1, 0]} intensity={0.2} color="#ffaa77" distance={3} />
    </group>
  )
}

// Kitchen furniture - counter, stove, table
function KitchenFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Counter */}
      <mesh position={[-1.2, 0.4, -1]} castShadow>
        <boxGeometry args={[1.5, 0.8, 0.6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* EVIDENCE: Rat poison container on counter */}
      {roomEvidenceIds.includes('rat-poison') && (
        <InteractiveObject
          position={[-0.8, 0.85, -1]}
          geometry="cylinder"
          size={[0.08, 0.15]}
          baseColor="#4a4a4a"
          evidence={EVIDENCE_DATABASE['rat-poison']}
          onExamine={onExamine}
          isDiscovered={isCollected('rat-poison')}
        />
      )}

      {/* Stove */}
      <mesh position={[1, 0.35, -1.5]} castShadow>
        <boxGeometry args={[0.8, 0.7, 0.6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Small prep table */}
      <mesh position={[0, 0.35, 0.5]} castShadow>
        <boxGeometry args={[1, 0.08, 0.8]} />
        <meshStandardMaterial color="#4a4035" />
      </mesh>

      {/* Warm kitchen light */}
      <pointLight position={[0, 1.2, 0]} intensity={0.4} color="#ffcc88" distance={3} />
    </group>
  )
}

// Garden - benches, hedges, fountain
function GardenFurniture({ roomEvidenceIds, onExamine, isCollected }: FurnitureProps) {
  return (
    <group>
      {/* Garden bench */}
      <mesh position={[-1, 0.2, 0]} castShadow>
        <boxGeometry args={[1, 0.4, 0.4]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>

      {/* Hedge shapes */}
      <mesh position={[1.2, 0.4, -1]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#1a3a1a" />
      </mesh>
      <mesh position={[-1.2, 0.4, -1]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#1a3a1a" />
      </mesh>

      {/* Small fountain/birdbath */}
      <mesh position={[0.5, 0.25, 0.5]} castShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.5, 12]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* EVIDENCE: Discarded gloves in fountain */}
      {roomEvidenceIds.includes('discarded-gloves') && (
        <InteractiveObject
          position={[0.5, 0.55, 0.5]}
          geometry="box"
          size={[0.15, 0.03, 0.1]}
          baseColor="#3a2a1a"
          evidence={EVIDENCE_DATABASE['discarded-gloves']}
          onExamine={onExamine}
          isDiscovered={isCollected('discarded-gloves')}
        />
      )}

      {/* Moonlight */}
      <pointLight position={[0, 2, 0]} intensity={0.3} color="#aaccff" distance={5} />
    </group>
  )
}

// Reusable armchair component
function Armchair({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.5]} />
        <meshStandardMaterial color="#4a2020" />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.45, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.1]} />
        <meshStandardMaterial color="#4a2020" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, 0.3, 0]} castShadow>
        <boxGeometry args={[0.08, 0.15, 0.4]} />
        <meshStandardMaterial color="#3a1515" />
      </mesh>
      <mesh position={[0.25, 0.3, 0]} castShadow>
        <boxGeometry args={[0.08, 0.15, 0.4]} />
        <meshStandardMaterial color="#3a1515" />
      </mesh>
    </group>
  )
}
