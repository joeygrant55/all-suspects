/**
 * useVoiceChat - React hook for real-time voice conversations with NPCs
 * 
 * Uses PersonaPlex for full-duplex speech-to-speech interaction.
 * Players can talk naturally, interrupt, and hear NPCs respond in unique voices.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface TranscriptEntry {
  speaker: 'player' | 'npc'
  text: string
  timestamp: number
}

interface UseVoiceChatOptions {
  characterId: string
  personaPlexUrl?: string
  onTranscript?: (entry: TranscriptEntry) => void
  onError?: (error: Error) => void
}

interface UseVoiceChatReturn {
  isConnected: boolean
  isListening: boolean
  isSpeaking: boolean
  transcript: TranscriptEntry[]
  startListening: () => Promise<void>
  stopListening: () => void
  sendText: (text: string) => void
  disconnect: () => void
  error: Error | null
}

/**
 * Hook for voice chat with NPCs using PersonaPlex
 */
export function useVoiceChat({
  characterId,
  personaPlexUrl = 'wss://localhost:8998',
  onTranscript,
  onError,
}: UseVoiceChatOptions): UseVoiceChatReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState<Error | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  // Connect to PersonaPlex server
  const connect = useCallback(async () => {
    try {
      wsRef.current = new WebSocket(personaPlexUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        // Send character configuration
        wsRef.current?.send(JSON.stringify({
          type: 'config',
          characterId,
        }))
      }

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Audio data from NPC
          const arrayBuffer = await event.data.arrayBuffer()
          playAudio(arrayBuffer)
        } else {
          // JSON message (transcript, status, etc.)
          try {
            const message = JSON.parse(event.data)
            handleMessage(message)
          } catch (e) {
            console.error('Failed to parse message:', e)
          }
        }
      }

      wsRef.current.onerror = () => {
        const err = new Error('WebSocket connection error')
        setError(err)
        onError?.(err)
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setIsListening(false)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Connection failed')
      setError(err)
      onError?.(err)
    }
  }, [characterId, personaPlexUrl, onError])

  // Handle incoming messages
  const handleMessage = useCallback((message: { type: string; [key: string]: unknown }) => {
    switch (message.type) {
      case 'transcript': {
        const entry: TranscriptEntry = {
          speaker: message.speaker as 'player' | 'npc',
          text: message.text as string,
          timestamp: Date.now(),
        }
        setTranscript(prev => [...prev, entry])
        onTranscript?.(entry)
        break
      }
      case 'speaking':
        setIsSpeaking(message.active as boolean)
        break
      case 'error':
        setError(new Error(message.message as string))
        break
    }
  }, [onTranscript])

  // Play audio from NPC
  const playAudio = useCallback(async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
      setIsSpeaking(true)
      source.onended = () => setIsSpeaking(false)
    } catch (e) {
      console.error('Failed to play audio:', e)
    }
  }, [])

  // Start listening (capture microphone)
  const startListening = useCallback(async () => {
    if (!isConnected) {
      await connect()
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
      
      // Process audio in chunks and send to PersonaPlex
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      processorRef.current.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const audioData = event.inputBuffer.getChannelData(0)
          const buffer = new Float32Array(audioData)
          wsRef.current.send(buffer.buffer)
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
  }, [isConnected, connect, onError])

  // Stop listening
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

  // Send text message (fallback)
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        content: text,
      }))
      
      // Add to transcript
      const entry: TranscriptEntry = {
        speaker: 'player',
        text,
        timestamp: Date.now(),
      }
      setTranscript(prev => [...prev, entry])
      onTranscript?.(entry)
    }
  }, [onTranscript])

  // Disconnect
  const disconnect = useCallback(() => {
    stopListening()
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [stopListening])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on character change
  useEffect(() => {
    setTranscript([])
    if (isConnected && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        characterId,
      }))
    }
  }, [characterId, isConnected])

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    sendText,
    disconnect,
    error,
  }
}

/**
 * Voice activity detection hook
 * Automatically detects when the player starts/stops speaking
 */
export function useVoiceActivityDetection(
  audioData: Float32Array | null,
  threshold = 0.01
): boolean {
  const [isActive, setIsActive] = useState(false)
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!audioData) return

    // Calculate RMS (root mean square) for volume level
    let sum = 0
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]
    }
    const rms = Math.sqrt(sum / audioData.length)

    if (rms > threshold) {
      setIsActive(true)
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
    } else if (isActive) {
      // Start silence timeout
      if (!silenceTimeoutRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          setIsActive(false)
          silenceTimeoutRef.current = null
        }, 500) // 500ms of silence = stopped speaking
      }
    }
  }, [audioData, threshold, isActive])

  return isActive
}
