/**
 * PersonaPlex WebSocket Client
 * 
 * Handles real-time audio streaming to/from PersonaPlex server.
 * Supports full-duplex conversation (speak + listen simultaneously).
 */

import { EventEmitter } from 'events'
import { PersonaPlexConfig, TranscriptSegment, AudioChunk } from './personaplex'

export interface PersonaPlexClientEvents {
  'connected': () => void
  'disconnected': () => void
  'audio': (chunk: AudioChunk) => void
  'transcript': (segment: TranscriptSegment) => void
  'error': (error: Error) => void
  'status': (status: string) => void
}

/**
 * Client for connecting to a PersonaPlex server instance.
 * Each character gets their own client with unique voice/persona.
 */
export class PersonaPlexClient extends EventEmitter {
  private ws: WebSocket | null = null
  private config: PersonaPlexConfig
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  
  constructor(config: PersonaPlexConfig) {
    super()
    this.config = config
  }

  /**
   * Connect to PersonaPlex server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Note: In Node.js, you'd use 'ws' package. In browser, native WebSocket.
        // This is written for browser compatibility (frontend will use this)
        this.ws = new WebSocket(this.config.serverUrl)
        
        this.ws.onopen = () => {
          this.isConnected = true
          this.reconnectAttempts = 0
          this.sendConfig()
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          this.emit('error', new Error('WebSocket error'))
          reject(error)
        }

        this.ws.onclose = () => {
          this.isConnected = false
          this.emit('disconnected')
          this.maybeReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Send initial configuration (voice + persona)
   */
  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    
    this.ws.send(JSON.stringify({
      type: 'config',
      voicePrompt: this.config.voicePrompt,
      textPrompt: this.config.textPrompt,
      seed: this.config.seed,
    }))
  }

  /**
   * Handle incoming messages from PersonaPlex
   */
  private handleMessage(data: string | ArrayBuffer): void {
    if (data instanceof ArrayBuffer) {
      // Binary data = audio chunk (Opus encoded)
      this.handleAudioData(data)
    } else {
      // JSON message
      try {
        const message = JSON.parse(data)
        this.handleJsonMessage(message)
      } catch {
        console.error('Failed to parse PersonaPlex message:', data)
      }
    }
  }

  /**
   * Handle binary audio data
   */
  private handleAudioData(buffer: ArrayBuffer): void {
    // Opus-encoded audio chunk
    // In a full implementation, you'd decode this with libopus
    const chunk: AudioChunk = {
      timestamp: Date.now(),
      samples: new Float32Array(buffer),
      sampleRate: 24000, // PersonaPlex default
    }
    this.emit('audio', chunk)
  }

  /**
   * Handle JSON control messages
   */
  private handleJsonMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'transcript':
        this.emit('transcript', message as unknown as TranscriptSegment)
        break
      case 'status':
        this.emit('status', message.status as string)
        break
      default:
        console.log('Unknown PersonaPlex message type:', message.type)
    }
  }

  /**
   * Send audio to PersonaPlex (player speaking)
   */
  sendAudio(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send audio: WebSocket not connected')
      return
    }
    
    // Convert to ArrayBuffer and send
    const buffer = audioData.buffer
    this.ws.send(buffer)
  }

  /**
   * Send text input (fallback for text-based input)
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send text: WebSocket not connected')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'text',
      content: text,
    }))
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.maxReconnectAttempts = 0 // Prevent reconnection
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }

  /**
   * Attempt reconnection
   */
  private maybeReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => this.connect(), delay)
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected
  }
}

/**
 * Manager for multiple character voice sessions
 */
export class PersonaPlexManager {
  private clients: Map<string, PersonaPlexClient> = new Map()
  private serverUrl: string

  constructor(serverUrl: string = 'wss://localhost:8998') {
    this.serverUrl = serverUrl
  }

  /**
   * Get or create a client for a character
   */
  getClient(characterId: string, config: Omit<PersonaPlexConfig, 'serverUrl'>): PersonaPlexClient {
    let client = this.clients.get(characterId)
    
    if (!client) {
      client = new PersonaPlexClient({
        ...config,
        serverUrl: this.serverUrl,
      })
      this.clients.set(characterId, client)
    }
    
    return client
  }

  /**
   * Connect to a specific character
   */
  async connectToCharacter(characterId: string, config: Omit<PersonaPlexConfig, 'serverUrl'>): Promise<PersonaPlexClient> {
    const client = this.getClient(characterId, config)
    if (!client.connected) {
      await client.connect()
    }
    return client
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    for (const client of this.clients.values()) {
      client.disconnect()
    }
    this.clients.clear()
  }

  /**
   * Get active character IDs
   */
  getActiveCharacters(): string[] {
    return Array.from(this.clients.entries())
      .filter(([_, client]) => client.connected)
      .map(([id]) => id)
  }
}
