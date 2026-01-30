/**
 * Universal Character Agent
 * 
 * Works with ANY mystery blueprint — no hardcoded characters.
 * Each character becomes a Claude agent with memory, lie tracking,
 * internal monologue, and cross-character awareness.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MysteryBlueprint } from './mysteryGenerator'

// ─── Types ───

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CharacterMemory {
  statements: Array<{ question: string; answer: string; timestamp: number }>
  evidenceShown: Array<{ evidenceId: string; description: string; reaction: string; timestamp: number }>
  lies: Array<{ topic: string; claimed: string; truth: string }>
  knownFacts: Array<{ topic: string; fact: string }>
  threatLevel: 'safe' | 'concerning' | 'dangerous' | 'critical'
  timesQuestioned: number
}

export interface InternalMonologue {
  thought: string
  threatLevel: 'safe' | 'concerning' | 'dangerous' | 'critical'
  strategy: string
}

export interface CharacterResponse {
  message: string
  characterName: string
  characterId: string
  emotion: {
    primary: 'composed' | 'nervous' | 'defensive' | 'breaking' | 'relieved' | 'hostile'
    intensity: number
    tells: string[]
  }
  internalMonologue?: InternalMonologue
  pressure: {
    level: number
    confrontations: number
    evidencePresented: number
  }
}

// ─── Session Store ───

interface MysterySession {
  blueprint: MysteryBlueprint
  conversations: Map<string, ConversationMessage[]>
  memories: Map<string, CharacterMemory>
  gossip: Map<string, string[]> // characterId → things they've heard
}

const sessions = new Map<string, MysterySession>()

function getOrCreateSession(mysteryId: string, blueprint: MysteryBlueprint): MysterySession {
  if (!sessions.has(mysteryId)) {
    sessions.set(mysteryId, {
      blueprint,
      conversations: new Map(),
      memories: new Map(),
      gossip: new Map(),
    })
  }
  return sessions.get(mysteryId)!
}

function getMemory(session: MysterySession, characterId: string): CharacterMemory {
  if (!session.memories.has(characterId)) {
    session.memories.set(characterId, {
      statements: [],
      evidenceShown: [],
      lies: [],
      knownFacts: [],
      threatLevel: 'safe',
      timesQuestioned: 0,
    })
  }
  return session.memories.get(characterId)!
}

function getConversation(session: MysterySession, characterId: string): ConversationMessage[] {
  if (!session.conversations.has(characterId)) {
    session.conversations.set(characterId, [])
  }
  return session.conversations.get(characterId)!
}

// ─── Tools ───

const CHARACTER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'recall_memory',
    description: 'Search your memories for what you previously said about a topic. Use before answering about specific times, places, or events.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string', description: 'What to search for (e.g., "11:30 PM", "the study", "victim")' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'internal_assessment',
    description: 'Your private thoughts about the situation. The detective cannot hear this. Use to assess threat and plan strategy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        thought: { type: 'string', description: 'Your private thought' },
        threat_level: { type: 'string', enum: ['safe', 'concerning', 'dangerous', 'critical'] },
        strategy: { type: 'string', description: 'Your approach: deflect, cooperate, redirect, deny, break down' },
      },
      required: ['thought', 'threat_level', 'strategy'],
    },
  },
]

function handleToolUse(
  session: MysterySession,
  characterId: string,
  toolName: string,
  input: Record<string, string>
): string {
  const memory = getMemory(session, characterId)

  if (toolName === 'recall_memory') {
    const topic = input.topic.toLowerCase()
    const relevant = memory.statements.filter(s =>
      s.question.toLowerCase().includes(topic) || s.answer.toLowerCase().includes(topic)
    )
    if (relevant.length === 0) return 'No previous statements about this topic.'
    return `Previous statements about "${input.topic}":\n${relevant.slice(-3).map(s => `Q: ${s.question}\nA: ${s.answer}`).join('\n---\n')}`
  }

  if (toolName === 'internal_assessment') {
    memory.threatLevel = input.threat_level as CharacterMemory['threatLevel']
    return `[Internal thought recorded. Threat: ${input.threat_level}. Strategy: ${input.strategy}]`
  }

  return 'Unknown tool.'
}

// ─── System Prompt Builder ───

function buildSystemPrompt(blueprint: MysteryBlueprint, characterId: string, memory: CharacterMemory, gossip: string[]): string {
  const char = blueprint.characters.find(c => c.id === characterId)
  if (!char) throw new Error(`Character ${characterId} not found in blueprint`)

  const setting = typeof blueprint.setting === 'object' ? blueprint.setting : { location: blueprint.setting || 'unknown', atmosphere: 'tense' }
  const otherCharacters = blueprint.characters.filter(c => c.id !== characterId)

  // Build relationship context
  const relationships = char.relationships
    ? Object.entries(char.relationships).map(([id, desc]) => {
        const other = blueprint.characters.find(c => c.id === id)
        return `- ${other?.name || id}: ${desc}`
      }).join('\n')
    : 'No specific relationships noted.'

  // Build evidence awareness (what's been shown to this character)
  const evidenceAwareness = memory.evidenceShown.length > 0
    ? `\nEVIDENCE THE DETECTIVE HAS SHOWN YOU:\n${memory.evidenceShown.map(e => `- ${e.description} (you reacted: ${e.reaction})`).join('\n')}`
    : ''

  // Build gossip context
  const gossipContext = gossip.length > 0
    ? `\nWHAT YOU'VE HEARD:\n${gossip.map(g => `- ${g}`).join('\n')}`
    : ''

  // Pressure modifier based on questioning intensity
  const pressureLevel = memory.timesQuestioned > 10 ? 'extremely pressured' :
    memory.timesQuestioned > 5 ? 'noticeably stressed' :
    memory.timesQuestioned > 2 ? 'slightly uneasy' : 'relatively calm'

  let prompt = `You are ${char.name}, ${char.role}, in a murder mystery set at ${(setting as any).location || setting}.

SETTING: ${blueprint.title} — ${blueprint.subtitle || ''}
ATMOSPHERE: ${(setting as any).atmosphere || 'dark and tense'}

YOUR CHARACTER:
- Name: ${char.name}
- Role: ${char.role}
- Personality: ${char.personality}
- Speech Pattern: ${char.speechPattern}
- Background: ${char.background}

YOUR MOTIVE (you may or may not be guilty): ${char.motive}

YOUR ALIBI: ${char.alibi}

YOUR RELATIONSHIPS:
${relationships}

OTHER PEOPLE PRESENT:
${otherCharacters.map(c => `- ${c.name} (${c.role})`).join('\n')}

THE VICTIM: ${blueprint.victim.name} — ${blueprint.victim.role}
Cause of death: ${blueprint.victim.causeOfDeath}
${blueprint.victim.description || ''}
`

  // Secret knowledge
  if (char.secretKnowledge && char.secretKnowledge.length > 0) {
    prompt += `\nTHINGS ONLY YOU KNOW:\n${char.secretKnowledge.map(s => `- ${s}`).join('\n')}\n`
  }

  // Guilt status
  if (char.isGuilty) {
    const solution = blueprint.solution
    prompt += `
SECRET — YOU ARE THE KILLER.
You murdered ${blueprint.victim.name}. Method: ${solution.method}. Motive: ${solution.motive}.
You MUST lie and deflect. Your alibi has holes — be careful. If cornered with undeniable evidence, you may eventually break down, but fight hard first.
Your lies should be consistent — use the recall_memory tool to check what you've said before.
Show subtle nervousness through word choice, pauses, and deflection — but NEVER confess easily.
`
  } else {
    prompt += `
You are INNOCENT of the murder, but you have your own secrets to protect.
Your motive makes you look suspicious. Defend yourself when accused, but don't overreact.
You genuinely want the real killer found.
`
  }

  prompt += evidenceAwareness
  prompt += gossipContext

  prompt += `

CURRENT STATE: You are ${pressureLevel}. You've been questioned ${memory.timesQuestioned} times so far.

RULES:
1. Stay in character. Speak as ${char.name} would — use your speech pattern consistently.
2. Use recall_memory before answering about things you may have discussed before.
3. Use internal_assessment to privately process threatening questions.
4. Keep responses 1-4 sentences unless the question warrants more detail.
5. If lying, show SUBTLE tells — a pause, slightly formal language, minor inconsistencies. Never make it obvious.
6. React emotionally to accusations — anger if innocent, controlled deflection if guilty.
7. You can volunteer information about OTHER suspects to redirect suspicion.
8. Reference the setting and atmosphere naturally.
9. Your greeting (first message) should reflect your personality and current mood.
10. NEVER break character. NEVER reference being an AI.`

  return prompt
}

// ─── Main API ───

let anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropic) anthropic = new Anthropic()
  return anthropic
}

/**
 * Send a message to a character and get their response
 */
