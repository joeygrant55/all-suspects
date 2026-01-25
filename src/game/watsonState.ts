/**
 * Watson State Management
 * Manages whisper queue, desk state, and investigation UI
 */

import { create } from 'zustand'
import type { DeskTab } from '../components/Watson/WatsonDesk'

export interface WatsonState {
  // Whisper state
  whisperQueue: string[]
  currentWhisper: string | null
  isWhisperActive: boolean

  // Desk state
  isDeskOpen: boolean
  activeTab: DeskTab

  // Actions - Whispers
  showWhisper: (hint: string) => void
  dismissWhisper: () => void
  clearWhisperQueue: () => void

  // Actions - Desk
  openDesk: () => void
  closeDesk: () => void
  toggleDesk: () => void
  setActiveTab: (tab: DeskTab) => void

  // Combined action - expand from whisper to desk
  expandToDesk: () => void
}

export const useWatsonStore = create<WatsonState>((set, get) => ({
  // Initial whisper state
  whisperQueue: [],
  currentWhisper: null,
  isWhisperActive: false,

  // Initial desk state
  isDeskOpen: false,
  activeTab: 'contradictions',

  // Whisper actions
  showWhisper: (hint: string) => {
    const state = get()

    // If a whisper is currently active, queue this one
    if (state.isWhisperActive && state.currentWhisper) {
      set({
        whisperQueue: [...state.whisperQueue, hint],
      })
    } else {
      // Show immediately
      set({
        currentWhisper: hint,
        isWhisperActive: true,
      })
    }
  },

  dismissWhisper: () => {
    const state = get()
    const queue = [...state.whisperQueue]

    // If there are queued whispers, show the next one
    if (queue.length > 0) {
      const nextWhisper = queue.shift()
      set({
        currentWhisper: nextWhisper || null,
        whisperQueue: queue,
        isWhisperActive: !!nextWhisper,
      })
    } else {
      // Clear the whisper
      set({
        currentWhisper: null,
        isWhisperActive: false,
      })
    }
  },

  clearWhisperQueue: () => {
    set({
      whisperQueue: [],
      currentWhisper: null,
      isWhisperActive: false,
    })
  },

  // Desk actions
  openDesk: () => {
    set({
      isDeskOpen: true,
      // Clear whisper when opening desk
      currentWhisper: null,
      isWhisperActive: false,
    })
  },

  closeDesk: () => {
    set({ isDeskOpen: false })
  },

  toggleDesk: () => {
    const state = get()
    if (state.isDeskOpen) {
      set({ isDeskOpen: false })
    } else {
      set({
        isDeskOpen: true,
        // Clear whisper when opening desk
        currentWhisper: null,
        isWhisperActive: false,
      })
    }
  },

  setActiveTab: (tab: DeskTab) => {
    set({ activeTab: tab })
  },

  // Combined action
  expandToDesk: () => {
    set({
      isDeskOpen: true,
      currentWhisper: null,
      isWhisperActive: false,
    })
  },
}))

/**
 * Hook to handle keyboard shortcuts for Watson
 * Call this from a top-level component
 */
export function useWatsonKeyboardShortcuts() {
  const { isDeskOpen, toggleDesk } = useWatsonStore()

  // This effect is handled in the individual components
  // WatsonWhisper handles 'W' when whisper is active
  // WatsonDesk handles Escape and 1/2/3

  return {
    isDeskOpen,
    toggleDesk,
  }
}
