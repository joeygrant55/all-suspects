import { useState, useMemo } from 'react'
import { useGameStore, type Character } from '../../game/state'
import * as THREE from 'three'
import { InteractiveObject, type EvidenceData } from './InteractiveObject'
import { Character3D } from './Character3D'
import { EVIDENCE_DATABASE, EVIDENCE_BY_ROOM } from '../../data/evidence'
import { DOORWAYS } from './PlayerCharacter'

// Room-specific floor textures (procedural patterns)
const ROOM_FLOOR_CONFIGS: Record<string, { baseColor: string; patternColor: string; pattern: 'wood' | 'tile' | 'carpet' | 'stone' }> = {
  parlor: { baseColor: '#2a1a10', patternColor: '#3a2a1a', pattern: 'wood' },
  study: { baseColor: '#1a2a1a', patternColor: '#2a3a2a', pattern: 'wood' },
  'dining-room': { baseColor: '#2a1f15', patternColor: '#3a2f25', pattern: 'wood' },
  hallway: { baseColor: '#1a1a1a', patternColor: '#2a2a2a', pattern: 'tile' },
  kitchen: { baseColor: '#252520', patternColor: '#353530', pattern: 'tile' },
  garden: { baseColor: '#0a150a', patternColor: '#1a2a1a', pattern: 'stone' },
}


// Doorway info type
interface DoorwayInfo {
  position: number  // Position along the wall (X for horizontal, Z for vertical)
  width: number
}

// Helper to get doorways for a specific wall
function getDoorwaysForWall(
  roomCenterX: number,
  roomCenterZ: number,
  wall: 'back' | 'front' | 'left' | 'right'
): DoorwayInfo[] {
  const WALL_OFFSET = 1.95
  const wallPositions = {
    back: roomCenterZ - WALL_OFFSET,
    front: roomCenterZ + WALL_OFFSET,
    left: roomCenterX - WALL_OFFSET,
    right: roomCenterX + WALL_OFFSET,
  }

  const isHorizontalWall = wall === 'back' || wall === 'front'
  const wallCoord = wallPositions[wall]

  return DOORWAYS
    .filter(d => {
      if (isHorizontalWall) {
        return d.orientation === 'horizontal' && Math.abs(d.position[1] - wallCoord) < 0.5
      } else {
        return d.orientation === 'vertical' && Math.abs(d.position[0] - wallCoord) < 0.5
      }
    })
    .map(d => ({
      position: isHorizontalWall ? d.position[0] - roomCenterX : d.position[1] - roomCenterZ,
      width: d.width,
    }))
}

interface RoomProps {
  name: string
  position: [number, number, number]
  color: string
  characters: Character[]
  currentConversation: string | null
  playerPosition: [number, number, number]
  onCharacterClick: (characterId: string) => void
  onExamineEvidence: (evidence: EvidenceData) => void
}

const INTERACTION_DISTANCE = 1.5

