/**
 * Mystery Store - In-memory persistence for generated mysteries
 *
 * In production, this would use a database. For now, we store in memory.
 */

import { GeneratedMystery } from './mysterySchema'

interface MysteryStore {
  current: GeneratedMystery | null
  history: GeneratedMystery[]
}

const store: MysteryStore = {
  current: null,
  history: []
}

/**
 * Save a mystery as the current active mystery
 */
export async function saveMystery(mystery: GeneratedMystery): Promise<void> {
  // Archive current if exists
  if (store.current) {
    store.history.push(store.current)
    // Keep only last 10 mysteries in history
    if (store.history.length > 10) {
      store.history.shift()
    }
  }

  store.current = mystery
  console.log(`[STORE] Saved mystery: ${mystery.id}`)
}

/**
 * Get the current active mystery
 */
export async function getCurrentMystery(): Promise<GeneratedMystery | null> {
  return store.current
}

/**
 * Get a mystery by ID (checks current and history)
 */
export async function getMysteryById(id: string): Promise<GeneratedMystery | null> {
  if (store.current?.id === id) {
    return store.current
  }

  return store.history.find(m => m.id === id) || null
}

/**
 * Clear the current mystery
 */
export async function clearCurrentMystery(): Promise<void> {
  if (store.current) {
    store.history.push(store.current)
  }
  store.current = null
  console.log('[STORE] Current mystery cleared')
}

/**
 * Get mystery history
 */
export async function getMysteryHistory(): Promise<GeneratedMystery[]> {
  return [...store.history]
}

/**
 * Get character from current mystery by ID
 */
export async function getCharacterById(characterId: string): Promise<GeneratedMystery['suspects'][0] | null> {
  if (!store.current) return null

  return store.current.suspects.find(s => s.id === characterId) || null
}

/**
 * Get the killer info (for internal use only, not exposed to players)
 */
export async function getKillerInfo(): Promise<{
  killerId: string
  motive: GeneratedMystery['killer']['motive']
  method: GeneratedMystery['killer']['method']
} | null> {
  if (!store.current) return null

  return {
    killerId: store.current.killer.characterId,
    motive: store.current.killer.motive,
    method: store.current.killer.method
  }
}

/**
 * Check if a character is the killer
 */
export async function isKiller(characterId: string): Promise<boolean> {
  if (!store.current) return false
  return store.current.killer.characterId === characterId
}

/**
 * Get evidence that can be discovered
 */
export async function getDiscoverableEvidence(
  condition: 'always' | 'search' | 'interrogation' | 'all' = 'all'
): Promise<GeneratedMystery['evidence']> {
  if (!store.current) return []

  if (condition === 'all') {
    return store.current.evidence
  }

  return store.current.evidence.filter(e => e.discoveryCondition === condition)
}

/**
 * Get the solution (for debug/admin only)
 */
export async function getSolution(): Promise<GeneratedMystery['solution'] | null> {
  if (!store.current) return null
  return store.current.solution
}

/**
 * Export current mystery to JSON (for debugging/saving)
 */
export async function exportMystery(): Promise<string | null> {
  if (!store.current) return null
  return JSON.stringify(store.current, null, 2)
}

/**
 * Import a mystery from JSON
 */
export async function importMystery(json: string): Promise<GeneratedMystery> {
  const mystery = JSON.parse(json) as GeneratedMystery
  await saveMystery(mystery)
  return mystery
}
