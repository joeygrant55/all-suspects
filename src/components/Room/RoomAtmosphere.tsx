/**
 * Room Atmosphere Component
 * 
 * Displays a full-bleed cinematic video background for room environments.
 * Creates immersive noir atmosphere when entering different rooms.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type RoomId = 'study' | 'parlor' | 'dining' | 'kitchen' | 'hallway' | 'garden'
type TimeOfDay = 'night' | 'dawn' | 'dusk'
type WeatherCondition = 'clear' | 'rain' | 'storm' | 'fog'

interface RoomAtmosphereResult {
  roomId: RoomId
  videoUrl?: string
  generationId: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  error?: string
  timeOfDay: TimeOfDay
  weather: WeatherCondition
}

interface RoomAtmosphereProps {
  roomId: RoomId
  timeOfDay?: TimeOfDay
  weather?: WeatherCondition
  tension?: number
  onRoomReady?: () => void
  children?: React.ReactNode
  className?: string
  showRoomName?: boolean
}

import { getApiBase } from '../../api/client'

const API_BASE = getApiBase()

// Room display names
const ROOM_NAMES: Record<RoomId, string> = {
  study: "Edmund's Study",
  parlor: "The Parlor",
  dining: "Dining Room",
  kitchen: "The Kitchen",
  hallway: "Grand Hallway",
  garden: "The Garden",
}

// Fallback static backgrounds with gradients matching room mood
const ROOM_GRADIENTS: Record<RoomId, string> = {
  study: 'from-amber-950/90 via-stone-900/95 to-noir-black',
  parlor: 'from-rose-950/80 via-stone-900/95 to-noir-black',
  dining: 'from-red-950/80 via-stone-900/95 to-noir-black',
  kitchen: 'from-stone-800/90 via-stone-900/95 to-noir-black',
  hallway: 'from-slate-900/90 via-stone-900/95 to-noir-black',
  garden: 'from-emerald-950/60 via-stone-900/95 to-noir-black',
}

// Weather overlay effects
const WEATHER_OVERLAYS: Record<WeatherCondition, React.ReactNode> = {
  clear: null,
  rain: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Rain streaks effect using CSS */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 20px,
            rgba(180, 200, 220, 0.1) 20px,
            transparent 40px
          )`,
          animation: 'rain 0.5s linear infinite',
        }}
      />
    </div>
  ),
  storm: (
    <div className="absolute inset-0 pointer-events-none">
      {/* Lightning flash effect */}
      <motion.div
        className="absolute inset-0 bg-white/20"
        animate={{
          opacity: [0, 0, 0, 0.4, 0, 0.2, 0, 0, 0, 0, 0, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatDelay: Math.random() * 5,
        }}
      />
    </div>
  ),
  fog: (
    <div className="absolute inset-0 pointer-events-none">
      <div 
        className="absolute inset-0 bg-gradient-to-t from-gray-400/20 via-gray-500/10 to-transparent"
        style={{
          animation: 'fog-drift 20s ease-in-out infinite',
        }}
      />
    </div>
  ),
}

export function RoomAtmosphere({
  roomId,
  timeOfDay = 'night',
  weather = 'rain',
  tension = 50,
  onRoomReady,
  children,
  className = '',
  showRoomName = true,
}: RoomAtmosphereProps) {
  const [atmosphere, setAtmosphere] = useState<RoomAtmosphereResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch atmosphere when room changes
  const fetchAtmosphere = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsTransitioning(true)

    try {
      const params = new URLSearchParams({
        time: timeOfDay,
        weather,
        tension: tension.toString(),
      })
      
      const response = await fetch(`${API_BASE}/atmosphere/${roomId}?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch atmosphere')
      }
      
      const result: RoomAtmosphereResult = await response.json()
      setAtmosphere(result)

      if (result.status === 'generating' || result.status === 'pending') {
        startPolling()
      } else if (result.status === 'ready') {
        setIsLoading(false)
        onRoomReady?.()
      } else if (result.status === 'error') {
        setError(result.error || 'Failed to generate atmosphere')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch atmosphere:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch atmosphere')
      setIsLoading(false)
    }

    // Transition animation delay
    setTimeout(() => setIsTransitioning(false), 500)
  }, [roomId, timeOfDay, weather, tension, onRoomReady])

  // Poll for generation status
  const startPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
    }

    pollInterval.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          time: timeOfDay,
          weather,
        })
        
        const response = await fetch(`${API_BASE}/atmosphere/${roomId}/status?${params}`)
        
        if (response.ok) {
          const status: RoomAtmosphereResult = await response.json()
          setAtmosphere(status)
          
          if (status.status === 'ready' || status.status === 'error') {
            if (pollInterval.current) {
              clearInterval(pollInterval.current)
              pollInterval.current = null
            }
            setIsLoading(false)
            if (status.status === 'ready') {
              onRoomReady?.()
            }
            if (status.status === 'error') {
              setError(status.error || 'Generation failed')
            }
          }
        }
      } catch (err) {
        console.error('Error polling atmosphere status:', err)
      }
    }, 3000)
  }, [roomId, timeOfDay, weather, onRoomReady])

  useEffect(() => {
    fetchAtmosphere()

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [fetchAtmosphere])

  // Handle video playback
  useEffect(() => {
    if (atmosphere?.videoUrl && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked
      })
    }
  }, [atmosphere?.videoUrl])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Base gradient background (always visible as fallback) */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${ROOM_GRADIENTS[roomId]} transition-all duration-1000`}
      />

      {/* Video Background */}
      <AnimatePresence mode="wait">
        {atmosphere?.status === 'ready' && atmosphere.videoUrl && (
          <motion.div
            key={`video-${roomId}-${atmosphere.videoUrl}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <video
              ref={videoRef}
              src={atmosphere.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={() => setError('Video playback failed')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weather overlay effect */}
      {WEATHER_OVERLAYS[weather]}

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.7) 100%)',
        }}
      />

      {/* Top shadow for UI elements */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-noir-black/60 to-transparent pointer-events-none" />

      {/* Bottom shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-noir-black/80 to-transparent pointer-events-none" />

      {/* Room name display */}
      <AnimatePresence>
        {showRoomName && isTransitioning && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-5xl font-serif text-noir-cream tracking-wider drop-shadow-lg">
                {ROOM_NAMES[roomId]}
              </h2>
              <div className="w-32 h-0.5 bg-noir-gold/60 mx-auto mt-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator (subtle) */}
      {isLoading && !isTransitioning && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-noir-black/50 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-noir-gold animate-pulse" />
          <span className="text-noir-cream/60 text-xs">Loading atmosphere...</span>
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}

// Hook for room atmosphere management
export function useRoomAtmosphere(initialRoom?: RoomId) {
  const [currentRoom, setCurrentRoom] = useState<RoomId | null>(initialRoom || null)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night')
  const [weather, setWeather] = useState<WeatherCondition>('rain')
  const [tension, setTension] = useState(50)

  const enterRoom = useCallback((roomId: RoomId) => {
    setCurrentRoom(roomId)
  }, [])

  const exitRoom = useCallback(() => {
    setCurrentRoom(null)
  }, [])

  const updateConditions = useCallback((
    newTime?: TimeOfDay,
    newWeather?: WeatherCondition,
    newTension?: number
  ) => {
    if (newTime) setTimeOfDay(newTime)
    if (newWeather) setWeather(newWeather)
    if (newTension !== undefined) setTension(newTension)
  }, [])

  return {
    currentRoom,
    timeOfDay,
    weather,
    tension,
    enterRoom,
    exitRoom,
    updateConditions,
  }
}

export default RoomAtmosphere
