import { motion, AnimatePresence } from 'framer-motion'
import { useSubscriptionStore, SUBSCRIPTION_CONFIG } from '../../game/subscriptionState'

interface PaywallProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export function Paywall({ isOpen, onClose, onUpgrade }: PaywallProps) {
  const { totalMysteriesPlayed, isPremium } = useSubscriptionStore()

  if (isPremium) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-lg p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <div className="bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-sm font-medium">
                🔍 Detective, you've used your free mystery
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-center text-white mb-2">
              Upgrade to Premium
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Unlock unlimited mysteries and become a master detective
            </p>

            {/* Price */}
            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-white">
                {SUBSCRIPTION_CONFIG.PREMIUM_PRICE_DISPLAY}
              </span>
              <span className="text-slate-400 text-lg">
                /{SUBSCRIPTION_CONFIG.PREMIUM_PERIOD}
              </span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {[
                'Unlimited mysteries',
                'New cases added weekly',
                'All difficulty levels',
                'Exclusive themed mysteries',
                'Priority support',
              ].map((feature, i) => (
                <li key={i} className="flex items-center text-slate-300">
                  <span className="text-amber-500 mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] mb-4"
            >
              Become a Premium Detective
            </button>

            {/* Stats */}
            <p className="text-center text-slate-500 text-sm">
              You've solved {totalMysteriesPlayed} {totalMysteriesPlayed === 1 ? 'mystery' : 'mysteries'} so far
            </p>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-300 mt-4 text-sm"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Small badge to show remaining games
export function FreeTierBadge() {
  const { isPremium, getRemainingFreeGames } = useSubscriptionStore()
  
  if (isPremium) {
    return (
      <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-medium">
        ⭐ Premium
      </div>
    )
  }
  
  const remaining = getRemainingFreeGames()
  
  return (
    <div className="bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full text-xs">
      {remaining > 0 
        ? `${remaining} free ${remaining === 1 ? 'mystery' : 'mysteries'} today`
        : 'Daily limit reached'
      }
    </div>
  )
}
