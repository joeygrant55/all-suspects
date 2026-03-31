import { useGameStore } from '../../game/state'
import { getMoodFromPressure } from '../../utils/portraitMood'
import { CharacterPortrait } from './CharacterPortrait'

export function CharacterList() {
  const saints = useGameStore((state) => state.saints)
  const currentSaintId = useGameStore((state) => state.currentSaintId)
  const selectSaint = useGameStore((state) => state.selectSaint)

  return (
    <aside className="border-r border-noir-slate bg-noir-charcoal/70 p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-noir-gold">Suspect Roster</p>
        <h2
          className="mt-2 text-2xl text-noir-cream"
          style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}
        >
          Available Interviews
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-noir-ash">
          Select any suspect to open their thread. Their prior answers remain in the case log.
        </p>
      </div>

      <div className="space-y-3">
        {saints.map((saint) => {
          const isActive = saint.id === currentSaintId
          const pressureLevel = saint.pressure?.level ?? 0

          return (
            <button
              key={saint.id}
              onClick={() => selectSaint(saint.id)}
              className={`flex w-full items-center gap-3 rounded border p-3 text-left transition-all ${
                isActive
                  ? 'border-noir-gold bg-noir-gold/10'
                  : 'border-noir-slate bg-noir-black/30 hover:border-noir-gold/50 hover:bg-noir-black/50'
              }`}
            >
              <CharacterPortrait
                characterId={saint.id}
                name={saint.name}
                role={saint.role}
                size="small"
                isActive={isActive}
                mood={getMoodFromPressure(pressureLevel)}
              />

              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${isActive ? 'text-noir-gold' : 'text-noir-cream'}`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {saint.name}
                </p>
                <p className="truncate text-xs text-noir-smoke">{saint.role}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-noir-smoke">Pressure</p>
                <p className="text-xs text-noir-cream">{Math.round(pressureLevel)}%</p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
