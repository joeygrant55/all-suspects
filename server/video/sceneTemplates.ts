/**
 * Scene Templates for Manor Locations
 *
 * Base visual descriptions for each location in Ashford Manor.
 * These are combined with specific testimony details to create video prompts.
 */

export const MANOR_LOCATIONS = {
  study: {
    name: 'Study',
    template:
      'wood-paneled study with dark mahogany furniture, floor-to-ceiling bookshelves, ' +
      'large desk with papers and ink well, leather armchair, dying fire in marble fireplace, ' +
      'heavy velvet curtains, grandfather clock, dim oil lamp lighting, crime scene location',
    keyObjects: ['desk', 'fireplace', 'bookshelves', 'grandfather clock', 'leather chair'],
    defaultMood: 'ominous',
    doorway: 'large wooden door with brass handle',
  },

  parlor: {
    name: 'Parlor',
    template:
      'elegant parlor with plush Victorian furniture, ornate fireplace with carved mantle, ' +
      'crystal chandelier casting warm light, chaise lounge, side tables with decorative lamps, ' +
      'tall windows with brocade curtains, family portraits on walls, Persian rug',
    keyObjects: ['fireplace', 'chandelier', 'chaise lounge', 'family portraits'],
    defaultMood: 'tense elegance',
    doorway: 'arched doorway with white trim',
  },

  dining_room: {
    name: 'Dining Room',
    template:
      'formal dining room with long mahogany table, twelve high-backed chairs, ' +
      'silver candelabras, fine china and crystal glasses, sideboard with decanters, ' +
      'heavy damask wallpaper, large oil paintings, chandelier above table',
    keyObjects: ['dining table', 'candelabras', 'champagne glasses', 'sideboard'],
    defaultMood: 'formal tension',
    doorway: 'double doors to hallway',
  },

  hallway: {
    name: 'Hallway',
    template:
      'grand hallway with dark wood paneling, checkered marble floor, wall sconces, ' +
      'grandfather clock (stopped at 11:32), side tables with flowers, ornate mirror, ' +
      'staircase visible in distance, multiple doorways to other rooms',
    keyObjects: ['grandfather clock', 'checkered floor', 'wall sconces', 'mirror'],
    defaultMood: 'suspenseful',
    doorway: 'multiple doorways leading to study, parlor, and kitchen',
  },

  kitchen: {
    name: 'Kitchen',
    template:
      'large service kitchen with copper pots hanging, wood-burning stove, ' +
      'butcher block table, stone sink, pantry shelves with provisions, ' +
      'servants entrance, hanging herbs, dim service lighting',
    keyObjects: ['stove', 'pantry', 'copper pots', 'butcher block'],
    defaultMood: 'practical, hidden secrets',
    doorway: 'swinging service door',
  },

  garden: {
    name: 'Garden',
    template:
      'formal English garden at night, manicured hedges, stone pathway, ' +
      'moonlight through clouds, ornamental fountain, rose bushes, garden bench, ' +
      'view of manor windows glowing, slight mist, no footprints visible',
    keyObjects: ['hedges', 'fountain', 'stone path', 'garden bench', 'manor windows'],
    defaultMood: 'lonely, deceptive calm',
    doorway: 'French doors from parlor',
  },

  library: {
    name: 'Library',
    template:
      'two-story library with rolling ladder, thousands of leather-bound books, ' +
      'reading alcoves with green-shaded lamps, spiral staircase to upper level, ' +
      'globe, antique maps, secret passages rumored',
    keyObjects: ['books', 'ladder', 'globe', 'reading nook'],
    defaultMood: 'scholarly secrets',
    doorway: 'hidden behind bookshelf',
  },

  manor: {
    name: 'Ashford Manor (Exterior)',
    template:
      'grand Victorian manor house, three stories, ivy-covered walls, ' +
      'gothic windows glowing with warm light, circular driveway, ' +
      'dark silhouettes of trees, New Years Eve 1929, light snow',
    keyObjects: ['manor facade', 'windows', 'driveway', 'entrance'],
    defaultMood: 'imposing mystery',
    doorway: 'grand front entrance with columns',
  },

  abstract: {
    name: 'Abstract/Memory',
    template:
      'dark void with soft spotlight, fragments of memory, swirling fog, ' +
      'silhouette of figure, noir lighting, dreamlike quality',
    keyObjects: ['shadow', 'light', 'fog'],
    defaultMood: 'uncertain',
    doorway: 'none',
  },
} as const

