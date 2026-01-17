import type { EvidenceData } from '../Scene/InteractiveObject'
import { useGameStore } from '../../game/state'

interface ExaminationModalProps {
  evidence: EvidenceData | null
  isOpen: boolean
  onClose: () => void
  isAlreadyCollected: boolean
  onEvidenceCollected?: (evidenceId: string, evidenceName: string, hint?: string) => void
}

export function ExaminationModal({ evidence, isOpen, onClose, isAlreadyCollected, onEvidenceCollected }: ExaminationModalProps) {
  const addEvidence = useGameStore((state) => state.addEvidence)

  if (!isOpen || !evidence) return null

  const handleAddToEvidence = () => {
    addEvidence({
      type: evidence.type,
      description: evidence.name,
      source: evidence.id,
    })
    // Trigger notification callback
    if (onEvidenceCollected) {
      onEvidenceCollected(evidence.id, evidence.name, evidence.hint)
    }
    onClose()
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'physical':
        return 'Physical Evidence'
      case 'document':
        return 'Document'
      case 'testimony':
        return 'Testimony'
      default:
        return 'Evidence'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'physical':
        return 'bg-green-900/50 text-green-300 border-green-700'
      case 'document':
        return 'bg-amber-900/50 text-amber-300 border-amber-700'
      case 'testimony':
        return 'bg-blue-900/50 text-blue-300 border-blue-700'
      default:
        return 'bg-noir-slate text-noir-cream border-noir-smoke'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with spotlight effect */}
      <div
        className="absolute inset-0 bg-black/95"
        onClick={onClose}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.98) 70%)',
        }}
      />

      {/* Modal content */}
      <div
        className="relative w-[600px] max-h-[80vh] overflow-hidden rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
          boxShadow: '0 0 100px rgba(201, 162, 39, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          border: '1px solid #2d2d2d',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-noir-slate/50">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(evidence.type)}`}>
                {getTypeLabel(evidence.type)}
              </span>
              <h2
                className="text-2xl text-noir-gold mt-2 tracking-wide"
                style={{
                  fontFamily: 'Georgia, serif',
                  textShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
                }}
              >
                {evidence.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-noir-smoke hover:text-noir-cream transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Evidence spotlight visual */}
        <div className="px-6 py-4 border-b border-noir-slate/30">
          <div
            className="h-32 rounded flex items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(201, 162, 39, 0.1) 0%, transparent 70%)',
            }}
          >
            <div
              className="text-6xl"
              style={{
                textShadow: '0 0 30px rgba(201, 162, 39, 0.5)',
              }}
            >
              {evidence.type === 'document' && '📄'}
              {evidence.type === 'physical' && '🔍'}
              {evidence.type === 'testimony' && '💬'}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
          <p className="text-noir-smoke text-sm italic mb-4">{evidence.description}</p>
          <div
            className="text-noir-cream text-sm leading-relaxed whitespace-pre-line"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {evidence.detailedDescription}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-noir-slate/50 flex justify-between items-center">
          {evidence.relatedCharacter && (
            <p className="text-noir-smoke text-xs">
              May be relevant to questioning...
            </p>
          )}
          {!evidence.relatedCharacter && <div />}

          {isAlreadyCollected ? (
            <div className="flex items-center gap-2 text-noir-smoke text-sm">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Already in Evidence Board
            </div>
          ) : (
            <button
              onClick={handleAddToEvidence}
              className="px-6 py-2 bg-noir-gold text-noir-black font-medium text-sm tracking-wider hover:bg-noir-gold/90 transition-colors"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              ADD TO EVIDENCE
            </button>
          )}
        </div>

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 w-6 h-6 border-l border-t border-noir-gold/30" />
        <div className="absolute top-2 right-2 w-6 h-6 border-r border-t border-noir-gold/30" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-l border-b border-noir-gold/30" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-r border-b border-noir-gold/30" />
      </div>
    </div>
  )
}
