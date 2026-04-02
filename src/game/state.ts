import { create } from 'zustand'
import {
  DEFAULT_SAINT_INTERACTION_MODE,
  type SaintInteractionMode,
} from '../types/saintChat'

interface SaintsState {
  selectedSaintId: string | null
  sessionId: string
  interactionMode: SaintInteractionMode
  selectSaint: (id: string) => void
  setInteractionMode: (mode: SaintInteractionMode) => void
}

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useSaintsStore = create<SaintsState>((set) => ({
  selectedSaintId: null,
  sessionId: generateSessionId(),
  interactionMode: DEFAULT_SAINT_INTERACTION_MODE,
  selectSaint: (id: string) => set({ selectedSaintId: id }),
  setInteractionMode: (interactionMode) => set({ interactionMode }),
}))
