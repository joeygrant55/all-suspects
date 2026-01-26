import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EvidenceData } from '../../types/evidence'

// Re-export for backward compatibility
export type { EvidenceData }

interface InteractiveObjectProps {
  position: [number, number, number]
  geometry: 'box' | 'cylinder' | 'sphere'
  size: [number, number, number] | [number, number] | number
  baseColor: string
  evidence: EvidenceData
  onExamine: (evidence: EvidenceData) => void
  isDiscovered?: boolean
  isLocked?: boolean
}

export function InteractiveObject({
  position,
  geometry,
  size,
  baseColor,
  evidence,
  onExamine,
  isDiscovered = false,
  isLocked = false,
}: InteractiveObjectProps) {
  const [hovered, setHovered] = useState(false)
  const indicatorRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  // Animate the indicator and glow
  useFrame((state) => {
    if (!isDiscovered && !isLocked) {
      const time = state.clock.elapsedTime

      // Floating animation for indicator
      if (indicatorRef.current) {
        indicatorRef.current.position.y = 0.5 + Math.sin(time * 2) * 0.05
        indicatorRef.current.rotation.y = time * 0.5
      }

      // Pulsing light intensity
      if (lightRef.current) {
        lightRef.current.intensity = 0.3 + Math.sin(time * 3) * 0.15
      }

      // Pulsing glow
      if (glowRef.current) {
        const scale = 1 + Math.sin(time * 2) * 0.2
        glowRef.current.scale.set(scale, scale, scale)
      }
    }
  })

  const handleClick = () => {
    if (!isLocked) {
      onExamine(evidence)
    }
  }

  const handlePointerOver = () => {
    if (!isLocked) {
      setHovered(true)
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  // Determine material color based on state
  const getMaterialColor = () => {
    if (isLocked) return baseColor
    if (isDiscovered) return '#4a4a4a' // Dimmed after discovery
    if (hovered) return '#c9a227' // Gold highlight on hover
    return baseColor
  }

  const getEmissiveColor = () => {
    if (isLocked || isDiscovered) return '#000000'
    if (hovered) return '#c9a227'
    return '#000000'
  }

  const getEmissiveIntensity = () => {
    if (isLocked || isDiscovered) return 0
    if (hovered) return 0.3
    return 0
  }

  return (
    <group position={position}>
      {/* The interactive object mesh */}
      <mesh
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
      >
        {geometry === 'box' && (
          <boxGeometry args={size as [number, number, number]} />
        )}
        {geometry === 'cylinder' && (
          <cylinderGeometry args={[...(size as [number, number]), 16]} />
        )}
        {geometry === 'sphere' && (
          <sphereGeometry args={[size as number, 16, 16]} />
        )}
        <meshStandardMaterial
          color={getMaterialColor()}
          emissive={getEmissiveColor()}
          emissiveIntensity={getEmissiveIntensity()}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Glow light when hovering */}
      {hovered && !isLocked && (
        <pointLight
          position={[0, 0.3, 0]}
          intensity={0.8}
          color="#c9a227"
          distance={2}
        />
      )}

      {/* Persistent subtle light for undiscovered items */}
      {!isDiscovered && !isLocked && (
        <pointLight
          ref={lightRef}
          position={[0, 0.3, 0]}
          intensity={0.3}
          color="#c9a227"
          distance={1.2}
        />
      )}

      {/* Glow ring around undiscovered evidence */}
      {!isDiscovered && !isLocked && (
        <mesh
          ref={glowRef}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.15, 0.2, 32]} />
          <meshStandardMaterial
            color="#c9a227"
            emissive="#c9a227"
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Floating indicator above undiscovered evidence */}
      {!isDiscovered && !isLocked && (
        <group ref={indicatorRef} position={[0, 0.5, 0]}>
          {/* Diamond shape */}
          <mesh scale={hovered ? 1.3 : 1}>
            <octahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial
              color="#c9a227"
              emissive="#c9a227"
              emissiveIntensity={hovered ? 1.2 : 0.8}
              transparent
              opacity={hovered ? 1 : 0.7}
            />
          </mesh>
          {/* Glow around diamond */}
          <mesh scale={hovered ? 1.5 : 1.2}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color="#c9a227"
              emissive="#c9a227"
              emissiveIntensity={0.3}
              transparent
              opacity={0.2}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
