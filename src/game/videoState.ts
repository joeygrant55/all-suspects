/**
 * Video State Management
 *
 * Manages video generation queue, caching, and pre-generation.
 * Uses IndexedDB for session persistence.
 */

import { create } from 'zustand'

export interface VideoEntry {
  id: string
  characterId: string
  question: string
  responseText: string
  voiceAudioBase64?: string
  videoGenerationId?: string
  videoUrl?: string
  status: 'pending' | 'generating-voice' | 'generating-video' | 'ready' | 'error'
  error?: string
  createdAt: number
}

export interface VideoQueueItem {
  characterId: string
  question: string
  priority: number
}

interface VideoState {
  // Cache of generated videos
  videoCache: Map<string, VideoEntry>

  // Queue of videos to generate
  generationQueue: VideoQueueItem[]

  // Currently generating
  currentGeneration: string | null

  // Actions
  addToCache: (entry: VideoEntry) => void
  getFromCache: (id: string) => VideoEntry | undefined
  getCacheKey: (characterId: string, question: string) => string
  hasCached: (characterId: string, question: string) => boolean

  queueGeneration: (item: VideoQueueItem) => void
  processNextInQueue: () => VideoQueueItem | null
  clearQueue: () => void

  setCurrentGeneration: (id: string | null) => void

  // Persistence
  persistToStorage: () => Promise<void>
  loadFromStorage: () => Promise<void>
  clearAll: () => void
}

const DB_NAME = 'all-suspects-video-cache'
const STORE_NAME = 'videos'
const DB_VERSION = 1

// IndexedDB helpers
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function saveToIndexedDB(entries: VideoEntry[]): Promise<void> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Clear old entries first
    store.clear()

    // Add new entries
    for (const entry of entries) {
      store.put(entry)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err)
  }
}

async function loadFromIndexedDB(): Promise<VideoEntry[]> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close()
        resolve(request.result || [])
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (err) {
    console.warn('Failed to load from IndexedDB:', err)
    return []
  }
}

export const useVideoState = create<VideoState>((set, get) => ({
  videoCache: new Map(),
  generationQueue: [],
  currentGeneration: null,

  getCacheKey: (characterId: string, question: string) => {
    // Normalize question for cache key
    const normalizedQuestion = question.toLowerCase().trim().replace(/[^\w\s]/g, '')
    return `${characterId}:${normalizedQuestion}`
  },

  addToCache: (entry: VideoEntry) => {
    set((state) => {
      const newCache = new Map(state.videoCache)
      newCache.set(entry.id, entry)

      // Limit cache size to 50 entries
      if (newCache.size > 50) {
        const oldestKey = newCache.keys().next().value
        if (oldestKey) newCache.delete(oldestKey)
      }

      return { videoCache: newCache }
    })

    // Persist to storage
    get().persistToStorage()
  },

  getFromCache: (id: string) => {
    return get().videoCache.get(id)
  },

  hasCached: (characterId: string, question: string) => {
    const key = get().getCacheKey(characterId, question)
    const entry = get().videoCache.get(key)
    return entry !== undefined && entry.status === 'ready'
  },

  queueGeneration: (item: VideoQueueItem) => {
    set((state) => {
      // Check if already in queue
      const exists = state.generationQueue.some(
        (q) => q.characterId === item.characterId && q.question === item.question
      )
      if (exists) return state

      // Insert by priority (higher priority first)
      const newQueue = [...state.generationQueue, item].sort((a, b) => b.priority - a.priority)
      return { generationQueue: newQueue }
    })
  },

  processNextInQueue: () => {
    const state = get()
    if (state.currentGeneration || state.generationQueue.length === 0) {
      return null
    }

    const [next, ...rest] = state.generationQueue
    set({ generationQueue: rest, currentGeneration: next.characterId + ':' + next.question })
    return next
  },

  clearQueue: () => {
    set({ generationQueue: [], currentGeneration: null })
  },

  setCurrentGeneration: (id: string | null) => {
    set({ currentGeneration: id })
  },

  persistToStorage: async () => {
    const entries = Array.from(get().videoCache.values())
      // Only persist ready entries with video URLs
      .filter((e) => e.status === 'ready' && e.videoUrl)
    await saveToIndexedDB(entries)
  },

  loadFromStorage: async () => {
    const entries = await loadFromIndexedDB()
    const cache = new Map<string, VideoEntry>()

    // Filter out stale entries (older than 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const entry of entries) {
      if (entry.createdAt > cutoff) {
        cache.set(entry.id, entry)
      }
    }

    set({ videoCache: cache })
  },

  clearAll: () => {
    set({
      videoCache: new Map(),
      generationQueue: [],
      currentGeneration: null,
    })
    indexedDB.deleteDatabase(DB_NAME)
  },
}))

// Pre-generation priorities
export const GENERATION_PRIORITY = {
  IMMEDIATE: 100,      // Current response
  HIGH: 75,            // Likely follow-up questions
  MEDIUM: 50,          // Character intro videos
  LOW: 25,             // Background pre-generation
  BACKGROUND: 10,      // Speculative pre-generation
}