export function Room({ name, position, color, characters, currentConversation, playerPosition, onCharacterClick, onExamineEvidence }: RoomProps) {
  const [hovered, setHovered] = useState(false)
  const setCurrentRoom = useGameStore((state) => state.setCurrentRoom)
  const currentRoom = useGameStore((state) => state.currentRoom)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const isActive = currentRoom === name

  // Calculate distance from player to a world position
  const getDistanceToPlayer = (worldX: number, worldZ: number) => {
    const dx = playerPosition[0] - worldX
    const dz = playerPosition[2] - worldZ
    return Math.sqrt(dx * dx + dz * dz)
  }

  const handleClick = () => {
    setCurrentRoom(name)
  }

  // Get evidence for this room
  const roomEvidenceIds = EVIDENCE_BY_ROOM[name] || []

  // Check if evidence is collected
  const isEvidenceCollected = (evidenceId: string) => {
    return collectedEvidence.some((e) => e.source === evidenceId)
  }

  // Get room-specific floor config
  const floorConfig = ROOM_FLOOR_CONFIGS[name] || { baseColor: color, patternColor: color, pattern: 'wood' }
  // wallConfig is available in ROOM_WALL_CONFIGS but currently handled in RoomWalls component

  // Create floor material
  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isActive ? '#c9a227' : hovered ? '#3a3a3a' : floorConfig.baseColor,
      roughness: floorConfig.pattern === 'wood' ? 0.85 : 0.9,
      metalness: 0.05,
    })
  }, [isActive, hovered, floorConfig])

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
      {/* Room floor with pattern */}
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

      {/* Simple rug for parlor, dining room, study, hallway (removed floor patterns for performance) */}
      {(name === 'parlor' || name === 'dining-room' || name === 'study' || name === 'hallway') && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[name === 'hallway' ? 1.5 : 2.2, name === 'hallway' ? 3.5 : 2.2]} />
          <meshStandardMaterial
            color={isActive ? '#8b6914' : name === 'hallway' ? '#3a2020' : '#4a2020'}
            roughness={1}
          />
        </mesh>
      )}

      {/* Room walls with doorways */}
      <RoomWalls roomCenterX={position[0]} roomCenterZ={position[2]} />

      {/* Room-specific furniture with evidence */}
      {renderFurniture()}

      {/* 3D Character models */}
      {characters.map((character, index) => {
        // Position characters in a semi-circle at front of room
        const angle = (index - (characters.length - 1) / 2) * 0.6
        const radius = 0.7
        const charX = Math.sin(angle) * radius
        const charZ = 0.6 + Math.cos(angle) * 0.3

        // Calculate world position and distance to player
        const worldX = position[0] + charX
        const worldZ = position[2] + charZ
        const distanceToPlayer = getDistanceToPlayer(worldX, worldZ)
        const isNearPlayer = distanceToPlayer < INTERACTION_DISTANCE

        return (
          <Character3D
            key={character.id}
            characterId={character.id}
            position={[charX, 0, charZ]}
            rotation={Math.PI + angle * 0.3} // Face slightly towards center
            isHighlighted={currentConversation === character.id}
            isNearPlayer={isNearPlayer}
            onClick={() => {
              setCurrentRoom(name)
              onCharacterClick(character.id)
            }}
          />
        )
      })}

      {/* Room highlight when active (no shadow for performance) */}
      {isActive && (
        <pointLight
          position={[0, 1.5, 0]}
          intensity={0.3}
          color="#c9a227"
          distance={4}
        />
      )}
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

// Room walls component - minimal floor trim for room separation
function RoomWalls({ roomCenterX, roomCenterZ }: { roomCenterX: number; roomCenterZ: number }) {
  const WALL_HEIGHT = 0.12  // Very low - just floor trim/baseboards
  const WALL_THICKNESS = 0.06
  const ROOM_HALF_SIZE = 1.95

  // Get doorways for each wall
  const backDoorways = getDoorwaysForWall(roomCenterX, roomCenterZ, 'back')
  const frontDoorways = getDoorwaysForWall(roomCenterX, roomCenterZ, 'front')
  const leftDoorways = getDoorwaysForWall(roomCenterX, roomCenterZ, 'left')
  const rightDoorways = getDoorwaysForWall(roomCenterX, roomCenterZ, 'right')

  return (
    <group>
      {/* Back wall (horizontal, at z = -1.95) */}
      <WallWithDoorway
        wallStart={-ROOM_HALF_SIZE}
        wallEnd={ROOM_HALF_SIZE}
        fixedCoord={-ROOM_HALF_SIZE}
        height={WALL_HEIGHT}
        thickness={WALL_THICKNESS}
        orientation="horizontal"
        doorways={backDoorways}
      />

      {/* Front wall (horizontal, at z = 1.95) */}
      <WallWithDoorway
        wallStart={-ROOM_HALF_SIZE}
        wallEnd={ROOM_HALF_SIZE}
        fixedCoord={ROOM_HALF_SIZE}
        height={WALL_HEIGHT}
        thickness={WALL_THICKNESS}
        orientation="horizontal"
        doorways={frontDoorways}
      />

      {/* Left wall (vertical, at x = -1.95) */}
      <WallWithDoorway
        wallStart={-ROOM_HALF_SIZE}
        wallEnd={ROOM_HALF_SIZE}
        fixedCoord={-ROOM_HALF_SIZE}
        height={WALL_HEIGHT}
        thickness={WALL_THICKNESS}
        orientation="vertical"
        doorways={leftDoorways}
      />

      {/* Right wall (vertical, at x = 1.95) */}
      <WallWithDoorway
        wallStart={-ROOM_HALF_SIZE}
        wallEnd={ROOM_HALF_SIZE}
        fixedCoord={ROOM_HALF_SIZE}
        height={WALL_HEIGHT}
        thickness={WALL_THICKNESS}
        orientation="vertical"
        doorways={rightDoorways}
      />
    </group>
  )
}

