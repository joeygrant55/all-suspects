import { create } from 'zustand'

export interface Character {
  id: string
  name: string
  role: string
  location: string
  portrait?: string
}

export interface Evidence {
  id: string
  type: 'testimony' | 'contradiction' | 'physical' | 'document'
  description: string
  source: string
  timestamp: number
}

export interface Contradiction {
  id: string
  characterId: string
  claim1: string
  claim2: string
  discoveredAt: number
}

export interface Message {
  id: string
  role: 'player' | 'character'
  characterId?: string
  content: string
  timestamp: number
}

export interface GameState {
  // World
  currentRoom: string
  rooms: string[]

  // Characters
  characters: Character[]
  currentConversation: string | null

  // Conversation
  messages: Message[]

  // Evidence
  collectedEvidence: Evidence[]
  discoveredEvidenceIds: string[] // Evidence IDs that have been examined
  contradictions: Contradiction[]

  // Progress
  accusationUnlocked: boolean
  gameComplete: boolean
  gameStarted: boolean

  // Actions
  setCurrentRoom: (room: string) => void
  startConversation: (characterId: string) => void
  endConversation: () => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  addEvidence: (evidence: Omit<Evidence, 'id' | 'timestamp'>) => void
  markEvidenceDiscovered: (evidenceId: string) => void
  addContradiction: (contradiction: Omit<Contradiction, 'id' | 'discoveredAt'>) => void
  startGame: () => void
  isEvidenceDiscovered: (evidenceId: string) => boolean
  isEvidenceCollected: (evidenceId: string) => boolean
}

const ROOMS = ['parlor', 'study', 'dining-room', 'garden', 'kitchen', 'hallway']

const INITIAL_CHARACTERS: Character[] = [
  { id: 'victoria', name: 'Victoria Ashford', role: 'Wife of the deceased', location: 'parlor' },
  { id: 'thomas', name: 'Thomas Ashford', role: 'Son of the deceased', location: 'study' },
  { id: 'eleanor', name: 'Eleanor Crane', role: 'Secretary', location: 'hallway' },
  { id: 'marcus', name: 'Dr. Marcus Webb', role: 'Family physician', location: 'dining-room' },
  { id: 'lillian', name: 'Lillian Moore', role: 'Old friend of the family', location: 'garden' },
  { id: 'james', name: 'James', role: 'The butler', location: 'kitchen' },
]

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentRoom: 'parlor',
  rooms: ROOMS,
  characters: INITIAL_CHARACTERS,
  currentConversation: null,
  messages: [],
  collectedEvidence: [],
  discoveredEvidenceIds: [],
  contradictions: [],
  accusationUnlocked: false,
  gameComplete: false,
  gameStarted: false,

  // Actions
  setCurrentRoom: (room) => set({ currentRoom: room }),

  startConversation: (characterId) => set({ currentConversation: characterId }),

  endConversation: () => set({ currentConversation: null }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),

  addEvidence: (evidence) =>
    set((state) => {
      // Don't add duplicate evidence
      if (state.collectedEvidence.some((e) => e.source === evidence.source)) {
        return state
      }
      const newEvidence = {
        ...evidence,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }
      const updatedEvidence = [...state.collectedEvidence, newEvidence]
      // Unlock accusation at 5 pieces of evidence
      const accusationUnlocked = updatedEvidence.length >= 5
      return { collectedEvidence: updatedEvidence, accusationUnlocked }
    }),

  markEvidenceDiscovered: (evidenceId) =>
    set((state) => {
      if (state.discoveredEvidenceIds.includes(evidenceId)) {
        return state
      }
      return { discoveredEvidenceIds: [...state.discoveredEvidenceIds, evidenceId] }
    }),

  addContradiction: (contradiction) =>
    set((state) => ({
      contradictions: [
        ...state.contradictions,
        {
          ...contradiction,
          id: crypto.randomUUID(),
          discoveredAt: Date.now(),
        },
      ],
    })),

  startGame: () => set({ gameStarted: true }),

  isEvidenceDiscovered: (evidenceId) => get().discoveredEvidenceIds.includes(evidenceId),

  isEvidenceCollected: (evidenceId) => get().collectedEvidence.some((e) => e.source === evidenceId),
}))
