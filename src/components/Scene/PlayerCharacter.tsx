import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerCharacterProps {
  onPositionChange: (position: THREE.Vector3, room: string | null) => void
  onInteract: () => void
  onExamine?: () => void
  roomBounds: RoomBounds[]
}

export interface RoomBounds {
  name: string
  center: [number, number, number]
  size: [number, number]  // width, depth
}

// Doorway definition (gaps in walls) - used for visual door frames only
interface Doorway {
  position: [number, number]  // center [x, z]
  width: number
  orientation: 'horizontal' | 'vertical'  // horizontal = runs along X, vertical = runs along Z
}

// Define doorways between rooms (for visual door frames)
// Layout:
// parlor (-4.5, -4.5)    study (0, -4.5)       dining-room (4.5, -4.5)
// hallway (-4.5, 0)      kitchen (0, 0)        garden (4.5, 0)
const DOORWAYS: Doorway[] = [
  // Horizontal connections (between top row)
  { position: [-2.5, -4.5], width: 1.2, orientation: 'vertical' },   // parlor ↔ study
  { position: [2.5, -4.5], width: 1.2, orientation: 'vertical' },    // study ↔ dining-room

  // Horizontal connections (between bottom row)
  { position: [-2.5, 0], width: 1.2, orientation: 'vertical' },      // hallway ↔ kitchen
  { position: [2.5, 0], width: 1.2, orientation: 'vertical' },       // kitchen ↔ garden

  // Vertical connections (between rows)
  { position: [-4.5, -2.5], width: 1.2, orientation: 'horizontal' }, // parlor ↔ hallway
  { position: [0, -2.5], width: 1.2, orientation: 'horizontal' },    // study ↔ kitchen
  { position: [4.5, -2.5], width: 1.2, orientation: 'horizontal' },  // dining-room ↔ garden
]

// Room bounds configuration matching the manor layout
export const MANOR_ROOM_BOUNDS: RoomBounds[] = [
  { name: 'parlor', center: [-4.5, 0, -4.5], size: [4, 4] },
  { name: 'study', center: [0, 0, -4.5], size: [4, 4] },
  { name: 'dining-room', center: [4.5, 0, -4.5], size: [4, 4] },
  { name: 'hallway', center: [-4.5, 0, 0], size: [4, 4] },
  { name: 'kitchen', center: [0, 0, 0], size: [4, 4] },
  { name: 'garden', center: [4.5, 0, 0], size: [4, 4] },
]

// Simplified collision - only check outer manor boundary
function wouldCollide(_currentPos: THREE.Vector3, newPos: THREE.Vector3): { x: boolean; z: boolean } {
  // Simple rectangular boundary for the entire manor
  const MANOR_BOUNDS = {
    minX: -7,
    maxX: 7,
    minZ: -7,
    maxZ: 2.5,
  }

  return {
    x: newPos.x < MANOR_BOUNDS.minX || newPos.x > MANOR_BOUNDS.maxX,
    z: newPos.z < MANOR_BOUNDS.minZ || newPos.z > MANOR_BOUNDS.maxZ,
  }
}

// Export doorways for Room.tsx to use
export { DOORWAYS }

// Movement state - support both arrow keys and WASD
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
}

