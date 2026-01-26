/**
 * Background Character Simulation
 * 
 * Characters have conversations with each other when the player isn't present.
 * This creates a living world where:
 * - Characters discuss the investigation
 * - Alliances form and break
 * - Secrets get shared (or exposed)
 * - Player can overhear snippets when entering rooms
 */

import Anthropic from '@anthropic-ai/sdk'
import { Character, CHARACTERS } from '../../mysteries/ashford-affair/characters'
import { getMemorySummary } from './memoryStore'
import { getAllGossipFor } from './crossReference'

// Types for background conversations
export interface ConversationSnippet {
  id: string
  participants: string[]
  location: string
  timestamp: number
  dialogue: Array<{
    characterId: string
    characterName: string
    line: string
    emotion: 'whispered' | 'urgent' | 'casual' | 'angry' | 'nervous' | 'conspiratorial'
  }>
  topic: string
  canOverhear: boolean
  overheardSummary?: string
}

export interface RoomPresence {
  roomId: string
  characterIds: string[]
  activity: 'idle' | 'talking' | 'arguing' | 'whispering' | 'pacing'
  lastUpdate: number
}

// Store recent background conversations
const backgroundConversations: ConversationSnippet[] = []
const MAX_STORED_CONVERSATIONS = 20

// Current character locations
const characterLocations: Map<string, string> = new Map()

// Room presence cache
const roomPresence: Map<string, RoomPresence> = new Map()

// Character relationship dynamics (affects who talks to whom)
const CONVERSATION_PAIRS: Array<{
  chars: [string, string]
  topics: string[]
  tension: 'friendly' | 'tense' | 'hostile' | 'secretive'
}> = [
  {
    chars: ['victoria', 'thomas'],
    topics: ['the will', 'family matters', 'Edmund\'s business', 'inheritance'],
    tension: 'tense',
  },
  {
    chars: ['victoria', 'lillian'],
    topics: ['old times', 'the investigation', 'Edmund\'s affairs', 'society gossip'],
    tension: 'secretive',
  },
  {
    chars: ['thomas', 'eleanor'],
    topics: ['the documents', 'that night', 'what father said', 'the detective'],
    tension: 'secretive',
  },
  {
    chars: ['marcus', 'victoria'],
    topics: ['Edmund\'s health', 'the poison', 'medical matters', 'nerves'],
    tension: 'friendly',
  },
  {
    chars: ['james', 'eleanor'],
    topics: ['household matters', 'what they saw', 'the other servants', 'schedules'],
    tension: 'friendly',
  },
  {
    chars: ['lillian', 'marcus'],
    topics: ['old scandals', 'Edmund\'s past', 'what really happened', 'suspicions'],
    tension: 'tense',
  },
]

// Room associations for characters
const CHARACTER_PREFERRED_ROOMS: Record<string, string[]> = {
  victoria: ['parlor', 'dining', 'study'],
  thomas: ['study', 'hallway', 'garden'],
  eleanor: ['study', 'hallway', 'kitchen'],
  marcus: ['parlor', 'dining', 'garden'],
  lillian: ['parlor', 'garden', 'hallway'],
  james: ['kitchen', 'hallway', 'dining'],
}

/**
 * Initialize character locations randomly
 */
export function initializeCharacterLocations(): void {
  CHARACTERS.forEach(char => {
    const preferredRooms = CHARACTER_PREFERRED_ROOMS[char.id] || ['hallway']
    const randomRoom = preferredRooms[Math.floor(Math.random() * preferredRooms.length)]
    characterLocations.set(char.id, randomRoom)
  })
  updateRoomPresence()
}

/**
 * Update room presence based on character locations
 */
