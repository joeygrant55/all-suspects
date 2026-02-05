import { useEffect, useState } from 'react'
import { useSubscriptionStore } from '../../game/subscriptionState'
import { getSubscriptionStatus } from '../../api/client'

interface UpgradeSuccessProps {
  sessionId: string
  onContinue: () => void
}

export function UpgradeSuccess({ sessionId, onContinue }: UpgradeSuccessProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setPremium } = useSubscriptionStore()

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        const status = await getSubscriptionStatus(sessionId)
        
        if (status.isPremium && status.customerId && status.expiresAt) {
          setPremium(status.customerId, status.expiresAt)
          setLoading(false)
        } else {
          setError('Unable to verify subscription. Please contact support.')
          setLoading(false)
        }
      } catch (err) {
        console.error('Subscription verification failed:', err)
        setError('Unable to verify subscription. Please try again.')
        setLoading(false)
      }
    }

    verifySubscription()
  }, [sessionId, setPremium])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-noir-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Verifying your subscription...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-noir-black flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Verification Issue</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg mr-4"
          >
            Try Again
          </button>
          <button
            onClick={onContinue}
            className="text-slate-400 hover:text-white"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-noir-black flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-lg p-8 max-w-md text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🎉</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-2">
          Welcome, Detective!
        </h2>
        <p className="text-slate-400 mb-8">
          You now have unlimited access to all mysteries
        </p>

        {/* Features unlocked */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-8 text-left">
          <h3 className="text-amber-400 font-semibold mb-3">What's unlocked:</h3>
          <ul className="space-y-2">
            {[
              'Unlimited mysteries',
              'New cases added weekly',
              'All difficulty levels',
              'Exclusive themed mysteries',
            ].map((feature, i) => (
              <li key={i} className="flex items-center text-slate-300">
                <span className="text-amber-500 mr-2">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold py-4 px-6 rounded-lg transition-all"
        >
          Start Investigating
        </button>
      </div>
    </div>
  )
}