export function PlayerCharacter({ onPositionChange, onInteract, onExamine, roomBounds }: PlayerCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const [isWalking, setIsWalking] = useState(false)
  const velocityRef = useRef(new THREE.Vector3())
  const targetRotationRef = useRef(0)
  const cameraAngleRef = useRef(0)
  const stepDistanceRef = useRef(0)  // Track distance for step animation

  // Movement constants - instant stops, no gliding
  const MOVE_SPEED = 3.0
  const ROTATION_SPEED = 12
  const CAMERA_ROTATE_SPEED = 2
  const STEP_LENGTH = 0.4  // Distance per step cycle

  // Mouse drag state for camera rotation
  const isDraggingRef = useRef(false)
  const lastMouseXRef = useRef(0)
  const zoomRef = useRef(1) // 1 = default, smaller = zoomed in

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Arrow keys and WASD for movement
      if (key === 'arrowup' || key === 'w') keys.up = true
      if (key === 'arrowdown' || key === 's') keys.down = true
      if (key === 'arrowleft' || key === 'a') keys.left = true
      if (key === 'arrowright' || key === 'd') keys.right = true

      // Q/R for camera rotation
      if (key === 'q') cameraAngleRef.current -= CAMERA_ROTATE_SPEED * 0.08
      if (key === 'r') cameraAngleRef.current += CAMERA_ROTATE_SPEED * 0.08

      // E for talking to characters
      if (key === 'e' && !e.repeat) {
        onInteract()
      }

      // F for examining evidence
      if (key === 'f' && !e.repeat && onExamine) {
        onExamine()
      }

      // Prevent arrow keys from scrolling the page
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (key === 'arrowup' || key === 'w') keys.up = false
      if (key === 'arrowdown' || key === 's') keys.down = false
      if (key === 'arrowleft' || key === 'a') keys.left = false
      if (key === 'arrowright' || key === 'd') keys.right = false
    }

    // Mouse handlers for camera rotation (left-click drag)
    const handleMouseDown = (e: MouseEvent) => {
      // Left-click to rotate camera
      if (e.button === 0) {
        isDraggingRef.current = true
        lastMouseXRef.current = e.clientX
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMouseXRef.current
        cameraAngleRef.current += deltaX * 0.005
        lastMouseXRef.current = e.clientX
      }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    // Mouse wheel for zoom
    const handleWheel = (e: WheelEvent) => {
      const zoomDelta = e.deltaY * 0.001
      zoomRef.current = Math.max(0.4, Math.min(1.5, zoomRef.current + zoomDelta))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [onInteract])

  // Detect which room the player is in
  const detectRoom = (pos: THREE.Vector3): string | null => {
    for (const room of roomBounds) {
      const [cx, , cz] = room.center
      const [w, d] = room.size

      if (
        pos.x >= cx - w / 2 &&
        pos.x <= cx + w / 2 &&
        pos.z >= cz - d / 2 &&
        pos.z <= cz + d / 2
      ) {
        return room.name
      }
    }
    return null
  }

  // Movement and camera follow
  useFrame((_state, delta) => {
    if (!groupRef.current) return

    // Calculate movement direction based on camera orientation
    const cameraDirection = new THREE.Vector3(
      -Math.sin(cameraAngleRef.current),
      0,
      -Math.cos(cameraAngleRef.current)
    )

    const cameraRight = new THREE.Vector3(
      Math.cos(cameraAngleRef.current),
      0,
      -Math.sin(cameraAngleRef.current)
    )

    // Input to movement
    const moveDirection = new THREE.Vector3()

    if (keys.up) moveDirection.add(cameraDirection)
    if (keys.down) moveDirection.sub(cameraDirection)
    if (keys.left) moveDirection.sub(cameraRight)
    if (keys.right) moveDirection.add(cameraRight)

    const isMoving = moveDirection.length() > 0
    setIsWalking(isMoving)

    if (isMoving) {
      moveDirection.normalize()

      // Update target rotation to face movement direction
      targetRotationRef.current = Math.atan2(moveDirection.x, moveDirection.z)

      // Apply movement directly (no momentum)
      velocityRef.current.copy(moveDirection.multiplyScalar(MOVE_SPEED * delta))

      // Track distance for step animation
      stepDistanceRef.current += velocityRef.current.length()
    } else {
      // INSTANT STOP - no gliding, no damping
      velocityRef.current.set(0, 0, 0)
    }

    // Update position with wall collision detection
    const currentPos = groupRef.current.position.clone()
    const newPos = currentPos.clone().add(velocityRef.current)

    // Check wall collisions separately for X and Z
    const collision = wouldCollide(currentPos, newPos)

    // Apply movement only in directions without collision (allows wall sliding)
    if (!collision.x) {
      groupRef.current.position.x = newPos.x
    }
    if (!collision.z) {
      groupRef.current.position.z = newPos.z
    }

    // Smooth rotation
    const currentRotation = groupRef.current.rotation.y
    const rotationDiff = targetRotationRef.current - currentRotation

    // Handle angle wrapping
    let shortestRotation = rotationDiff
    if (Math.abs(rotationDiff) > Math.PI) {
      shortestRotation = rotationDiff - Math.sign(rotationDiff) * Math.PI * 2
    }

    groupRef.current.rotation.y += shortestRotation * ROTATION_SPEED * delta

    // Update camera to follow player with user-controlled angle and zoom
    const baseDistance = 10 * zoomRef.current
    const baseHeight = 8 * zoomRef.current
    const idealOffset = new THREE.Vector3(0, baseHeight, baseDistance)
    idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleRef.current)

    const idealPosition = groupRef.current.position.clone().add(idealOffset)

    // Smooth camera follow
    camera.position.lerp(idealPosition, 5 * delta)

    // Look at player
    const lookAtPoint = groupRef.current.position.clone()
    lookAtPoint.y += 0.5
    camera.lookAt(lookAtPoint)

    // Notify parent of position change
    const currentRoom = detectRoom(groupRef.current.position)
    onPositionChange(groupRef.current.position.clone(), currentRoom)
  })

  // Walking animation - tied to distance traveled for realistic stepping
  const stepPhase = (stepDistanceRef.current / STEP_LENGTH) * Math.PI * 2
  const walkBob = isWalking ? Math.abs(Math.sin(stepPhase)) * 0.05 : 0
  const walkTilt = isWalking ? Math.sin(stepPhase) * 0.03 : 0  // Slight side-to-side

  return (
    <group ref={groupRef} position={[0, 0, 2]}>
      {/* Player shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.4} />
      </mesh>

      {/* Detective character with walking animation */}
      <group position={[0, walkBob, 0]} rotation={[0, 0, walkTilt]}>
        {/* Body - trench coat */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.14, 0.45, 8]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>

        {/* Coat flaps */}
        <mesh position={[0, 0.18, 0.06]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.25, 0.02]} />
          <meshStandardMaterial color="#3d3530" roughness={0.9} />
        </mesh>

        {/* Belt */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.095, 0.095, 0.03, 8]} />
          <meshStandardMaterial color="#2a2015" roughness={0.7} />
        </mesh>

        {/* Shoulders */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.22, 0.06, 0.1]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.12, 0.38, 0]} rotation={[0, 0, 0.15]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 6]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>
        <mesh position={[0.12, 0.38, 0]} rotation={[0, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.25, 6]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>

        {/* Hands */}
        <mesh position={[-0.14, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#d4b896" roughness={0.9} />
        </mesh>
        <mesh position={[0.14, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#d4b896" roughness={0.9} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.56, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#d4b896" roughness={0.9} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.64, 0]} castShadow>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#d4b896" roughness={0.9} />
        </mesh>

        {/* Fedora hat */}
        <group position={[0, 0.72, 0]}>
          {/* Hat brim */}
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.015, 16]} />
            <meshStandardMaterial color="#1a1815" roughness={0.85} />
          </mesh>
          {/* Hat crown */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.07, 12]} />
            <meshStandardMaterial color="#1a1815" roughness={0.85} />
          </mesh>
          {/* Hat band */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.072, 0.072, 0.015, 12]} />
            <meshStandardMaterial color="#c9a227" roughness={0.6} metalness={0.2} />
          </mesh>
        </group>

        {/* Collar turned up */}
        <mesh position={[0, 0.54, -0.04]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.54, 0.04]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshStandardMaterial color="#4a4035" roughness={0.9} />
        </mesh>
      </group>

      {/* Player indicator light */}
      <pointLight
        position={[0, 1, 0]}
        intensity={0.3}
        color="#c9a227"
        distance={2}
      />
    </group>
  )
}

