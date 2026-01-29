/**
 * Blueprint Adapter
 * 
 * Converts a generated MysteryBlueprint (from the mystery generator API)
 * into a LoadedMystery that the game engine can use.
 * 
 * This bridges the gap between Claude's free-form mystery output
 * and the game's strict type requirements.
 */

import type { LoadedMystery } from '../game/mysteryState'
import type { CharacterProfile, WorldState } from '../agents/types'
import type { EvidenceData } from '../types/evidence'

export interface GeneratedBlueprint {
  id: string
  title: string
  subtitle?: string
  description?: string
  era?: string
  difficulty?: string
  setting?: any
  victim: any
  characters: any[]
  locations: any[]
  evidence: any[]
  solution: {
    killerId: string
    method?: string
    motive?: string
    explanation?: string
  }
  timeline?: any[]
  redHerrings?: any[]
  [key: string]: any
}

/**
 * Convert a generated blueprint into a LoadedMystery
 */
export function adaptBlueprint(blueprint: GeneratedBlueprint): LoadedMystery {
  // Build WorldState
  const worldState = buildWorldState(blueprint)
  
  // Build CharacterProfiles
  const characters = blueprint.characters.map(c => buildCharacterProfile(c, blueprint))
  
  // Build greetings
  const greetings: Record<string, string> = {}
  for (const c of blueprint.characters) {
    const id = c.id || c.name?.toLowerCase().replace(/\s+/g, '-')
    greetings[id] = c.greeting || c.initialGreeting || buildDefaultGreeting(c, blueprint)
  }
  
  // Build evidence database
  const evidence = buildEvidenceDatabase(blueprint)
  
  // Build evidence by room
  const evidenceByRoom = buildEvidenceByRoom(blueprint)
  
  // Build evidence dialogue unlocks
  const evidenceDialogueUnlocks = buildDialogueUnlocks(blueprint)
  
  // Get room IDs
  const rooms = blueprint.locations.map(l => l.id || l.name?.toLowerCase().replace(/\s+/g, '-'))

  return {
    id: blueprint.id,
    title: blueprint.title,
    worldState,
    characters,
    greetings,
    evidence,
    evidenceByRoom,
    evidenceDialogueUnlocks,
    rooms,
    killerId: blueprint.solution.killerId,
  }
}

function buildWorldState(bp: GeneratedBlueprint): WorldState {
  const setting = typeof bp.setting === 'object' ? bp.setting : { location: bp.setting || 'Unknown' }
  const victimName = typeof bp.victim === 'object' ? bp.victim.name : bp.victim

  return {
    timeOfDeath: bp.victim?.timeOfDeath || bp.timeline?.[0]?.time || 'Late evening',
    victim: victimName || 'Unknown',
    location: setting.location || setting.name || 'Unknown location',
    weather: setting.weather || 'A cold, dark night',
    guestList: bp.characters.map(c => c.name),
    publicKnowledge: [
      `${victimName} has been found dead.`,
      `The death occurred at ${setting.location || 'the scene'}.`,
      `Cause of death: ${bp.solution.method || 'under investigation'}.`,
      ...(bp.victim?.publicDetails || []),
      'All suspects were present at the time of the murder.',
      'The police have sealed the area — no one can leave.',
    ],
  }
}

function buildCharacterProfile(c: any, bp: GeneratedBlueprint): CharacterProfile {
  const id = c.id || c.name?.toLowerCase().replace(/\s+/g, '-')
  const isKiller = id === bp.solution.killerId || c.isGuilty

  // Build relationships map
  const relationships: Record<string, string> = {}
  if (Array.isArray(c.relationships)) {
    for (const rel of c.relationships) {
      if (typeof rel === 'object' && rel.character) {
        const relId = rel.character?.toLowerCase?.().replace(/\s+/g, '-') || rel.characterId
        relationships[relId] = rel.description || rel.relationship || rel.type || 'knows'
      } else if (typeof rel === 'string') {
        // Parse "Name - relationship" format
        const parts = rel.split(/[-–—:]/)
        if (parts.length >= 2) {
          const relId = parts[0].trim().toLowerCase().replace(/\s+/g, '-')
          relationships[relId] = parts.slice(1).join('-').trim()
        }
      }
    }
  } else if (typeof c.relationships === 'object') {
    Object.assign(relationships, c.relationships)
  }

  // Build private secrets
  const secrets: string[] = []
  if (c.secrets) secrets.push(...(Array.isArray(c.secrets) ? c.secrets : [c.secrets]))
  if (c.secretKnowledge) secrets.push(...(Array.isArray(c.secretKnowledge) ? c.secretKnowledge : [c.secretKnowledge]))
  if (c.hiddenInfo) secrets.push(...(Array.isArray(c.hiddenInfo) ? c.hiddenInfo : [c.hiddenInfo]))
  if (isKiller) {
    secrets.push(`I killed ${typeof bp.victim === 'object' ? bp.victim.name : bp.victim}.`)
    secrets.push(`Method: ${bp.solution.method || 'unknown'}`)
    secrets.push(`Motive: ${bp.solution.motive || 'unknown'}`)
  }

  return {
    id,
    name: c.name,
    role: c.role || c.occupation || 'Suspect',
    personality: c.personality || c.temperament || c.description || '',
    speechPattern: c.speechPattern || c.speech || buildSpeechPattern(c),
    publicInfo: c.publicInfo || c.background || c.backstory || `${c.name} is the ${c.role || 'a person of interest'}.`,
    privateSecrets: secrets,
    alibi: c.alibi || 'Claims to have been elsewhere.',
    relationships,
    isGuilty: isKiller || false,
  }
}

