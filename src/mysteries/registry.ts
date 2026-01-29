/**
 * Mystery Registry - Bundles all available mysteries
 * 
 * This module provides:
 * - List of available mysteries for the selection screen
 * - Loading function to get full mystery data by ID
 * - Integration with the API for generated mysteries
 */

import type { MysteryInfo, LoadedMystery } from '../game/mysteryState'
import type { EvidenceData } from '../types/evidence'

// Import Ashford Affair
import {
  WORLD_STATE as ASHFORD_WORLD,
  CHARACTERS as ASHFORD_CHARACTERS,
  CHARACTER_GREETINGS as ASHFORD_GREETINGS,
} from '../../mysteries/ashford-affair/characters'
import { EVIDENCE_DATABASE as ASHFORD_EVIDENCE } from '../data/evidence'
import { EVIDENCE_BY_ROOM as ASHFORD_EVIDENCE_BY_ROOM } from '../data/evidence'
import { EVIDENCE_DIALOGUE_UNLOCKS as ASHFORD_DIALOGUE_UNLOCKS } from '../data/evidence'

// Import Hollywood Premiere
import {
  WORLD_STATE as HOLLYWOOD_WORLD,
  CHARACTERS as HOLLYWOOD_CHARACTERS,
  CHARACTER_GREETINGS as HOLLYWOOD_GREETINGS,
} from '../../mysteries/hollywood-premiere/characters'

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
  {
    id: 'hollywood-premiere',
    title: 'Shadows Over Sunset',
    subtitle: 'March 15th, 1947 — The Palladium Theatre',
    era: '1940s',
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

    case 'hollywood-premiere':
      return {
        id: 'hollywood-premiere',
        title: 'Shadows Over Sunset',
        worldState: HOLLYWOOD_WORLD,
        characters: HOLLYWOOD_CHARACTERS,
        greetings: HOLLYWOOD_GREETINGS,
        // Hollywood Premiere doesn't have evidence database yet - create minimal structure
        evidence: createHollywoodEvidence(),
        evidenceByRoom: {
          lobby: ['victim-body', 'projection-schedule'],
          projectionRoom: ['film-strip', 'locked-door'],
          dressingRooms: ['gloria-letter', 'vivian-pills'],
          vipLounge: ['witness-statements'],
        },
        evidenceDialogueUnlocks: {},
        rooms: ['lobby', 'projectionRoom', 'dressingRooms', 'vipLounge', 'backAlley', 'rooftop'],
        killerId: HOLLYWOOD_CHARACTERS.find(c => c.isGuilty)?.id || 'gloria',
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
 * Create minimal evidence structure for Hollywood Premiere
 * TODO: Expand this with full evidence database like Ashford Affair
 */
function createHollywoodEvidence(): Record<string, EvidenceData> {
  return {
    'victim-body': {
      id: 'victim-body',
      name: 'Crime Scene',
      description: 'Victor Malone\'s body in the projection room',
      detailedDescription: 'Victor Malone was found strangled with a film strip in the projection room. The door was locked from the inside.',
      type: 'physical',
      relatedCharacter: 'gloria',
      hint: 'The killer knew the building well...',
      pointsTo: 'gloria',
    },
    'film-strip': {
      id: 'film-strip',
      name: 'Murder Weapon',
      description: 'A strip of film from an old silent picture',
      detailedDescription: 'The film strip used to strangle Victor is from "The Queen of Hearts" (1928) - one of Gloria Fontaine\'s most famous films.',
      type: 'physical',
      relatedCharacter: 'gloria',
      hint: 'This film meant something to someone...',
      pointsTo: 'gloria',
    },
    'gloria-letter': {
      id: 'gloria-letter',
      name: 'Gloria\'s Evidence',
      description: 'Documents in Gloria\'s dressing room',
      detailedDescription: 'Gloria kept evidence of Victor\'s predatory behavior for years - letters, photographs, testimony from other victims.',
      type: 'document',
      relatedCharacter: 'gloria',
      hint: 'Someone was planning revenge...',
      pointsTo: 'gloria',
    },
    'projection-schedule': {
      id: 'projection-schedule',
      name: 'Projection Schedule',
      description: 'The schedule for the night',
      detailedDescription: 'Shows intermission at 9:15 PM - the exact time of the murder.',
      type: 'document',
      hint: 'The killer knew the timing perfectly...',
    },
    'locked-door': {
      id: 'locked-door',
      name: 'Locked Projection Room',
      description: 'The door was locked from inside',
      detailedDescription: 'The projection room was locked from the inside, but there\'s a service hatch in the ceiling - someone who knew the building could have escaped that way.',
      type: 'physical',
      hint: 'How did the killer escape?',
      pointsTo: 'gloria',
    },
    'vivian-pills': {
      id: 'vivian-pills',
      name: 'Prescription Bottles',
      description: 'Barbiturates in Vivian\'s dressing room',
      detailedDescription: 'Vivian has been taking pills to cope with the pressure. Her supply comes from Rex.',
      type: 'physical',
      relatedCharacter: 'vivian',
      hint: 'Everyone has secrets to hide...',
    },
    'witness-statements': {
      id: 'witness-statements',
      name: 'Witness Statements',
      description: 'Accounts from guests in the VIP lounge',
      detailedDescription: 'Multiple people saw different suspects at different times. The alibis don\'t all line up.',
      type: 'document',
      hint: 'Someone is lying...',
    },
  }
}

/**
 * Get list of all available mysteries
 */
export function getAvailableMysteries(): MysteryInfo[] {
  // Start with hardcoded mysteries
  return [...HARDCODED_MYSTERIES]
  
  // In the future, we could fetch generated mysteries from the API
  // and append them here
}