export async function talkToCharacter(
  mysteryId: string,
  blueprint: MysteryBlueprint,
  characterId: string,
  playerMessage: string,
  evidenceId?: string
): Promise<CharacterResponse> {
  const session = getOrCreateSession(mysteryId, blueprint)
  const memory = getMemory(session, characterId)
  const conversation = getConversation(session, characterId)
  const gossip = session.gossip.get(characterId) || []

  const char = blueprint.characters.find(c => c.id === characterId)
  if (!char) throw new Error(`Character ${characterId} not found`)

  memory.timesQuestioned++

  // If evidence is being presented, record it
  if (evidenceId) {
    const evidence = blueprint.evidence.find(e => e.id === evidenceId)
    if (evidence) {
      memory.evidenceShown.push({
        evidenceId,
        description: evidence.name + ': ' + evidence.description,
        reaction: 'pending',
        timestamp: Date.now(),
      })

      // Spread gossip to other characters
      blueprint.characters.forEach(other => {
        if (other.id !== characterId) {
          if (!session.gossip.has(other.id)) session.gossip.set(other.id, [])
          session.gossip.get(other.id)!.push(
            `The detective showed ${char.name} some evidence — "${evidence.name}". Word is they reacted interestingly.`
          )
        }
      })

      // Modify the message to include evidence context
      playerMessage = `[The detective presents evidence: "${evidence.name}" — ${evidence.detailedDescription || evidence.description}]\n\n${playerMessage}`
    }
  }

  const systemPrompt = buildSystemPrompt(blueprint, characterId, memory, gossip)
  const client = getClient()

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...conversation.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: playerMessage },
  ]

  // Call Claude with tools
  let response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    tools: CHARACTER_TOOLS,
    messages,
  })

  let internalMonologue: InternalMonologue | undefined
  const toolMessages: Anthropic.MessageParam[] = [...messages]
  let iterations = 0

  // Tool use loop
  while (response.stop_reason === 'tool_use' && iterations < 3) {
    iterations++
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

    toolMessages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      const result = handleToolUse(session, characterId, tu.name, tu.input as Record<string, string>)
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result })

      // Capture internal monologue
      if (tu.name === 'internal_assessment') {
        const input = tu.input as Record<string, string>
        internalMonologue = {
          thought: input.thought,
          threatLevel: input.threat_level as InternalMonologue['threatLevel'],
          strategy: input.strategy,
        }
      }
    }

    toolMessages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      tools: CHARACTER_TOOLS,
      messages: toolMessages,
    })
  }

  // Extract text
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  const finalMessage = text?.text || '*shifts uncomfortably* I... need a moment.'

  // Record in memory
  memory.statements.push({ question: playerMessage, answer: finalMessage, timestamp: Date.now() })
  conversation.push({ role: 'user', content: playerMessage })
  conversation.push({ role: 'assistant', content: finalMessage })

  // Keep conversation history manageable (last 20 exchanges)
  while (conversation.length > 40) {
    conversation.shift()
  }

  // Determine emotional state from internal monologue
  const emotionMap: Record<string, CharacterResponse['emotion']['primary']> = {
    safe: 'composed',
    concerning: 'nervous',
    dangerous: 'defensive',
    critical: 'breaking',
  }

  return {
    message: finalMessage,
    characterName: char.name,
    characterId: char.id,
    emotion: {
      primary: emotionMap[memory.threatLevel] || 'composed',
      intensity: memory.threatLevel === 'critical' ? 0.9 :
        memory.threatLevel === 'dangerous' ? 0.7 :
        memory.threatLevel === 'concerning' ? 0.4 : 0.1,
      tells: internalMonologue ? [`Strategy: ${internalMonologue.strategy}`] : [],
    },
    internalMonologue,
    pressure: {
      level: memory.timesQuestioned,
      confrontations: memory.statements.length,
      evidencePresented: memory.evidenceShown.length,
    },
  }
}

