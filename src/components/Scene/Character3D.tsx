import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface Character3DProps {
  characterId: string
  position: [number, number, number]
  rotation?: number
  isHighlighted?: boolean
  isNearPlayer?: boolean
  onClick?: () => void
}

// Character visual configurations
const CHARACTER_CONFIGS: Record<string, {
  bodyColor: string
  accentColor: string
  headColor: string
  hasHat?: boolean
  hasDress?: boolean
  height: number
}> = {
  victoria: {
    bodyColor: '#5a1f27', // Deep burgundy dress
    accentColor: '#c9a227', // Gold accents (jewelry)
    headColor: '#e8d5c4', // Skin tone
    hasDress: true,
    height: 0.85,
  },
  thomas: {
    bodyColor: '#1a3a2a', // Dark green suit
    accentColor: '#8b4513', // Brown vest
    headColor: '#dbc4b0',
    height: 0.9,
  },
  eleanor: {
    bodyColor: '#1a2a4a', // Navy professional dress
    accentColor: '#aabbcc', // Light blue accents
    headColor: '#e8d5c4',
    hasDress: true,
    height: 0.8,
  },
  marcus: {
    bodyColor: '#2d2520', // Dark brown suit
    accentColor: '#f5f0e6', // White shirt visible
    headColor: '#d0b8a0',
    height: 0.95,
  },
  lillian: {
    bodyColor: '#3a1540', // Purple evening dress
    accentColor: '#d4a5a5', // Pink accents
    headColor: '#e8d5c4',
    hasDress: true,
    height: 0.82,
  },
  james: {
    bodyColor: '#0a0a0a', // Black formal suit
    accentColor: '#f5f0e6', // White shirt front
    headColor: '#c9b59a',
    height: 0.92,
  },
}

export function Character3D({
  characterId,
  position,
  rotation = 0,
  isHighlighted = false,
  isNearPlayer = false,
  onClick,
}: Character3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const config = CHARACTER_CONFIGS[characterId] || CHARACTER_CONFIGS.james

  // Subtle idle animation
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle breathing/swaying motion
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.01
      groupRef.current.rotation.y = rotation + Math.sin(state.clock.elapsedTime * 0.5 + position[2]) * 0.03
    }
  })

  // Character-specific body parts with memoized materials
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      roughness: 0.8,
      metalness: 0.1,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: config.accentColor,
      roughness: 0.6,
      metalness: 0.2,
    }),
    head: new THREE.MeshStandardMaterial({
      color: config.headColor,
      roughness: 0.9,
      metalness: 0,
    }),
    highlight: new THREE.MeshStandardMaterial({
      color: '#c9a227',
      emissive: '#c9a227',
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.3,
    }),
  }), [config])

  const scale = config.height

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      onClick={onClick}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'default'}
    >
      {/* Highlight ring when active */}
      {isHighlighted && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 12]} />
          <primitive object={materials.highlight} attach="material" />
        </mesh>
      )}

      {/* Character presence glow */}
      <pointLight
        position={[0, 0.4 * scale, 0]}
        intensity={isHighlighted ? 0.5 : 0.2}
        color={isHighlighted ? '#c9a227' : config.accentColor}
        distance={1.5}
      />

      {/* Base/Shadow circle */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.6} />
      </mesh>

      {/* Body */}
      {config.hasDress ? (
        // Dress silhouette - wider at bottom
        <mesh position={[0, 0.25 * scale, 0]} castShadow>
          <cylinderGeometry args={[0.06 * scale, 0.12 * scale, 0.35 * scale, 8]} />
          <primitive object={materials.body} attach="material" />
        </mesh>
      ) : (
        // Suit/pants - straight body
        <>
          {/* Torso */}
          <mesh position={[0, 0.32 * scale, 0]} castShadow>
            <cylinderGeometry args={[0.07 * scale, 0.06 * scale, 0.22 * scale, 8]} />
            <primitive object={materials.body} attach="material" />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.025, 0.12 * scale, 0]} castShadow>
            <cylinderGeometry args={[0.025 * scale, 0.03 * scale, 0.2 * scale, 6]} />
            <primitive object={materials.body} attach="material" />
          </mesh>
          <mesh position={[0.025, 0.12 * scale, 0]} castShadow>
            <cylinderGeometry args={[0.025 * scale, 0.03 * scale, 0.2 * scale, 6]} />
            <primitive object={materials.body} attach="material" />
          </mesh>
        </>
      )}

      {/* Accent - shirt/vest front or dress detail */}
      <mesh position={[0, 0.35 * scale, 0.035]} castShadow>
        <boxGeometry args={[0.04 * scale, 0.1 * scale, 0.01]} />
        <primitive object={materials.accent} attach="material" />
      </mesh>

      {/* Shoulders */}
      <mesh position={[0, 0.42 * scale, 0]} castShadow>
        <boxGeometry args={[0.16 * scale, 0.04 * scale, 0.06 * scale]} />
        <primitive object={materials.body} attach="material" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.09 * scale, 0.32 * scale, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.02 * scale, 0.02 * scale, 0.18 * scale, 6]} />
        <primitive object={materials.body} attach="material" />
      </mesh>
      <mesh position={[0.09 * scale, 0.32 * scale, 0]} rotation={[0, 0, -0.15]} castShadow>
        <cylinderGeometry args={[0.02 * scale, 0.02 * scale, 0.18 * scale, 6]} />
        <primitive object={materials.body} attach="material" />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.11 * scale, 0.22 * scale, 0]} castShadow>
        <sphereGeometry args={[0.018 * scale, 8, 8]} />
        <primitive object={materials.head} attach="material" />
      </mesh>
      <mesh position={[0.11 * scale, 0.22 * scale, 0]} castShadow>
        <sphereGeometry args={[0.018 * scale, 8, 8]} />
        <primitive object={materials.head} attach="material" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.46 * scale, 0]} castShadow>
        <cylinderGeometry args={[0.025 * scale, 0.03 * scale, 0.05 * scale, 8]} />
        <primitive object={materials.head} attach="material" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.54 * scale, 0]} castShadow>
        <sphereGeometry args={[0.05 * scale, 12, 12]} />
        <primitive object={materials.head} attach="material" />
      </mesh>

      {/* Hair / Hat - character specific */}
      <CharacterHair characterId={characterId} scale={scale} bodyColor={config.bodyColor} />

      {/* Interaction prompt when player is near */}
      {isNearPlayer && !isHighlighted && (
        <Html
          position={[0, 0.9, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(10, 10, 10, 0.9)',
              border: '1px solid #c9a227',
              borderRadius: '4px',
              padding: '6px 12px',
              fontFamily: 'Georgia, serif',
              fontSize: '12px',
              color: '#f5f0e6',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <span style={{ color: '#c9a227', fontWeight: 'bold' }}>E</span>
            <span style={{ margin: '0 4px' }}>to talk</span>
          </div>
        </Html>
      )}
    </group>
  )
}