function buildSpeechPattern(c: any): string {
  // Generate a speech pattern hint from personality/role
  const role = (c.role || c.occupation || '').toLowerCase()
  if (role.includes('professor') || role.includes('doctor')) return 'Precise, educated vocabulary. Tends to lecture.'
  if (role.includes('singer') || role.includes('performer')) return 'Dramatic, expressive. Prone to theatrical gestures.'
  if (role.includes('bartender') || role.includes('worker')) return 'Direct, no-nonsense. Working-class dialect.'
  if (role.includes('detective') || role.includes('police')) return 'Clipped, professional. Asks questions more than answers.'
  if (role.includes('socialite') || role.includes('wealthy')) return 'Refined, careful word choice. Never quite says what they mean.'
  return 'Speaks naturally, with occasional nervous pauses.'
}

function buildDefaultGreeting(c: any, bp: GeneratedBlueprint): string {
  const victimName = typeof bp.victim === 'object' ? bp.victim.name : bp.victim
  return `*${c.name} looks up as you approach.* Terrible business about ${victimName}. I suppose you want to ask me questions too? Very well... I have nothing to hide.`
}

function buildEvidenceDatabase(bp: GeneratedBlueprint): Record<string, EvidenceData> {
  const db: Record<string, EvidenceData> = {}
  
  for (const ev of bp.evidence) {
    const id = ev.id || ev.name?.toLowerCase().replace(/\s+/g, '-')
    
    db[id] = {
      id,
      name: ev.name || ev.title || 'Unknown Evidence',
      description: ev.description || ev.summary || '',
      detailedDescription: ev.detailedDescription || ev.details || ev.description || '',
      type: normalizeEvidenceType(ev.type || ev.category),
      relatedCharacter: ev.relatedCharacter || ev.suspect || ev.pointsTo,
      hint: ev.hint || ev.investigativeHint || '',
      pointsTo: ev.pointsTo || ev.implicates || ev.relatedCharacter,
      image: ev.image,
    }
  }
  
  return db
}

function normalizeEvidenceType(type: string): 'physical' | 'document' | 'testimony' {
  if (!type) return 'physical'
  const t = type.toLowerCase()
  if (t.includes('document') || t.includes('letter') || t.includes('note') || t.includes('record')) return 'document'
  if (t.includes('testimony') || t.includes('witness') || t.includes('statement')) return 'testimony'
  return 'physical'
}

function buildEvidenceByRoom(bp: GeneratedBlueprint): Record<string, string[]> {
  const byRoom: Record<string, string[]> = {}
  
  for (const ev of bp.evidence) {
    const evId = ev.id || ev.name?.toLowerCase().replace(/\s+/g, '-')
    let roomId = ev.location || ev.room || ev.foundIn
    
    // Normalize room ID
    if (typeof roomId === 'string') {
      // Try to match to a location
      const loc = bp.locations.find(l => 
        l.id === roomId || 
        l.name?.toLowerCase() === roomId.toLowerCase() ||
        l.name?.toLowerCase().replace(/\s+/g, '-') === roomId.toLowerCase().replace(/\s+/g, '-')
      )
      roomId = loc?.id || roomId.toLowerCase().replace(/\s+/g, '-')
    } else {
      roomId = bp.locations[0]?.id || 'unknown'
    }
    
    if (!byRoom[roomId]) byRoom[roomId] = []
    byRoom[roomId].push(evId)
  }
  
  return byRoom
}

function buildDialogueUnlocks(bp: GeneratedBlueprint): Record<string, Array<{ characterId: string; prompt: string }>> {
  const unlocks: Record<string, Array<{ characterId: string; prompt: string }>> = {}
  
  // For generated mysteries, create dialogue unlock hints based on evidence
  for (const ev of bp.evidence) {
    const evId = ev.id || ev.name?.toLowerCase().replace(/\s+/g, '-')
    if (ev.relatedCharacter || ev.suspect) {
      const charId = (ev.relatedCharacter || ev.suspect).toLowerCase().replace(/\s+/g, '-')
      // Match to actual character ID
      const char = bp.characters.find(c => {
        const cId = c.id || c.name?.toLowerCase().replace(/\s+/g, '-')
        return cId === charId || c.name?.toLowerCase().includes(charId.replace(/-/g, ' '))
      })
      if (char) {
        const cId = char.id || char.name?.toLowerCase().replace(/\s+/g, '-')
        if (!unlocks[evId]) unlocks[evId] = []
        unlocks[evId].push({
          characterId: cId,
          prompt: `Ask about ${ev.name || 'this evidence'}`,
        })
      }
    }
  }
  
  return unlocks
}
