import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Vignette, Bloom, Noise } from '@react-three/postprocessing'
import { Room } from './Room'
import { useGameStore } from '../../game/state'
import type { EvidenceData } from './InteractiveObject'

interface ManorSceneProps {
  onExamineEvidence: (evidence: EvidenceData) => void
}

interface ManorProps {
  onExamineEvidence: (evidence: EvidenceData) => void
}

function Manor({ onExamineEvidence }: ManorProps) {
  const characters = useGameStore((state) => state.characters)

  // Count characters per room
  const charactersByRoom = characters.reduce(
    (acc, char) => {
      acc[char.location] = (acc[char.location] || 0) + 1
      return acc
    },
    {} as Record<string, number>
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
          characterCount={charactersByRoom[room.name] || 0}
          onExamineEvidence={onExamineEvidence}
        />
      ))}
    </group>
  )
}

function Lighting() {
  return (
    <>
      {/* Ambient - very dim for noir feel */}
      <ambientLight intensity={0.15} color="#8888aa" />

      {/* Main moonlight from above-right */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={0.3}
        color="#aabbcc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Warm fill from the other side */}
      <directionalLight
        position={[-8, 10, -5]}
        intensity={0.15}
        color="#ffaa66"
      />

      {/* Subtle rim light */}
      <pointLight position={[0, 8, -15]} intensity={0.2} color="#6688aa" distance={30} />
    </>
  )
}

function PostProcessingEffects() {
  return (
    <EffectComposer>
      {/* Vignette - darkens edges for focus */}
      <Vignette eskil={false} offset={0.3} darkness={0.7} />

      {/* Bloom - makes lights glow */}
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        intensity={0.4}
      />

      {/* Film grain for noir aesthetic */}
      <Noise opacity={0.08} />
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
        {/* Fog for atmosphere */}
        <fog attach="fog" args={['#0a0a0f', 15, 40]} />

        {/* Lighting setup */}
        <Lighting />

        {/* The manor */}
        <Suspense fallback={<LoadingFallback />}>
          <Manor onExamineEvidence={onExamineEvidence} />
        </Suspense>

        {/* Post-processing effects */}
        <PostProcessingEffects />

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={30}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          target={[0, 0, -2]}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  )
}