function updateRoomPresence(): void {
  roomPresence.clear()
  
  // Group characters by room
  const roomChars: Map<string, string[]> = new Map()
  characterLocations.forEach((room, charId) => {
    if (!roomChars.has(room)) {
      roomChars.set(room, [])
    }
    roomChars.get(room)!.push(charId)
  })
  
  // Create room presence entries
  roomChars.forEach((chars, roomId) => {
    let activity: RoomPresence['activity'] = 'idle'
    
    // Determine activity based on who's present
    if (chars.length >= 2) {
      // Check if any conversation pairs are present
      const hasPair = CONVERSATION_PAIRS.some(pair => 
        chars.includes(pair.chars[0]) && chars.includes(pair.chars[1])
      )
      if (hasPair) {
        const pair = CONVERSATION_PAIRS.find(p => 
          chars.includes(p.chars[0]) && chars.includes(p.chars[1])
        )!
        activity = pair.tension === 'hostile' ? 'arguing' :
                   pair.tension === 'secretive' ? 'whispering' :
                   pair.tension === 'tense' ? 'talking' : 'talking'
      }
    }
    
    roomPresence.set(roomId, {
      roomId,
      characterIds: chars,
      activity,
      lastUpdate: Date.now(),
    })
  })
}

/**
 * Move a character to a new room (simulated movement)
 */
export function moveCharacter(characterId: string, newRoom: string): void {
  characterLocations.set(characterId, newRoom)
  updateRoomPresence()
}

/**
 * Get what characters are in a room
 */
export function getCharactersInRoom(roomId: string): string[] {
  const presence = roomPresence.get(roomId)
  return presence?.characterIds || []
}

/**
 * Get room presence info
 */
export function getRoomPresence(roomId: string): RoomPresence | null {
  return roomPresence.get(roomId) || null
}

/**
 * Generate a background conversation between two characters
 */
