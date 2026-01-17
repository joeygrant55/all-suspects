/**
 * Cinematic visual effects for the interrogation modal
 * - Film grain overlay
 * - Vignette effect
 * - Gold decorative borders
 */

interface CinematicEffectsProps {
  showGrain?: boolean
  showVignette?: boolean
}

export function CinematicEffects({ showGrain = true, showVignette = true }: CinematicEffectsProps) {
  return (
    <>
      {/* Vignette effect - darkened edges */}
      {showVignette && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            boxShadow: 'inset 0 0 150px 50px rgba(0, 0, 0, 0.7)',
          }}
        />
      )}

      {/* Film grain overlay */}
      {showGrain && (
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </>
  )
}

/**
 * Gold decorative border for top/bottom of modal
 */
export function GoldBorder({ position }: { position: 'top' | 'bottom' }) {
  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0'

  return (
    <div className={`absolute ${positionClasses} h-[2px] z-20`}>
      {/* Main gold line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-noir-gold to-transparent" />

      {/* Glow effect */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: '0 0 20px rgba(201, 162, 39, 0.4), 0 0 40px rgba(201, 162, 39, 0.2)',
        }}
      />

      {/* Decorative diamond accents */}
      <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-1 h-1 rotate-45 bg-noir-gold" />
      <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-1 h-1 rotate-45 bg-noir-gold" />
    </div>
  )
}

/**
 * Backdrop blur and dim effect for behind modal
 */
export function ModalBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
      onClick={onClick}
      aria-label="Close interrogation"
    />
  )
}
