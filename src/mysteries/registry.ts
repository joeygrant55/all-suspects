/**
 * Mystery Registry - Bundles all available mysteries
 * 
 * This module provides:
 * - List of available mysteries for the selection screen
 * - Loading function to get full mystery data by ID
 * - Integration with the API for generated mysteries
 */

import type { MysteryInfo, LoadedMystery } from '../game/mysteryState'
// Evidence types removed — Hollywood Premiere stripped out

// Import Ashford Affair
import {
  WORLD_STATE as ASHFORD_WORLD,
  CHARACTERS as ASHFORD_CHARACTERS,
  CHARACTER_GREETINGS as ASHFORD_GREETINGS,
} from '../../mysteries/ashford-affair/characters'
import { EVIDENCE_DATABASE as ASHFORD_EVIDENCE } from '../data/evidence'
import { EVIDENCE_BY_ROOM as ASHFORD_EVIDENCE_BY_ROOM } from '../data/evidence'
import { EVIDENCE_DIALOGUE_UNLOCKS as ASHFORD_DIALOGUE_UNLOCKS } from '../data/evidence'

// Hardcoded mysteries metadata
export const HARDCODED_MYSTERIES: MysteryInfo[] = [
  {
    id: 'ashford-affair',
    title: 'The Ashford Affair',
    subtitle: 'New Year\'s Eve, 1929 — Ashford Manor',
    era: '1920s',
    difficulty: 'medium',
    isGenerated: false,
  },
]

/**
 * Load a mystery by ID
 * Returns the full mystery data needed to initialize the game
 */
export async function loadMysteryById(id: string): Promise<LoadedMystery | null> {
  // Check hardcoded mysteries first
  switch (id) {
    case 'ashford-affair':
      return {
        id: 'ashford-affair',
        title: 'The Ashford Affair',
        worldState: ASHFORD_WORLD,
        characters: ASHFORD_CHARACTERS,
        greetings: ASHFORD_GREETINGS,
        evidence: ASHFORD_EVIDENCE,
        evidenceByRoom: ASHFORD_EVIDENCE_BY_ROOM,
        evidenceDialogueUnlocks: ASHFORD_DIALOGUE_UNLOCKS,
        rooms: ['parlor', 'study', 'dining-room', 'garden', 'kitchen', 'hallway'],
        killerId: ASHFORD_CHARACTERS.find(c => c.isGuilty)?.id || 'thomas',
      }

    default:
      // Try loading generated mystery from API
      try {
        const response = await fetch(`http://localhost:3001/api/mystery/${id}/blueprint`)
        if (response.ok) {
          const blueprint = await response.json()
          const { adaptBlueprint } = await import('./blueprintAdapter')
          return adaptBlueprint(blueprint)
        }
      } catch (error) {
        console.error('Error loading mystery from API:', error)
      }
      return null
  }
}

/**
 * Get list of all available mysteries (hardcoded only — sync)
 */
export function getAvailableMysteries(): MysteryInfo[] {
  return [...HARDCODED_MYSTERIES]
}

/**
 * Fetch generated mysteries from the API and merge with hardcoded
 */
export async function fetchAllMysteries(): Promise<MysteryInfo[]> {
  const hardcoded = [...HARDCODED_MYSTERIES]
  
  try {
    const hostname = window.location.hostname
    const res = await fetch(`http://${hostname}:3001/api/mystery/list`)
    if (res.ok) {
      const generated: Array<{ id: string; title: string; subtitle?: string; era?: string; difficulty?: string }> = await res.json()
      const generatedInfos: MysteryInfo[] = generated
        .filter(g => !hardcoded.some(h => h.id === g.id))
        .map(g => ({
          id: g.id,
          title: g.title,
          subtitle: g.subtitle || g.era || '',
          era: g.era || 'Custom',
          difficulty: (g.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
          isGenerated: true,
        }))
      return [...hardcoded, ...generatedInfos]
    }
  } catch {
    // API not available — return hardcoded only
  }
  
  return hardcoded
}