export async function generateBackgroundConversation(
  anthropic: Anthropic,
  char1Id: string,
  char2Id: string,
  location: string,
  pressureLevel: number = 50
): Promise<ConversationSnippet> {
  const char1 = CHARACTERS.find(c => c.id === char1Id)!
  const char2 = CHARACTERS.find(c => c.id === char2Id)!
  
  // Find the conversation pair config
  const pairConfig = CONVERSATION_PAIRS.find(p => 
    (p.chars[0] === char1Id && p.chars[1] === char2Id) ||
    (p.chars[1] === char1Id && p.chars[0] === char2Id)
  )
  
  const topics = pairConfig?.topics || ['the investigation', 'the detective']
  const tension = pairConfig?.tension || 'tense'
  const topic = topics[Math.floor(Math.random() * topics.length)]
  
  // Get context for each character
  const char1Gossip = getAllGossipFor(char1Id)
  const char2Gossip = getAllGossipFor(char2Id)
  
  const prompt = `Generate a short, tense conversation between two characters in a 1920s murder mystery. 
The detective has been investigating and tensions are high.

CHARACTER 1: ${char1.name} (${char1.role})
- Personality: ${char1.personality}
- Speech pattern: ${char1.speechPattern}
- Is guilty: ${char1.isGuilty}
- Recent gossip heard: ${char1Gossip.slice(0, 2).map(g => g.information).join('; ') || 'nothing specific'}

CHARACTER 2: ${char2.name} (${char2.role})
- Personality: ${char2.personality}
- Speech pattern: ${char2.speechPattern}
- Is guilty: ${char2.isGuilty}
- Recent gossip heard: ${char2Gossip.slice(0, 2).map(g => g.information).join('; ') || 'nothing specific'}

SETTING: ${location} in Ashford Manor, late at night
TOPIC: ${topic}
TENSION LEVEL: ${tension}
INVESTIGATION PRESSURE: ${pressureLevel}/100

Generate exactly 4-6 lines of dialogue. Each line should be:
- Short (1-2 sentences max)
- In character voice
- Revealing of their relationship/secrets without being too obvious
- Something a passing detective might overhear fragments of

Format as JSON:
{
  "dialogue": [
    {"speaker": "name", "line": "...", "emotion": "whispered|urgent|casual|angry|nervous|conspiratorial"},
    ...
  ],
  "overheardSummary": "A brief description of what someone entering the room might catch (e.g., 'Victoria and Thomas arguing about money')"
}

JSON only:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      const snippet: ConversationSnippet = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        participants: [char1Id, char2Id],
        location,
        timestamp: Date.now(),
        dialogue: parsed.dialogue.map((d: { speaker: string, line: string, emotion: string }) => ({
          characterId: d.speaker.toLowerCase().includes(char1.name.split(' ')[0].toLowerCase()) ? char1Id : char2Id,
          characterName: d.speaker,
          line: d.line,
          emotion: d.emotion || 'casual',
        })),
        topic,
        canOverhear: true,
        overheardSummary: parsed.overheardSummary,
      }
      
      // Store the conversation
      backgroundConversations.unshift(snippet)
      if (backgroundConversations.length > MAX_STORED_CONVERSATIONS) {
        backgroundConversations.pop()
      }
      
      return snippet
    }
  } catch (error) {
    console.error('[BackgroundSim] Failed to generate conversation:', error)
  }
  
  // Fallback generic conversation
  return {
    id: `conv-${Date.now()}-fallback`,
    participants: [char1Id, char2Id],
    location,
    timestamp: Date.now(),
    dialogue: [
      { characterId: char1Id, characterName: char1.name, line: "We need to be careful what we say.", emotion: 'whispered' },
      { characterId: char2Id, characterName: char2.name, line: "The detective is asking too many questions.", emotion: 'nervous' },
    ],
    topic: 'the investigation',
    canOverhear: true,
    overheardSummary: `${char1.name} and ${char2.name} whispering nervously`,
  }
}

/**
 * Get recent conversations that happened in a room
 */
export function getRecentConversationsInRoom(roomId: string, withinMs: number = 300000): ConversationSnippet[] {
  const now = Date.now()
  return backgroundConversations.filter(conv => 
    conv.location === roomId && 
    (now - conv.timestamp) < withinMs
  )
}

/**
 * Get an "overheard" snippet when player enters a room
 * Returns what they might have caught as they entered
 */
export function getOverheardSnippet(roomId: string): {
  snippet: ConversationSnippet | null
  whatHeard: string | null
} {
  const recentConvs = getRecentConversationsInRoom(roomId, 60000) // Within last minute
  
  if (recentConvs.length === 0) {
    return { snippet: null, whatHeard: null }
  }
  
  const conv = recentConvs[0]
  
  // Player catches the tail end of conversation
  if (conv.dialogue.length > 0) {
    const lastLine = conv.dialogue[conv.dialogue.length - 1]
    return {
      snippet: conv,
      whatHeard: `As you enter, you catch ${lastLine.characterName} saying: "${lastLine.line}"`,
    }
  }
  
  return {
    snippet: conv,
    whatHeard: conv.overheardSummary || null,
  }
}

/**
 * Get all stored background conversations
 */
export function getAllBackgroundConversations(): ConversationSnippet[] {
  return [...backgroundConversations]
}

/**
 * Simulate background activity (called periodically)
 * This would be called by a background job or timer
 */
export async function simulateBackgroundActivity(anthropic: Anthropic): Promise<void> {
  // Move some characters around
  CHARACTERS.forEach(char => {
    if (Math.random() < 0.3) { // 30% chance to move
      const preferredRooms = CHARACTER_PREFERRED_ROOMS[char.id] || ['hallway']
      const newRoom = preferredRooms[Math.floor(Math.random() * preferredRooms.length)]
      moveCharacter(char.id, newRoom)
    }
  })
  
  // Check for potential conversations
  roomPresence.forEach(async (presence, roomId) => {
    if (presence.characterIds.length >= 2) {
      // Find a valid pair
      const pair = CONVERSATION_PAIRS.find(p => 
        presence.characterIds.includes(p.chars[0]) && 
        presence.characterIds.includes(p.chars[1])
      )
      
      if (pair && Math.random() < 0.5) { // 50% chance of conversation
        await generateBackgroundConversation(
          anthropic,
          pair.chars[0],
          pair.chars[1],
          roomId,
          50
        )
      }
    }
  })
}

/**
 * Clear all background simulation data (for game reset)
 */
export function clearBackgroundSimulation(): void {
  backgroundConversations.length = 0
  characterLocations.clear()
  roomPresence.clear()
}

/**
 * Get a summary of current manor activity
 */
export function getManorActivitySummary(): {
  rooms: Array<{ roomId: string; characters: string[]; activity: string }>
  recentConversations: number
} {
  const rooms: Array<{ roomId: string; characters: string[]; activity: string }> = []
  
  roomPresence.forEach((presence, roomId) => {
    if (presence.characterIds.length > 0) {
      rooms.push({
        roomId,
        characters: presence.characterIds,
        activity: presence.activity,
      })
    }
  })
  
  return {
    rooms,
    recentConversations: backgroundConversations.filter(c => 
      Date.now() - c.timestamp < 300000
    ).length,
  }
}
