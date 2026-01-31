import { create } from 'zustand'
import type { CharacterProfile, WorldState } from '../agents/types'
import type { EvidenceData } from '../types/evidence'
import type { MysteryBlueprint } from '../../shared/types/MysteryBlueprint'
import { loadMysteryById, getAvailableMysteries } from '../mysteries/registry'

export interface MysteryInfo {
  id: string
  title: string
  subtitle: string
  era: string
  difficulty: 'easy' | 'medium' | 'hard'
  isGenerated: boolean
  thumbnail?: string
}

export interface LoadedMystery {
  id: string
  title: string
  worldState: WorldState
  characters: CharacterProfile[]
  greetings: Record<string, string>
  evidence: Record<string, EvidenceData>
  evidenceByRoom: Record<string, string[]>
  evidenceDialogueUnlocks: Record<string, Array<{ characterId: string; prompt: string }>>
  rooms: string[]
  killerId: string
  // For dynamically generated mysteries
  isGenerated?: boolean
  blueprint?: MysteryBlueprint
  locations?: Array<{ id: string; name: string; description: string }>
}

export interface MysteryState {
  // Available mysteries
  availableMysteries: MysteryInfo[]
  selectedMysteryId: string | null
  activeMystery: LoadedMystery | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null

  // Actions
  loadAvailableMysteries: () => Promise<void>
  selectMystery: (id: string) => void
  loadMystery: (id: string) => Promise<void>
  generateNewMystery: (difficulty: 'easy' | 'medium' | 'hard') => Promise<void>
  clearMystery: () => void
}

const API_BASE = 'http://localhost:3001'

export const useMysteryStore = create<MysteryState>((set, get) => ({
  // Initial state
  availableMysteries: [],
  selectedMysteryId: null,
  activeMystery: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  // Load available mysteries (client-side registry first, then API)
  loadAvailableMysteries: async () => {
    set({ isLoading: true, error: null })
    try {
      // Use client-side registry as primary source
      const mysteries = getAvailableMysteries()
      set({
        availableMysteries: mysteries,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading mysteries:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  // Select a mystery (sets selected ID, doesn't load yet)
  selectMystery: (id: string) => {
    set({ selectedMysteryId: id })
  },

  // Load a specific mystery by ID (client-side registry first)
  loadMystery: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const mystery = await loadMysteryById(id)
      if (!mystery) {
        throw new Error('Mystery not found')
      }
      set({
        activeMystery: mystery,
        selectedMysteryId: id,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading mystery:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  // Generate a new mystery with AI
  generateNewMystery: async (difficulty: 'easy' | 'medium' | 'hard') => {
    set({ isGenerating: true, error: null })
    try {
      const response = await fetch(`${API_BASE}/api/mystery/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ difficulty }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate mystery')
      }

      const data = await response.json()

      if (data.success && data.mysteryId) {
        // After generation, load the full mystery data
        const mysteryId = data.mysteryId
        await get().loadMystery(mysteryId)
        set({ isGenerating: false })
      } else {
        throw new Error('Mystery generation failed')
      }
    } catch (error) {
      console.error('Error generating mystery:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isGenerating: false,
      })
    }
  },

  // Clear the current mystery
  clearMystery: () => {
    set({
      selectedMysteryId: null,
      activeMystery: null,
      error: null,
    })
  },
}))