// Wall segment with optional doorway gaps
interface WallWithDoorwayProps {
  wallStart: number
  wallEnd: number
  fixedCoord: number
  height: number
  thickness: number
  orientation: 'horizontal' | 'vertical'
  doorways: DoorwayInfo[]
}

function WallWithDoorway({
  wallStart,
  wallEnd,
  fixedCoord,
  height,
  thickness,
  orientation,
  doorways,
}: WallWithDoorwayProps) {
  const WALL_COLOR = '#1a1512'
  const TRIM_COLOR = '#2a2218'

  // Generate wall segments with gaps for doorways
  const segments: { start: number; end: number }[] = []
  let currentStart = wallStart

  // Sort doorways by position
  const sortedDoorways = [...doorways].sort((a, b) => a.position - b.position)

  for (const doorway of sortedDoorways) {
    const gapStart = doorway.position - doorway.width / 2
    const gapEnd = doorway.position + doorway.width / 2

    if (currentStart < gapStart) {
      segments.push({ start: currentStart, end: gapStart })
    }
    currentStart = gapEnd
  }

  if (currentStart < wallEnd) {
    segments.push({ start: currentStart, end: wallEnd })
  }

  // If no doorways, render full wall
  if (doorways.length === 0) {
    segments.push({ start: wallStart, end: wallEnd })
  }

  return (
    <group>
      {/* Wall segments */}
      {segments.map((segment, i) => {
        const length = segment.end - segment.start
        const center = (segment.start + segment.end) / 2

        if (orientation === 'horizontal') {
          return (
            <group key={i}>
              {/* Main wall */}
              <mesh position={[center, height / 2, fixedCoord]} castShadow receiveShadow>
                <boxGeometry args={[length, height, thickness]} />
                <meshStandardMaterial color={WALL_COLOR} />
              </mesh>
              {/* Wainscoting trim */}
              <mesh position={[center, 0.15, fixedCoord + (fixedCoord > 0 ? -0.03 : 0.03)]}>
                <boxGeometry args={[length, 0.05, 0.05]} />
                <meshStandardMaterial color={TRIM_COLOR} />
              </mesh>
            </group>
          )
        } else {
          return (
            <group key={i}>
              {/* Main wall */}
              <mesh position={[fixedCoord, height / 2, center]} castShadow receiveShadow>
                <boxGeometry args={[thickness, height, length]} />
                <meshStandardMaterial color={WALL_COLOR} />
              </mesh>
              {/* Wainscoting trim */}
              <mesh position={[fixedCoord + (fixedCoord > 0 ? -0.03 : 0.03), 0.15, center]}>
                <boxGeometry args={[0.05, 0.05, length]} />
                <meshStandardMaterial color={TRIM_COLOR} />
              </mesh>
            </group>
          )
        }
      })}

      {/* Subtle floor markers at doorway locations */}
      {sortedDoorways.map((doorway, i) => {
        const MARKER_HEIGHT = 0.02

        if (orientation === 'horizontal') {
          return (
            <group key={`frame-${i}`}>
              {/* Gold floor accent at doorway */}
              <mesh position={[doorway.position, MARKER_HEIGHT, fixedCoord]} receiveShadow>
                <boxGeometry args={[doorway.width + 0.2, 0.015, 0.15]} />
                <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.5} />
              </mesh>
            </group>
          )
        } else {
          return (
            <group key={`frame-${i}`}>
              {/* Gold floor accent at doorway */}
              <mesh position={[fixedCoord, MARKER_HEIGHT, doorway.position]} receiveShadow>
                <boxGeometry args={[0.15, 0.015, doorway.width + 0.2]} />
                <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.5} />
              </mesh>
            </group>
          )
        }
      })}
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
