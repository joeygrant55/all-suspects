import { create } from 'zustand'

interface SaintsState {
  selectedSaintId: string | null
  sessionId: string
  selectSaint: (id: string) => void
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
  selectSaint: (id: string) => set({ selectedSaintId: id }),
}))
