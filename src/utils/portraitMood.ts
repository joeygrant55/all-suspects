/**
 * Portrait mood system — maps pressure levels to portrait variants.
 *
 * Each suspect has three portrait files:
 *   {name}.png        — calm (default)
 *   {name}-nervous.png — nervous
 *   {name}-breaking.png — breaking
 */

export type PortraitMood = 'calm' | 'nervous' | 'breaking'

/**
 * Determine portrait mood from a 0-100 pressure level.
 *   0-40  → calm
 *   41-70 → nervous
 *   71-100 → breaking
 */
export function getMoodFromPressure(pressure: number): PortraitMood {
  if (pressure >= 71) return 'breaking'
  if (pressure >= 41) return 'nervous'
  return 'calm'
}

/**
 * Get the portrait image path for a character + mood.
 * Checks for generated mystery assets first.
 */
export function getPortraitPath(characterId: string, mood: PortraitMood = 'calm', mysteryId?: string | null): string {
  // For generated mysteries, use the generated assets path
  if (mysteryId && mysteryId !== 'ashford-affair' && mysteryId !== 'hollywood-premiere') {
    const suffix = mood === 'calm' ? '' : `-${mood}`
    return `/generated/${mysteryId}/assets/portraits/${characterId}${suffix}.png`
  }
  if (mood === 'calm') return `/portraits/${characterId}.png`
  return `/portraits/${characterId}-${mood}.png`
}
