/**
 * Video Cache System
 *
 * Caches generated videos to avoid regenerating the same testimony.
 * Key is based on a hash of the prompt + character + testimony content.
 */

import * as crypto from 'crypto'

export interface CachedVideo {
  id: string
  characterId: string
  testimonyId: string
  promptHash: string
  videoUrl: string
  videoData?: string // Base64 data if stored locally
  prompt: string
  createdAt: number
  accessedAt: number
  accessCount: number
  type: 'testimony' | 'introduction' | 'contradiction'
}

// In-memory cache (in production, this would be persisted to disk/database)
const videoCache: Map<string, CachedVideo> = new Map()

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 100, // Maximum number of cached videos
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  cleanupInterval: 1000 * 60 * 15, // 15 minutes
}

/**
 * Generate a hash key for a testimony/prompt combination
 */
export function generateCacheKey(
  characterId: string,
  prompt: string,
  type: 'testimony' | 'introduction' | 'contradiction'
): string {
  const content = `${characterId}:${type}:${prompt}`
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16)
}

/**
 * Get a cached video if it exists
 */
export function getCachedVideo(cacheKey: string): CachedVideo | null {
  const cached = videoCache.get(cacheKey)

  if (!cached) {
    return null
  }

  // Check if cache entry has expired
  if (Date.now() - cached.createdAt > CACHE_CONFIG.maxAge) {
    videoCache.delete(cacheKey)
    return null
  }

  // Update access tracking
  cached.accessedAt = Date.now()
  cached.accessCount++

  return cached
}

/**
 * Add a video to the cache
 */
export function cacheVideo(
  cacheKey: string,
  video: Omit<CachedVideo, 'id' | 'promptHash' | 'accessedAt' | 'accessCount'>
): CachedVideo {
  // Cleanup if cache is too large
  if (videoCache.size >= CACHE_CONFIG.maxSize) {
    evictOldestEntries(10)
  }

  const cached: CachedVideo = {
    ...video,
    id: `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    promptHash: cacheKey,
    accessedAt: Date.now(),
    accessCount: 1,
  }

  videoCache.set(cacheKey, cached)

  return cached
}

/**
 * Remove oldest/least accessed entries from cache
 */
function evictOldestEntries(count: number): void {
  // Sort by access time and count
  const entries = Array.from(videoCache.entries()).sort((a, b) => {
    // Prioritize keeping frequently accessed items
    const scoreA = a[1].accessCount * 0.3 + (Date.now() - a[1].accessedAt) * -0.001
    const scoreB = b[1].accessCount * 0.3 + (Date.now() - b[1].accessedAt) * -0.001
    return scoreA - scoreB
  })

  // Remove the lowest scoring entries
  for (let i = 0; i < count && i < entries.length; i++) {
    videoCache.delete(entries[i][0])
  }
}

/**
 * Clear expired entries from cache
 */
export function cleanupExpiredEntries(): number {
  let removed = 0
  const now = Date.now()

  for (const [key, entry] of videoCache) {
    if (now - entry.createdAt > CACHE_CONFIG.maxAge) {
      videoCache.delete(key)
      removed++
    }
  }

  return removed
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  maxSize: number
  hitRate: number
  oldestEntry: number | null
  newestEntry: number | null
} {
  const entries = Array.from(videoCache.values())
  const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0)

  return {
    size: videoCache.size,
    maxSize: CACHE_CONFIG.maxSize,
    hitRate: totalAccess > 0 ? (totalAccess - entries.length) / totalAccess : 0,
    oldestEntry: entries.length > 0 ? Math.min(...entries.map((e) => e.createdAt)) : null,
    newestEntry: entries.length > 0 ? Math.max(...entries.map((e) => e.createdAt)) : null,
  }
}

/**
 * Get all cached videos for a character
 */
export function getCachedVideosForCharacter(characterId: string): CachedVideo[] {
  return Array.from(videoCache.values()).filter((v) => v.characterId === characterId)
}

/**
 * Get all cached videos of a specific type
 */
export function getCachedVideosByType(
  type: 'testimony' | 'introduction' | 'contradiction'
): CachedVideo[] {
  return Array.from(videoCache.values()).filter((v) => v.type === type)
}

/**
 * Clear all cached videos
 */
export function clearVideoCache(): void {
  videoCache.clear()
}

/**
 * Clear cached videos for a specific character
 */
export function clearCharacterVideoCache(characterId: string): number {
  let removed = 0

  for (const [key, entry] of videoCache) {
    if (entry.characterId === characterId) {
      videoCache.delete(key)
      removed++
    }
  }

  return removed
}

/**
 * Export cache for persistence
 */
export function exportCache(): CachedVideo[] {
  return Array.from(videoCache.values())
}

/**
 * Import cache from persistence
 */
export function importCache(entries: CachedVideo[]): number {
  let imported = 0

  for (const entry of entries) {
    // Skip expired entries
    if (Date.now() - entry.createdAt > CACHE_CONFIG.maxAge) {
      continue
    }

    videoCache.set(entry.promptHash, entry)
    imported++
  }

  return imported
}

// Start cleanup interval
let cleanupTimer: NodeJS.Timeout | null = null

export function startCacheCleanup(): void {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const removed = cleanupExpiredEntries()
    if (removed > 0) {
      console.log(`Video cache cleanup: removed ${removed} expired entries`)
    }
  }, CACHE_CONFIG.cleanupInterval)
}

export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}
