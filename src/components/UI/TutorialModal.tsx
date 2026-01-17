import { useGameStore } from '../../game/state'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const setTutorialSeen = useGameStore((state) => state.setTutorialSeen)

  if (!isOpen) return null

  const handleBegin = () => {
    setTutorialSeen()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Modal container */}
      <div
        className="relative w-[600px] bg-noir-charcoal border border-noir-slate rounded-sm overflow-hidden"
        style={{
          boxShadow: '0 0 60px rgba(201, 162, 39, 0.2), 0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Gold corner decorations */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-noir-gold/60" />
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-noir-gold/60" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-noir-gold/60" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-noir-gold/60" />

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl text-noir-gold tracking-widest mb-2"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: '0 0 30px rgba(201, 162, 39, 0.4)',
              }}
            >
              Welcome, Detective
            </h1>
            <div className="flex items-center justify-center gap-2 opacity-50">
              <div className="h-px w-12 bg-noir-gold" />
              <div className="w-2 h-2 rotate-45 bg-noir-gold" />
              <div className="h-px w-12 bg-noir-gold" />
            </div>
          </div>

          {/* Story setup */}
          <div
            className="text-noir-cream/90 text-center mb-8 leading-relaxed"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <p className="mb-4">
              New Year's Eve, 1929. <span className="text-noir-gold">Edmund Ashford</span>,
              wealthy industrialist, has been found dead in his study at the stroke of midnight.
            </p>
            <p>
              Six suspects remain in the manor. One of them is a murderer.
              <span className="text-noir-blood"> It's your job to find them.</span>
            </p>
          </div>

          {/* Objectives */}
          <div className="bg-noir-black/50 border border-noir-slate/50 rounded-sm p-6 mb-8">
            <h3
              className="text-noir-gold text-sm tracking-wider uppercase mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Your Objectives
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-noir-cream/90">
                <span className="text-lg mt-0.5">🔍</span>
                <span style={{ fontFamily: 'Georgia, serif' }}>
                  <strong className="text-noir-cream">Explore the manor</strong> and examine objects
                  for evidence. Press <span className="text-green-400 font-bold">F</span> near glowing items or click on them.
                </span>
              </li>
              <li className="flex items-start gap-3 text-noir-cream/90">
                <span className="text-lg mt-0.5">💬</span>
                <span style={{ fontFamily: 'Georgia, serif' }}>
                  <strong className="text-noir-cream">Question the suspects</strong> — they may
                  lie, omit details, or contradict each other.
                </span>
              </li>
              <li className="flex items-start gap-3 text-noir-cream/90">
                <span className="text-lg mt-0.5">📋</span>
                <span style={{ fontFamily: 'Georgia, serif' }}>
                  <strong className="text-noir-cream">Collect 5 pieces of evidence</strong> to
                  unlock the ability to make your accusation.
                </span>
              </li>
            </ul>
          </div>

          {/* Hint */}
          <p
            className="text-noir-smoke text-sm text-center italic mb-8"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Tip: Evidence you collect may reveal new questions to ask the suspects.
          </p>

          {/* Begin button */}
          <div className="flex justify-center">
            <button
              onClick={handleBegin}
              className="px-8 py-3 bg-noir-gold text-noir-black font-medium tracking-wider hover:bg-noir-gold/90 transition-colors"
              style={{
                fontFamily: 'Georgia, serif',
                boxShadow: '0 4px 20px rgba(201, 162, 39, 0.3)',
              }}
            >
              BEGIN INVESTIGATION
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
