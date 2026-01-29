import { create } from 'zustand'
import type { LoadedMystery } from './mysteryState'

export interface PressureLevel {
  level: number
  confrontations: number
  evidencePresented: number
  contradictionsExposed: number
}

export interface Character {
  id: string
  name: string
  role: string
  location: string
  portrait?: string
  pressure?: PressureLevel
}

export interface Evidence {
  id: string
  type: 'testimony' | 'contradiction' | 'physical' | 'document'
  description: string
  source: string
  timestamp: number
}

export interface StatementRecord {
  id: string
  characterId: string
  characterName: string
  topic: string
  content: string
  timestamp: number
  playerQuestion: string
}

export interface Contradiction {
  id: string
  statement1: {
    characterId: string
    characterName: string
    content: string
    playerQuestion: string
  }
  statement2: {
    characterId: string
    characterName: string
    content: string
    playerQuestion: string
  }
  explanation: string
  severity: 'minor' | 'significant' | 'major'
  discoveredAt: number
}

export interface Message {
  id: string
  role: 'player' | 'character'
  characterId?: string
  content: string
  timestamp: number
}

export interface Psychology {
  pressureLevel: 1 | 2 | 3 | 4 | 5
  isLying: boolean
  nervousTicks: string[]
}

export type GameScreen = 'intro' | 'map' | 'room' | 'interrogation'

export interface GameState {
  // UI State
  currentScreen: GameScreen
  showIntro: boolean

  // World
  currentRoom: string
  rooms: string[]
  lastViewMode: 'suspects' | 'manor' | null

  // Characters
  characters: Character[]
  currentConversation: string | null

  // Conversation
  messages: Message[]

  // Evidence
  collectedEvidence: Evidence[]
  discoveredEvidenceIds: string[] // Evidence IDs that have been examined
  contradictions: Contradiction[]
  newEvidenceCount: number // Count of unviewed evidence
  hasSeenEvidenceBoard: boolean // Whether player has opened the board

  // Progress
  accusationUnlocked: boolean
  gameComplete: boolean
  gameStarted: boolean
  tutorialSeen: boolean
  accusationAttempts: number
  lastWrongAccusation: string | null // Character ID of last wrong guess

  // Psychology (for cinematic overlay)
  psychology: Psychology

