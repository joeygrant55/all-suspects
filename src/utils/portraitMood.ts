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
 */
export function getPortraitPath(characterId: string, mood: PortraitMood = 'calm'): string {
  if (mood === 'calm') return `/portraits/${characterId}.png`
  return `/portraits/${characterId}-${mood}.png`
}
