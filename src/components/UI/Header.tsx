import { useGameStore } from '../../game/state'

interface HeaderProps {
  onReturnHome?: () => void
}

export function Header({ onReturnHome }: HeaderProps) {
  const saints = useGameStore((state) => state.saints)
  const currentSaintId = useGameStore((state) => state.currentSaintId)
  const messages = useGameStore((state) => state.messages)

  const currentSaint = saints.find((saint) => saint.id === currentSaintId) ?? null
  const questionCount = messages.filter((message) => message.role === 'player').length

  return (
    <header className="border-b border-noir-slate bg-gradient-to-b from-noir-charcoal to-noir-black px-6 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-[0.28em] text-noir-gold"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              All Suspects
            </p>
            <h1
              className="text-2xl text-noir-cream"
              style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}
            >
              Investigation Desk
            </h1>
          </div>
          <div className="hidden h-8 w-px bg-noir-slate md:block" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-noir-smoke">Current Subject</p>
            <p className="text-sm text-noir-cream">
              {currentSaint ? `${currentSaint.name} // ${currentSaint.role}` : 'Choose a suspect to begin'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded border border-noir-slate bg-noir-black/40 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-noir-smoke">Questions Logged</p>
            <p className="text-lg text-noir-gold">{questionCount}</p>
          </div>
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="rounded border border-noir-gold/60 px-4 py-2 text-sm tracking-[0.15em] text-noir-gold transition-colors hover:bg-noir-gold/10"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Return Home
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