  // Actions
  setCurrentScreen: (screen: GameScreen) => void
  completeIntro: () => void
  setCurrentRoom: (room: string) => void
  setLastViewMode: (mode: 'suspects' | 'manor') => void
  startConversation: (characterId: string) => void
  endConversation: () => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  addEvidence: (evidence: Omit<Evidence, 'id' | 'timestamp'>) => void
  markEvidenceDiscovered: (evidenceId: string) => void
  addContradiction: (contradiction: Contradiction) => void
  addContradictions: (contradictions: Contradiction[]) => void
  updateCharacterPressure: (characterId: string, pressure: PressureLevel) => void
  updatePsychology: (updates: Partial<Psychology>) => void
  resetPsychology: () => void
  resetGame: () => void
  startGame: () => void
  setTutorialSeen: () => void
  recordAccusationAttempt: (characterId: string, isCorrect: boolean) => void
  isEvidenceDiscovered: (evidenceId: string) => boolean
  isEvidenceCollected: (evidenceId: string) => boolean
  markEvidenceBoardViewed: () => void
  initializeFromMystery: (mystery: LoadedMystery) => void
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

const INITIAL_PSYCHOLOGY: Psychology = {
  pressureLevel: 1,
  isLying: false,
  nervousTicks: [],
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentScreen: 'intro',
  showIntro: true,
  currentRoom: 'parlor',
  rooms: ROOMS,
  lastViewMode: null,
  characters: INITIAL_CHARACTERS,
  currentConversation: null,
  messages: [],
  collectedEvidence: [],
  discoveredEvidenceIds: [],
  contradictions: [],
  newEvidenceCount: 0,
  hasSeenEvidenceBoard: false,
  accusationUnlocked: false,
  gameComplete: false,
  gameStarted: false,
  tutorialSeen: false,
  accusationAttempts: 0,
  lastWrongAccusation: null,
  psychology: INITIAL_PSYCHOLOGY,

  // Actions
  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  completeIntro: () => set({ showIntro: false, currentScreen: 'map' }),

  setCurrentRoom: (room) => set({ currentRoom: room, currentScreen: 'room', lastViewMode: 'manor' }),

  setLastViewMode: (mode) => set({ lastViewMode: mode }),

  startConversation: (characterId) => set({ currentConversation: characterId, currentScreen: 'interrogation' }),

  endConversation: () => set({ currentConversation: null, currentScreen: 'map' }),

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
      // Unlock accusation at 5 pieces of evidence (counting both room + interrogation evidence)
      const totalEvidence = updatedEvidence.length + state.discoveredEvidenceIds.length
      const accusationUnlocked = totalEvidence >= 5
      return { 
        collectedEvidence: updatedEvidence, 
        accusationUnlocked,
        newEvidenceCount: state.newEvidenceCount + 1
      }
    }),

  markEvidenceDiscovered: (evidenceId) =>
    set((state) => {
      if (state.discoveredEvidenceIds.includes(evidenceId)) {
        return state
      }
      const updatedDiscovered = [...state.discoveredEvidenceIds, evidenceId]
      // Unlock accusation at 5 pieces of evidence (counting both room + interrogation evidence)
      const totalEvidence = updatedDiscovered.length + state.collectedEvidence.length
      const accusationUnlocked = totalEvidence >= 5
      return { 
        discoveredEvidenceIds: updatedDiscovered,
        accusationUnlocked
      }
    }),

  addContradiction: (contradiction) =>
    set((state) => {
      // Don't add duplicate contradictions
      if (state.contradictions.some((c) => c.id === contradiction.id)) {
        return state
      }
      return {
        contradictions: [...state.contradictions, contradiction],
      }
    }),

  addContradictions: (contradictions) =>
    set((state) => {
      // Filter out duplicates
      const newContradictions = contradictions.filter(
        (c) => !state.contradictions.some((existing) => existing.id === c.id)
      )
      if (newContradictions.length === 0) {
        return state
      }
      return {
        contradictions: [...state.contradictions, ...newContradictions],
      }
    }),

  updateCharacterPressure: (characterId, pressure) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId ? { ...c, pressure } : c
      ),
    })),

  updatePsychology: (updates) =>
    set((state) => ({
      psychology: {
        ...state.psychology,
        ...updates,
        // Clamp pressure level between 1 and 5
        pressureLevel: updates.pressureLevel !== undefined
          ? Math.max(1, Math.min(5, updates.pressureLevel)) as 1 | 2 | 3 | 4 | 5
          : state.psychology.pressureLevel,
      },
    })),

  resetPsychology: () =>
    set({ psychology: INITIAL_PSYCHOLOGY }),

  resetGame: () =>
    set({
      currentScreen: 'intro',
      showIntro: true,
      currentRoom: 'parlor',
      lastViewMode: null,
      characters: INITIAL_CHARACTERS,
      currentConversation: null,
      messages: [],
      collectedEvidence: [],
      discoveredEvidenceIds: [],
      contradictions: [],
      newEvidenceCount: 0,
      hasSeenEvidenceBoard: false,
      accusationUnlocked: false,
      gameComplete: false,
      gameStarted: false,
      accusationAttempts: 0,
      lastWrongAccusation: null,
      psychology: INITIAL_PSYCHOLOGY,
    }),

  startGame: () => set({ gameStarted: true }),

  setTutorialSeen: () => set({ tutorialSeen: true }),

  recordAccusationAttempt: (characterId, isCorrect) =>
    set((state) => ({
      accusationAttempts: state.accusationAttempts + 1,
      lastWrongAccusation: isCorrect ? null : characterId,
      gameComplete: isCorrect,
    })),

  isEvidenceDiscovered: (evidenceId) => get().discoveredEvidenceIds.includes(evidenceId),

  isEvidenceCollected: (evidenceId) => get().collectedEvidence.some((e) => e.source === evidenceId),

  markEvidenceBoardViewed: () =>
    set({ newEvidenceCount: 0, hasSeenEvidenceBoard: true }),

  initializeFromMystery: (mystery) =>
    set({
      // Convert mystery characters to game characters
      characters: mystery.characters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        location: mystery.rooms[0] || 'parlor', // Default to first room
      })),
      rooms: mystery.rooms,
      currentRoom: mystery.rooms[0] || 'parlor',
      // Reset other state for a new game
      currentConversation: null,
      messages: [],
      collectedEvidence: [],
      discoveredEvidenceIds: [],
      contradictions: [],
      newEvidenceCount: 0,
      hasSeenEvidenceBoard: false,
      accusationUnlocked: false,
      gameComplete: false,
      accusationAttempts: 0,
      lastWrongAccusation: null,
      psychology: INITIAL_PSYCHOLOGY,
    }),
}))
