import { create } from 'zustand'

export interface PressureLevel {
  level: number
  confrontations: number
  evidencePresented: number
  contradictionsExposed: number
}

export interface Saint {
  id: string
  name: string
  role: string
  pressure?: PressureLevel
}

export type Character = Saint

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

export type GameMode = 'landing' | 'investigation'

export interface GameState {
  saints: Saint[]
  currentSaintId: string | null
  messages: Message[]
  mode: GameMode
  setMode: (mode: GameMode) => void
  selectSaint: (saintId: string) => void
  clearCurrentSaint: () => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  updateSaintPressure: (saintId: string, pressure: PressureLevel) => void
  resetInvestigation: () => void
}

const INITIAL_SAINTS: Saint[] = [
  { id: 'victoria', name: 'Victoria Ashford', role: 'Family Matriarch' },
  { id: 'thomas', name: 'Thomas Ashford', role: 'Prodigal Heir' },
  { id: 'eleanor', name: 'Eleanor Crane', role: 'Private Secretary' },
  { id: 'marcus', name: 'Dr. Marcus Webb', role: 'House Physician' },
  { id: 'lillian', name: 'Lillian Moore', role: 'Society Guest' },
  { id: 'james', name: 'James Whitmore', role: 'Butler' },
]

const createInitialState = () => ({
  saints: INITIAL_SAINTS,
  currentSaintId: null,
  messages: [] as Message[],
  mode: 'landing' as GameMode,
})

export const useGameStore = create<GameState>((set) => ({
  ...createInitialState(),

  setMode: (mode) => set({ mode }),

  selectSaint: (saintId) =>
    set({
      currentSaintId: saintId,
      mode: 'investigation',
    }),

  clearCurrentSaint: () => set({ currentSaintId: null }),

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

  updateSaintPressure: (saintId, pressure) =>
    set((state) => ({
      saints: state.saints.map((saint) =>
        saint.id === saintId ? { ...saint, pressure } : saint
      ),
    })),

  resetInvestigation: () => set(createInitialState()),
}))