// Character-specific hair/headwear
function CharacterHair({ characterId, scale }: { characterId: string; scale: number; bodyColor: string }) {
  switch (characterId) {
    case 'victoria':
      // Elegant updo with hair pin
      return (
        <group>
          <mesh position={[0, 0.58 * scale, -0.01]} castShadow>
            <sphereGeometry args={[0.04 * scale, 10, 10]} />
            <meshStandardMaterial color="#2a1a10" roughness={0.9} />
          </mesh>
          {/* Hair pin */}
          <mesh position={[0.02, 0.61 * scale, -0.02]} rotation={[0.3, 0, 0.5]}>
            <cylinderGeometry args={[0.003, 0.003, 0.04, 4]} />
            <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )

    case 'thomas':
      // Slicked back hair, nervous appearance
      return (
        <mesh position={[0, 0.57 * scale, -0.015]} castShadow>
          <boxGeometry args={[0.08 * scale, 0.03 * scale, 0.06 * scale]} />
          <meshStandardMaterial color="#1a0a00" roughness={0.7} />
        </mesh>
      )

    case 'eleanor':
      // Professional bob haircut
      return (
        <group>
          <mesh position={[0, 0.55 * scale, 0]} castShadow>
            <sphereGeometry args={[0.055 * scale, 10, 10]} />
            <meshStandardMaterial color="#3a2010" roughness={0.85} />
          </mesh>
        </group>
      )

    case 'marcus':
      // Distinguished graying hair
      return (
        <mesh position={[0, 0.57 * scale, -0.01]} castShadow>
          <boxGeometry args={[0.085 * scale, 0.025 * scale, 0.07 * scale]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
        </mesh>
      )

    case 'lillian':
      // Glamorous waves
      return (
        <group>
          <mesh position={[0, 0.56 * scale, 0]} castShadow>
            <sphereGeometry args={[0.055 * scale, 10, 10]} />
            <meshStandardMaterial color="#5a3020" roughness={0.8} />
          </mesh>
          {/* Decorative headband */}
          <mesh position={[0, 0.58 * scale, 0.03]} rotation={[0.3, 0, 0]}>
            <torusGeometry args={[0.045 * scale, 0.005, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )

    case 'james':
      // Neat, short butler hair
      return (
        <mesh position={[0, 0.565 * scale, 0]} castShadow>
          <sphereGeometry args={[0.048 * scale, 10, 10]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
        </mesh>
      )

    default:
      return null
  }
}

// Export character positions helper - maps character to room positions
export const CHARACTER_ROOM_POSITIONS: Record<string, [number, number, number]> = {
  // Offset from room center
  parlor: [-0.6, 0, 0.5],
  study: [0.5, 0, 0.6],
  'dining-room': [-0.5, 0, 0],
  hallway: [0.4, 0, 0.4],
  kitchen: [-0.5, 0, 0.3],
  garden: [0.6, 0, -0.4],
}
