import { useEffect, useState } from 'react'
import { EVIDENCE_DATABASE } from '../../data/evidence'

interface Notification {
  id: string
  evidenceId: string
  evidenceName: string
  hint: string
}

interface EvidenceNotificationProps {
  notification: Notification | null
  onDismiss: () => void
}

export function EvidenceNotification({ notification, onDismiss }: EvidenceNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsExiting(false)

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => {
          setIsVisible(false)
          onDismiss()
        }, 300)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [notification, onDismiss])

  if (!notification || !isVisible) return null

  const evidence = EVIDENCE_DATABASE[notification.evidenceId]
  const relatedCharacter = evidence?.relatedCharacter

  // Get character name for hint
  const characterNames: Record<string, string> = {
    thomas: 'Thomas',
    victoria: 'Victoria',
    eleanor: 'Eleanor',
    marcus: 'Dr. Webb',
    lillian: 'Lillian',
    james: 'James',
  }

  return (
    <div
      className={`fixed top-20 right-6 z-40 transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div
        className="w-80 bg-noir-charcoal border border-noir-gold/50 rounded-sm overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(201, 162, 39, 0.2)',
        }}
      >
        {/* Header */}
        <div className="bg-noir-gold/20 px-4 py-2 border-b border-noir-gold/30 flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span
            className="text-noir-gold text-sm tracking-wider uppercase"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Evidence Collected
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <h4
            className="text-noir-cream font-medium mb-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {notification.evidenceName}
          </h4>

          {notification.hint && (
            <p className="text-noir-smoke text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>
              {notification.hint}
            </p>
          )}

          {relatedCharacter && (
            <p className="text-noir-gold/80 text-xs mt-2" style={{ fontFamily: 'Georgia, serif' }}>
              May be relevant when questioning {characterNames[relatedCharacter] || relatedCharacter}...
            </p>
          )}
        </div>

        {/* Progress indicator */}
        <div className="h-1 bg-noir-slate/30">
          <div
            className="h-full bg-noir-gold transition-all duration-[4000ms] ease-linear"
            style={{
              width: isExiting ? '0%' : '100%',
              transitionDuration: isExiting ? '0ms' : '4000ms',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Hook to manage notifications
export function useEvidenceNotification() {
  const [notification, setNotification] = useState<Notification | null>(null)

  const showNotification = (evidenceId: string, evidenceName: string, hint: string = '') => {
    setNotification({
      id: crypto.randomUUID(),
      evidenceId,
      evidenceName,
      hint,
    })
  }

  const dismissNotification = () => {
    setNotification(null)
  }

  return {
    notification,
    showNotification,
    dismissNotification,
  }
}
