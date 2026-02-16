import { useState, useEffect, useCallback, useRef } from 'react'

interface AssetStatus {
  portraits: Record<string, string> // assetId -> url
  rooms: Record<string, string>
  evidence: Record<string, string>
  ui: Record<string, string>
  completed: boolean
}

interface AssetLoaderResult {
  progress: number // 0-100
  isReady: boolean
  getAssetUrl: (assetId: string) => string | null
  portraits: Record<string, string>
  rooms: Record<string, string>
  evidence: Record<string, string>
  totalAssets: number
  readyAssets: number
  portraitsReady: number
  hasTitleBg: boolean
}

import { getApiBase } from '../api/client'

const API_BASE = getApiBase().replace(/\/api$/, '')

export function useAssetLoader(mysteryId: string | null): AssetLoaderResult {
  const [status, setStatus] = useState<AssetStatus>({
    portraits: {},
    rooms: {},
    evidence: {},
    ui: {},
    completed: false,
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    if (!mysteryId || mysteryId === 'generating') return
    try {
      const res = await fetch(`${API_BASE}/api/mystery/${mysteryId}/status`)
      if (!res.ok) return
      const data = await res.json()
      setStatus({
        portraits: data.assets?.portraits ?? {},
        rooms: data.assets?.rooms ?? {},
        evidence: data.assets?.evidence ?? {},
        ui: data.assets?.ui ?? {},
        completed: data.completed ?? false,
      })
      if (data.completed && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch {
      // silently retry next interval
    }
  }, [mysteryId])

  useEffect(() => {
    if (!mysteryId) return
    // Initial poll
    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [mysteryId, poll])

  const allAssets = { ...status.portraits, ...status.rooms, ...status.evidence, ...status.ui }
  const totalAssets = Object.keys(allAssets).length || 1
  const readyAssets = Object.values(allAssets).filter(Boolean).length
  const progress = totalAssets > 0 ? Math.round((readyAssets / totalAssets) * 100) : 0
  const portraitsReady = Object.values(status.portraits).filter(Boolean).length
  const hasTitleBg = Boolean(status.ui['title-bg'])

  const getAssetUrl = useCallback(
    (assetId: string): string | null => {
      return allAssets[assetId] || null
    },
    [status],
  )

  // Ready as soon as we have calm portraits for all characters
  // Don't wait for title bg, rooms, evidence, or mood variants — those load in background
  const isReady = portraitsReady >= 2

  return {
    progress,
    isReady,
    getAssetUrl,
    portraits: status.portraits,
    rooms: status.rooms,
    evidence: status.evidence,
    totalAssets,
    readyAssets,
    portraitsReady,
    hasTitleBg,
  }
}