export type LocationKey = keyof typeof MANOR_LOCATIONS

/**
 * Get the scene template for a location
 */
export function getSceneTemplate(location: LocationKey | string): string {
  const normalizedLocation = location.toLowerCase().replace(/[^a-z_]/g, '_') as LocationKey

  if (normalizedLocation in MANOR_LOCATIONS) {
    return MANOR_LOCATIONS[normalizedLocation].template
  }

  // Try to find a partial match
  for (const [key, value] of Object.entries(MANOR_LOCATIONS)) {
    if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
      return value.template
    }
  }

  // Default to manor exterior
  return MANOR_LOCATIONS.manor.template
}

/**
 * Get key objects for a location (for prompt emphasis)
 */
export function getLocationObjects(location: LocationKey): string[] {
  return MANOR_LOCATIONS[location]?.keyObjects || []
}

/**
 * Get the doorway description (important for contradiction detection)
 */
export function getDoorwayDescription(location: LocationKey): string {
  return MANOR_LOCATIONS[location]?.doorway || 'doorway'
}

/**
 * Build a scene-specific prompt for a particular moment
 */
export function buildScenePrompt(
  location: LocationKey,
  timeOfDay: 'evening' | 'night' | 'midnight',
  specificAction?: string,
  characters?: string[],
  focusObject?: string
): string {
  const base = MANOR_LOCATIONS[location] || MANOR_LOCATIONS.manor

  let prompt = base.template

  // Add time of day
  const timeDescriptions = {
    evening: 'warm amber lighting from chandeliers and lamps',
    night: 'dim lighting with deep shadows, some rooms dark',
    midnight: 'near darkness, single candles or dying fires only',
  }
  prompt += `, ${timeDescriptions[timeOfDay]}`

  // Add characters if specified
  if (characters && characters.length > 0) {
    prompt += `, ${characters.join(' and ')} visible in scene`
  }

  // Add specific action if present
  if (specificAction) {
    prompt += `, ${specificAction}`
  }

  // Add focus on specific object
  if (focusObject) {
    prompt += `, camera focuses on ${focusObject}`
  }

  return prompt
}

/**
 * Get a contradicting scene description
 * Used for generating videos that specifically highlight a discrepancy
 */
export function getContradictionScene(
  location: LocationKey,
  elementInQuestion: 'door_open' | 'door_closed' | 'person_present' | 'person_absent' | 'object_visible' | 'object_hidden',
  personOrObject?: string
): string {
  const base = getSceneTemplate(location)
  const doorway = getDoorwayDescription(location)

  switch (elementInQuestion) {
    case 'door_open':
      return `${base}, ${doorway} clearly OPEN, light spilling through, interior visible`

    case 'door_closed':
      return `${base}, ${doorway} clearly CLOSED, solid barrier, no view inside`

    case 'person_present':
      return `${base}, ${personOrObject || 'figure'} clearly visible in the scene, unmistakable presence`

    case 'person_absent':
      return `${base}, empty room, no one present, ${personOrObject || 'expected person'} conspicuously absent`

    case 'object_visible':
      return `${base}, ${personOrObject || 'object'} prominently visible, cannot be missed`

    case 'object_hidden':
      return `${base}, no sign of ${personOrObject || 'the object'}, clearly not present`

    default:
      return base
  }
}
