import { useGameStore } from '../../game/state'

interface HeaderProps {
  onOpenEvidence?: () => void
  onAccuse?: () => void
}

export function Header({ onOpenEvidence, onAccuse }: HeaderProps) {
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const accusationUnlocked = useGameStore((state) => state.accusationUnlocked)
  const contradictions = useGameStore((state) => state.contradictions)

  return (
    <header className="bg-gradient-to-b from-noir-charcoal to-noir-black border-b border-noir-slate px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <h1
            className="text-2xl text-noir-gold tracking-widest"
            style={{
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
            }}
          >
            ALL SUSPECTS
          </h1>
          <div className="flex items-center gap-1 opacity-50">
            <div className="h-px w-4 bg-noir-gold" />
            <div className="w-1 h-1 rotate-45 bg-noir-gold" />
            <div className="h-px w-4 bg-noir-gold" />
          </div>
          <span
            className="text-xs text-noir-smoke tracking-widest uppercase"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            New Year's Eve, 1929
          </span>
        </div>

        {/* Right - Stats and actions */}
        <div className="flex items-center gap-6">
          {/* Evidence counter - clickable */}
          <button
            onClick={onOpenEvidence}
            className="group flex items-center gap-3 hover:opacity-90 transition-opacity relative"
            title="Collect 5 pieces of evidence to unlock accusation"
          >
            <div className="flex flex-col items-end">
              <span className="text-xs text-noir-smoke tracking-wider uppercase">Evidence</span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xl font-bold ${
                    collectedEvidence.length >= 5 ? 'text-noir-gold' : 'text-noir-cream'
                  }`}
                  style={{
                    fontFamily: 'Georgia, serif',
                    textShadow: collectedEvidence.length >= 5 ? '0 0 10px rgba(201, 162, 39, 0.5)' : 'none',
                  }}
                >
                  {collectedEvidence.length}/5
                </span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-4 rounded-sm transition-all duration-300 ${
                        i < collectedEvidence.length
                          ? 'bg-noir-gold shadow-[0_0_8px_rgba(201,162,39,0.4)]'
                          : 'bg-noir-slate/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <svg
              className="w-5 h-5 text-noir-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {/* Tooltip */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-noir-black border border-noir-slate px-3 py-1.5 rounded text-xs text-noir-cream whitespace-nowrap">
                {collectedEvidence.length < 5
                  ? `Need ${5 - collectedEvidence.length} more to accuse`
                  : 'Ready to make accusation!'}
              </div>
            </div>
          </button>

          {/* Contradictions counter */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-xs text-noir-smoke tracking-wider uppercase">
                Contradictions
              </span>
              <span
                className={`text-lg font-bold ${
                  contradictions.length > 0 ? 'text-noir-blood' : 'text-noir-slate'
                }`}
              >
                {contradictions.length}
              </span>
            </div>
          </div>

          {/* Accusation button */}
          <div className="pl-4 border-l border-noir-slate">
            <button
              onClick={onAccuse}
              disabled={!accusationUnlocked}
              className={`px-4 py-2 text-sm tracking-wider transition-all ${
                accusationUnlocked
                  ? 'bg-noir-blood text-noir-cream hover:bg-noir-blood/80 border border-noir-blood'
                  : 'bg-noir-slate/30 text-noir-smoke border border-noir-slate cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {accusationUnlocked ? 'MAKE ACCUSATION' : 'GATHER MORE EVIDENCE'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
