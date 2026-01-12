// Agent types for All Suspects

export interface CharacterProfile {
  id: string
  name: string
  role: string
  personality: string
  speechPattern: string
  publicInfo: string
  privateSecrets: string[]
  alibi: string
  relationships: Record<string, string>
  isGuilty: boolean
}

export interface WorldState {
  timeOfDeath: string
  victim: string
  location: string
  weather: string
  guestList: string[]
  publicKnowledge: string[]
}

export interface ConversationContext {
  characterId: string
  previousStatements: string[]
  playerQuestions: string[]
  currentMood: 'calm' | 'nervous' | 'defensive' | 'cooperative' | 'hostile'
}

export interface AgentResponse {
  message: string
  mood: ConversationContext['currentMood']
  isLying: boolean
  evidence?: {
    type: 'testimony' | 'contradiction' | 'physical' | 'document'
    description: string
  }
}

export interface CoordinatorState {
  world: WorldState
  characters: Map<string, CharacterProfile>
  conversationHistory: Map<string, ConversationContext>
  collectedStatements: Array<{
    characterId: string
    statement: string
    timestamp: number
  }>
}
