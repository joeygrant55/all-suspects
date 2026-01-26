/**
 * useHybridVoice - React hook for hybrid Claude Agent + PersonaPlex voice
 * 
 * This hook provides:
 * - Push-to-talk voice input (transcribed by PersonaPlex)
 * - Full Claude Agent intelligence (memory, tools, lies, pressure)
 * - Character voice output (synthesized by PersonaPlex)
 * - Real-time transcript and emotion feedback
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Message types matching server protocol
interface HybridVoiceMessage {
  type: string
  sessionId: string
  data: unknown
}

interface TranscriptEntry {
  speaker: 'player' | 'npc'
  text: string
  timestamp: number
}

interface ToolUsage {
  tools: string[]
}

interface EmotionUpdate {
  emotion: string
}

interface UseHybridVoiceOptions {
  serverUrl?: string
  onTranscript?: (entry: TranscriptEntry) => void
  onEmotion?: (emotion: string) => void
  onToolsUsed?: (tools: string[]) => void
  onError?: (error: Error) => void
}

interface UseHybridVoiceReturn {
  // Connection state
  isConnected: boolean
  isSessionActive: boolean
  currentCharacter: string | null
  
  // Voice state
  isListening: boolean
  isSpeaking: boolean
  currentEmotion: string
  
  // Transcript
  transcript: TranscriptEntry[]
  toolsUsed: string[]
  
  // Actions
  startSession: (characterId: string) => Promise<void>
  endSession: () => void
  startListening: () => Promise<void>
  stopListening: () => void
  sendText: (text: string) => void
  
  // Error state
  error: Error | null
}

/**
 * Hook for hybrid voice conversations with full Agent SDK intelligence
 */
