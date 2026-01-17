import type { Character } from '../../game/state'

interface CharacterPortraitProps {
  character: Character
  onClose: () => void
}

export function CharacterPortrait({ character, onClose }: CharacterPortraitProps) {
  const initials = character.name
    .split(' ')
    .map((n) => n[0])
    .join('')

  const pressureLevel = character.pressure?.level ?? 0
  const pressureColor =
    pressureLevel >= 80
      ? 'bg-noir-blood'
      : pressureLevel >= 50
        ? 'bg-amber-500'
        : 'bg-noir-gold/70'

  const pressureGlow =
    pressureLevel >= 80
      ? 'shadow-[0_0_20px_rgba(114,47,55,0.5)]'
      : pressureLevel >= 50
        ? 'shadow-[0_0_15px_rgba(245,158,11,0.4)]'
        : ''

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left side: Portrait + Info */}
      <div className="flex items-center gap-5">
        {/* Portrait circle with glow */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: '0 0 30px rgba(201, 162, 39, 0.3), 0 0 60px rgba(201, 162, 39, 0.15)',
            }}
          />

          {/* Portrait container */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-noir-slate to-noir-charcoal flex items-center justify-center border-2 border-noir-gold/50 overflow-hidden">
            {/* Character initials */}
            <span
              className="text-3xl font-serif text-noir-gold tracking-wide"
              style={{
                textShadow: '0 0 20px rgba(201, 162, 39, 0.5)',
              }}
            >
              {initials}
            </span>

            {/* Subtle inner shadow for depth */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>

          {/* Pressure indicator dot (when high) */}
          {pressureLevel >= 70 && (
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${pressureColor} animate-pulse border-2 border-noir-charcoal`}
            />
          )}
        </div>

        {/* Character info */}
        <div className="flex flex-col gap-1">
          {/* Name */}
          <h2
            className="text-2xl font-serif text-noir-gold tracking-wide"
            style={{
              textShadow: '0 0 10px rgba(201, 162, 39, 0.3)',
            }}
          >
            {character.name.toUpperCase()}
          </h2>

          {/* Role */}
          <p className="text-sm text-noir-smoke tracking-wider">{character.role}</p>

          {/* Pressure meter */}
          {pressureLevel > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-noir-ash uppercase tracking-widest">
                Pressure
              </span>
              <div
                className={`w-32 h-2 bg-noir-black/50 rounded-full overflow-hidden border border-noir-slate/30 ${pressureGlow}`}
              >
                <div
                  className={`h-full transition-all duration-700 ease-out ${pressureColor} ${pressureLevel >= 80 ? 'animate-pulse' : ''}`}
                  style={{ width: `${pressureLevel}%` }}
                />
              </div>
              <span className="text-xs text-noir-smoke font-mono">{Math.round(pressureLevel)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Close button */}
      <button
        onClick={onClose}
        className="group p-2 hover:bg-noir-slate/30 rounded-lg transition-all duration-200"
        aria-label="End interrogation"
      >
        <svg
          className="w-6 h-6 text-noir-smoke group-hover:text-noir-gold transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}
