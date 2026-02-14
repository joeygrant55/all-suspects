import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const FREE_DAILY_LIMIT = 1 // One free mystery per day
const PREMIUM_PRICE = 999 // $9.99 in cents

export interface SubscriptionState {
  // User identity (anonymous)
  visitorId: string
  
  // Subscription status
  isPremium: boolean
  premiumExpiresAt: number | null
  stripeCustomerId: string | null
  
  // Usage tracking
  mysteriesPlayedToday: number
  lastPlayDate: string | null
  totalMysteriesPlayed: number
  
  // Actions
  canPlayMystery: () => boolean
  recordMysteryPlay: () => void
  setPremium: (customerId: string, expiresAt: number) => void
  clearPremium: () => void
  getRemainingFreeGames: () => number
}

// Generate a random visitor ID
const generateVisitorId = () => {
  return 'visitor_' + Math.random().toString(36).substring(2, 15)
}

// Get today's date as YYYY-MM-DD
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0]
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      visitorId: generateVisitorId(),
      isPremium: false,
      premiumExpiresAt: null,
      stripeCustomerId: null,
      mysteriesPlayedToday: 0,
      lastPlayDate: null,
      totalMysteriesPlayed: 0,
      
      canPlayMystery: () => {
        // PAYWALL DISABLED — optimizing for retention & engagement first
        // Re-enable when ready to monetize (restore original logic below)
        return true

        /* ORIGINAL PAYWALL LOGIC — preserved for future use
        const state = get()
        
        // Premium users always can play
        if (state.isPremium) {
          // Check if premium has expired
          if (state.premiumExpiresAt && Date.now() > state.premiumExpiresAt) {
            // Premium expired, clear it
            set({ isPremium: false, premiumExpiresAt: null })
            return state.mysteriesPlayedToday < FREE_DAILY_LIMIT
          }
          return true
        }
        
        // Free users: check daily limit
        const today = getTodayDate()
        
        // Reset counter if it's a new day
        if (state.lastPlayDate !== today) {
          set({ mysteriesPlayedToday: 0, lastPlayDate: today })
          return true
        }
        
        return state.mysteriesPlayedToday < FREE_DAILY_LIMIT
      END ORIGINAL PAYWALL LOGIC */
      },
      
      recordMysteryPlay: () => {
        const today = getTodayDate()
        const state = get()
        
        // Reset if new day
        if (state.lastPlayDate !== today) {
          set({
            mysteriesPlayedToday: 1,
            lastPlayDate: today,
            totalMysteriesPlayed: state.totalMysteriesPlayed + 1
          })
        } else {
          set({
            mysteriesPlayedToday: state.mysteriesPlayedToday + 1,
            totalMysteriesPlayed: state.totalMysteriesPlayed + 1
          })
        }
      },
      
      setPremium: (customerId: string, expiresAt: number) => {
        set({
          isPremium: true,
          stripeCustomerId: customerId,
          premiumExpiresAt: expiresAt
        })
      },
      
      clearPremium: () => {
        set({
          isPremium: false,
          stripeCustomerId: null,
          premiumExpiresAt: null
        })
      },
      
      getRemainingFreeGames: () => {
        const state = get()
        const today = getTodayDate()
        
        if (state.isPremium) return Infinity
        
        if (state.lastPlayDate !== today) {
          return FREE_DAILY_LIMIT
        }
        
        return Math.max(0, FREE_DAILY_LIMIT - state.mysteriesPlayedToday)
      }
    }),
    {
      name: 'all-suspects-subscription',
    }
  )
)

// Export constants for UI
export const SUBSCRIPTION_CONFIG = {
  FREE_DAILY_LIMIT,
  PREMIUM_PRICE,
  PREMIUM_PRICE_DISPLAY: '$9.99',
  PREMIUM_PERIOD: 'month',
}
