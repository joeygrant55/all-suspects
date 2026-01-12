import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'

export interface EvidenceData {
  id: string
  name: string
  description: string
  detailedDescription: string
  type: 'physical' | 'document' | 'testimony'
  relatedCharacter?: string
  prerequisite?: string // Evidence ID that must be found first
}

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
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)

  // Animate glow intensity on hover
  useFrame(() => {
    if (glowRef.current) {
      const targetIntensity = hovered && !isLocked ? 0.8 : 0
      glowRef.current.intensity += (targetIntensity - glowRef.current.intensity) * 0.1
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
        ref={meshRef}
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
      <pointLight
        ref={glowRef}
        position={[0, 0.3, 0]}
        intensity={0}
        color="#c9a227"
        distance={1.5}
      />

      {/* Subtle indicator that this object is interactive (not yet discovered) */}
      {!isDiscovered && !isLocked && (
        <mesh position={[0, 0.5, 0]} scale={hovered ? 1.2 : 1}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial
            color="#c9a227"
            emissive="#c9a227"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  )
}