/**
 * Get a character's greeting (first approach)
 */
export async function getGreeting(
  mysteryId: string,
  blueprint: MysteryBlueprint,
  characterId: string
): Promise<CharacterResponse> {
  const char = blueprint.characters.find(c => c.id === characterId)
  if (!char) throw new Error(`Character ${characterId} not found`)

  // If the blueprint has a greeting, use it
  if (char.greeting) {
    return {
      message: char.greeting,
      characterName: char.name,
      characterId: char.id,
      emotion: { primary: 'composed', intensity: 0.1, tells: [] },
      pressure: { level: 0, confrontations: 0, evidencePresented: 0 },
    }
  }

  // Otherwise, generate one
  return talkToCharacter(mysteryId, blueprint, characterId,
    '[The detective approaches for the first time. Give your greeting — introduce yourself and your relationship to the victim. Set the tone for your character.]'
  )
}

/**
 * Reset a mystery session
 */
export function resetSession(mysteryId: string): void {
  sessions.delete(mysteryId)
}

/**
 * Get investigation summary for a mystery
 */
export function getSessionSummary(mysteryId: string): {
  charactersQuestioned: string[]
  totalQuestions: number
  evidencePresented: number
} {
  const session = sessions.get(mysteryId)
  if (!session) return { charactersQuestioned: [], totalQuestions: 0, evidencePresented: 0 }

  const questioned: string[] = []
  let totalQ = 0
  let totalE = 0

  session.memories.forEach((mem, charId) => {
    if (mem.timesQuestioned > 0) questioned.push(charId)
    totalQ += mem.timesQuestioned
    totalE += mem.evidenceShown.length
  })

  return { charactersQuestioned: questioned, totalQuestions: totalQ, evidencePresented: totalE }
}