export function useHybridVoice({
  serverUrl = 'ws://localhost:3001/voice',
  onTranscript,
  onEmotion,
  onToolsUsed,
  onError,
}: UseHybridVoiceOptions = {}): UseHybridVoiceReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentCharacter, setCurrentCharacter] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  
  // Data
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [toolsUsed, setToolsUsed] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)

  /**
   * Connect to hybrid voice server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      wsRef.current = new WebSocket(serverUrl)

      wsRef.current.binaryType = 'arraybuffer'

      wsRef.current.onopen = () => {
        console.log('[HybridVoice] Connected to server')
        setIsConnected(true)
        setError(null)
      }

      wsRef.current.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary audio data - queue for playback
          handleAudioOutput(event.data)
        } else {
          // JSON message
          try {
            const message = JSON.parse(event.data) as HybridVoiceMessage
            handleServerMessage(message)
          } catch (e) {
            console.error('[HybridVoice] Failed to parse message:', e)
          }
        }
      }

      wsRef.current.onerror = () => {
        const err = new Error('WebSocket connection error')
        setError(err)
        onError?.(err)
      }

      wsRef.current.onclose = () => {
        console.log('[HybridVoice] Disconnected from server')
        setIsConnected(false)
        setIsSessionActive(false)
        setCurrentCharacter(null)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Connection failed')
      setError(err)
      onError?.(err)
    }
  }, [serverUrl, onError])

  /**
   * Handle messages from server
   */
  const handleServerMessage = useCallback((message: HybridVoiceMessage) => {
    const { type, data } = message

    switch (type) {
      case 'session:start': {
        const { sessionId: sid, characterId, characterName } = data as {
          sessionId?: string
          characterId?: string
          characterName?: string
        }
        if (sid) setSessionId(sid)
        if (characterId) {
          setCurrentCharacter(characterId)
          setIsSessionActive(true)
          setTranscript([]) // Clear transcript for new session
          setToolsUsed([])
        }
        break
      }

      case 'session:end': {
        setIsSessionActive(false)
        setCurrentCharacter(null)
        break
      }

      case 'transcript': {
        const entry = data as TranscriptEntry
        setTranscript(prev => [...prev, entry])
        onTranscript?.(entry)
        break
      }

      case 'emotion': {
        const { emotion } = data as EmotionUpdate
        setCurrentEmotion(emotion)
        onEmotion?.(emotion)
        break
      }

      case 'tools': {
        const { tools } = data as ToolUsage
        setToolsUsed(tools)
        onToolsUsed?.(tools)
        break
      }

      case 'audio:output': {
        const { speaking } = data as { speaking?: boolean }
        if (speaking !== undefined) {
          setIsSpeaking(speaking)
        }
        break
      }

      case 'error': {
        const { message: errorMessage } = data as { message: string }
        const err = new Error(errorMessage)
        setError(err)
        onError?.(err)
        break
      }
    }
  }, [onTranscript, onEmotion, onToolsUsed, onError])

  /**
   * Handle audio output from server (NPC speech)
   */
  const handleAudioOutput = useCallback(async (audioBuffer: ArrayBuffer) => {
    audioQueueRef.current.push(audioBuffer)
    
    if (!isPlayingRef.current) {
      playNextAudio()
    }
  }, [])

  /**
   * Play queued audio
   */
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      setIsSpeaking(false)
      return
    }

    isPlayingRef.current = true
    setIsSpeaking(true)

    const buffer = audioQueueRef.current.shift()!

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(buffer.slice(0))
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      
      source.onended = () => {
        playNextAudio()
      }
      
      source.start()
    } catch (e) {
      console.error('[HybridVoice] Failed to play audio:', e)
      playNextAudio() // Try next chunk
    }
  }, [])

  /**
   * Start a voice session with a character
   */
  const startSession = useCallback(async (characterId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect()
      // Wait for connection
      await new Promise<void>((resolve) => {
        const checkConnection = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection)
            resolve()
          }
        }, 100)
      })
    }

    wsRef.current!.send(JSON.stringify({
      type: 'session:start',
      sessionId: sessionId || 'pending',
      data: { characterId },
    }))
  }, [connect, sessionId])

  /**
   * End the current session
   */
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'session:end',
        sessionId,
        data: {},
      }))
    }
    
    stopListening()
    setIsSessionActive(false)
    setCurrentCharacter(null)
  }, [sessionId])

  /**
   * Start listening (capture microphone and stream to server)
   */
  const startListening = useCallback(async () => {
    if (!isSessionActive) {
      console.warn('[HybridVoice] Cannot listen without active session')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      mediaStreamRef.current = stream

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Process audio in chunks and send to server
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const audioData = event.inputBuffer.getChannelData(0)
          const buffer = new Float32Array(audioData).buffer
          wsRef.current.send(buffer)
        }
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
      
      setIsListening(true)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Microphone access denied')
      setError(err)
      onError?.(err)
    }
  }, [isSessionActive, onError])

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    setIsListening(false)
  }, [])

  /**
   * Send text input (fallback for typed questions)
   */
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'text:input',
        sessionId,
        data: { text },
      }))
    }
  }, [sessionId])

  // Connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      stopListening()
      wsRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    isSessionActive,
    currentCharacter,
    isListening,
    isSpeaking,
    currentEmotion,
    transcript,
    toolsUsed,
    startSession,
    endSession,
    startListening,
    stopListening,
    sendText,
    error,
  }
}

/**
 * Emotion to emoji mapping for UI
 */
export const emotionEmojis: Record<string, string> = {
  neutral: '😐',
  nervous: '😰',
  angry: '😠',
  sad: '😢',
  amused: '😏',
  indignant: '😤',
  defensive: '🛡️',
  evasive: '👀',
  guarded: '🤐',
}

/**
 * Emotion to color mapping for UI
 */
export const emotionColors: Record<string, string> = {
  neutral: 'text-gray-400',
  nervous: 'text-yellow-400',
  angry: 'text-red-400',
  sad: 'text-blue-400',
  amused: 'text-green-400',
  indignant: 'text-orange-400',
  defensive: 'text-purple-400',
  evasive: 'text-cyan-400',
  guarded: 'text-noir-gold',
}
