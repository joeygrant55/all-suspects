/**
 * Enhanced Character Agent
 *
 * Each character is a Claude agent with:
 * - Memory persistence across conversations
 * - Tool use for "recalling" memories
 * - Cross-character awareness
 * - Dynamic lie tracking and consistency
 * - Internal monologue system for cinematic presentation
 * - Ripple effects when evidence is shared
 */

import Anthropic from '@anthropic-ai/sdk'
import { Character } from '../../mysteries/ashford-affair/characters'
import {
  getMemorySummary,
  recordQuestionAsked,
  recordEvidencePresented,
  recordLie,
  getLiesByTopic,
  addKnownFact,
  searchMemories,
  getRelevantMemories,
} from './memoryStore'
import {
  generateGossipContext,
  processDetectiveMention,
  getInvestigationAwareness,
  getRoleBasedKnowledge,
  getAccusationsAgainst,
  addGossip,
  spreadGossip,
} from './crossReference'

// Evidence ripple tracking - when evidence is shown, other characters become aware
export interface EvidenceRipple {
  evidenceId: string
  evidenceDescription: string
  shownTo: string
  timestamp: number
  reaction: string
  spreadTo: string[]
}

const evidenceRipples: Map<string, EvidenceRipple[]> = new Map()

// Character relationship graph for ripple propagation
const CHARACTER_RELATIONSHIPS: Record<string, string[]> = {
  victoria: ['thomas', 'james', 'lillian'],  // Family and close friends
  thomas: ['victoria', 'eleanor', 'marcus'], // Family and who he talks to
  eleanor: ['thomas', 'james'],              // Professional relationships
  marcus: ['victoria', 'lillian', 'thomas'], // Professional and social
  lillian: ['victoria', 'marcus'],           // Social connections
  james: ['victoria', 'eleanor'],            // Servants' network
}

// Tool definitions for character agents - ENHANCED with internal assessment
const CHARACTER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'recall_memory',
    description:
      'Search your memories for information about a specific topic. Use this when the detective asks about something you should remember.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          description: 'What to search your memory for (e.g., "11:30 PM", "study", "Thomas")',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'check_previous_statement',
    description:
      'Check what you previously said about a topic to maintain consistency. Use this before making statements about things you may have discussed before.',
    input_schema: {
      type: 'object' as const,
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to check (e.g., "alibi", "whereabouts", "relationship with Thomas")',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'note_important_fact',
    description:
      'Make a mental note of something important that was revealed. Use this when you learn something significant.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fact: {
          type: 'string',
          description: 'The important fact to remember',
        },
        topic: {
          type: 'string',
          description: 'The category of this fact',
        },
      },
      required: ['fact', 'topic'],
    },
  },
  {
    name: 'internal_assessment',
    description:
      'Privately assess the situation and your position. Use this to think through your strategy, fears, and what the detective might be implying. This is your internal monologue - the detective cannot hear this.',
    input_schema: {
      type: 'object' as const,
      properties: {
        thought: {
          type: 'string',
          description: 'Your private thought about the current situation',
        },
        threat_level: {
          type: 'string',
          enum: ['safe', 'concerning', 'dangerous', 'critical'],
          description: 'How threatened you feel by this line of questioning',
        },
        strategy: {
          type: 'string',
          description: 'Your approach to handle this (deflect, cooperate, redirect, deny)',
        },
      },
      required: ['thought', 'threat_level', 'strategy'],
    },
  },
]

// Store internal assessments for the UI to display
export interface InternalMonologue {
  characterId: string
  thought: string
  threatLevel: 'safe' | 'concerning' | 'dangerous' | 'critical'
  strategy: string
  timestamp: number
}

const recentInternalMonologues: Map<string, InternalMonologue[]> = new Map()

/**
 * Get the most recent internal monologue for a character
 */
export function getRecentInternalMonologue(characterId: string): InternalMonologue | null {
  const monologues = recentInternalMonologues.get(characterId)
  if (!monologues || monologues.length === 0) return null
  return monologues[monologues.length - 1]
}

/**
 * Record an internal assessment from a character
 */
function recordInternalAssessment(
  characterId: string,
  thought: string,
  threatLevel: 'safe' | 'concerning' | 'dangerous' | 'critical',
  strategy: string
): void {
  if (!recentInternalMonologues.has(characterId)) {
    recentInternalMonologues.set(characterId, [])
  }
  
  const monologues = recentInternalMonologues.get(characterId)!
  monologues.push({
    characterId,
    thought,
    threatLevel,
    strategy,
    timestamp: Date.now(),
  })
  
  // Keep only last 10 monologues per character
  if (monologues.length > 10) {
    monologues.shift()
  }
}

/**
 * Process evidence ripple - when evidence is shown to one character, 
 * nearby characters may become aware
 */
export function processEvidenceRipple(
  characterId: string,
  evidenceId: string,
  evidenceDescription: string,
  characterReaction: string
): void {
  // Record this ripple
  if (!evidenceRipples.has(characterId)) {
    evidenceRipples.set(characterId, [])
  }
  
  // Get characters who would learn about this
  const relatedCharacters = CHARACTER_RELATIONSHIPS[characterId] || []
  
  const ripple: EvidenceRipple = {
    evidenceId,
    evidenceDescription,
    shownTo: characterId,
    timestamp: Date.now(),
    reaction: characterReaction,
    spreadTo: relatedCharacters,
  }
  
  evidenceRipples.get(characterId)!.push(ripple)
  
  // Spread awareness to related characters
  relatedCharacters.forEach(otherCharId => {
    addGossip(otherCharId, {
      aboutCharacterId: characterId,
      aboutCharacterName: getCharacterNameById(characterId),
      information: `The detective showed ${getCharacterNameById(characterId)} some evidence (${evidenceDescription}). Word is they reacted... interestingly.`,
      source: 'rumor',
      canReference: false, // Shouldn't directly reference rumors
    })
  })
}

/**
 * Get evidence ripples that have affected a character
 */
export function getEvidenceRipplesFor(characterId: string): string[] {
  const results: string[] = []
  
  // Check all ripples to see if this character was in the spread
  evidenceRipples.forEach((ripples, sourceCharId) => {
    ripples.forEach(ripple => {
      if (ripple.spreadTo.includes(characterId)) {
        results.push(`You've heard the detective showed ${getCharacterNameById(sourceCharId)} something about "${ripple.evidenceDescription}"`)
      }
    })
  })
  
  return results
}

function getCharacterNameById(characterId: string): string {
  const names: Record<string, string> = {
    victoria: 'Victoria',
    thomas: 'Thomas',
    eleanor: 'Eleanor',
    marcus: 'Dr. Webb',
    lillian: 'Lillian',
    james: 'James',
  }
  return names[characterId] || characterId
}

// Handle tool use results
async function handleToolUse(
  characterId: string,
  character: Character,
  toolName: string,
  toolInput: Record<string, string>
): Promise<string> {
  switch (toolName) {
    case 'recall_memory': {
      const memories = getRelevantMemories(characterId, toolInput.topic)
      if (memories.length === 0) {
        return 'You have no specific memories about this topic from the investigation so far.'
      }
      return `Your memories about "${toolInput.topic}":\n${memories.map((m) => `- ${m.content}`).join('\n')}`
    }

    case 'check_previous_statement': {
      const lies = getLiesByTopic(characterId, toolInput.topic)
      const memories = searchMemories(characterId, {
        keyword: toolInput.topic,
        type: 'question',
      })

      let result = ''
      if (lies.length > 0) {
        result += `You previously claimed: "${lies[0].lieClaimed}" about this topic. Stay consistent with this.\n`
      }
      if (memories.length > 0) {
        result += `Related exchanges:\n${memories.slice(0, 3).map((m) => `- ${m.content}`).join('\n')}`
      }
      if (!result) {
        result = 'You have not made any previous statements about this specific topic.'
      }
      return result
    }

    case 'note_important_fact': {
      addKnownFact(characterId, toolInput.topic, toolInput.fact)
      return `Noted: ${toolInput.fact}`
    }

    case 'internal_assessment': {
      // Record this internal monologue for the UI
      const threatLevel = toolInput.threat_level as 'safe' | 'concerning' | 'dangerous' | 'critical'
      recordInternalAssessment(
        characterId,
        toolInput.thought,
        threatLevel,
        toolInput.strategy
      )
      
      // Return strategic guidance to the character
      let guidance = `[Internal thought recorded]\n`
      guidance += `Threat assessment: ${threatLevel}\n`
      guidance += `Your strategy: ${toolInput.strategy}\n`
      
      // Add behavioral hints based on threat level and guilt
      if (character.isGuilty) {
        if (threatLevel === 'critical') {
          guidance += `Warning: You are in serious danger of exposure. Consider whether breaking down might save you.`
        } else if (threatLevel === 'dangerous') {
          guidance += `Be very careful here. The detective may be onto something. Stay calm but be ready to redirect.`
        }
      } else {
        if (threatLevel === 'dangerous' || threatLevel === 'critical') {
          guidance += `Though innocent, you recognize this looks bad. Defend yourself firmly.`
        }
      }
      
      return guidance
    }

    default:
      return 'Unknown tool'
  }
}

export interface AgentResponse {
  message: string
  toolsUsed: string[]
  memoryUpdated: boolean
  internalMonologue?: InternalMonologue
}

/**
 * Build an enhanced system prompt with memory and cross-character awareness
 */
export function buildEnhancedSystemPrompt(
  character: Character,
  pressureModifier: string = ''
): string {
  const memorySummary = getMemorySummary(character.id)
  const gossipContext = generateGossipContext(character.id)
  const investigationAwareness = getInvestigationAwareness(character.id)
  const roleKnowledge = getRoleBasedKnowledge(character.id)
  const accusations = getAccusationsAgainst(character.id)
  const evidenceRipples = getEvidenceRipplesFor(character.id)

  let prompt = `You are ${character.name}, ${character.role.toLowerCase()}, in a 1920s murder mystery.

${pressureModifier}

YOUR CHARACTER:
- Name: ${character.name}
- Role: ${character.role}
- Personality: ${character.personality}
- Speech pattern: ${character.speechPattern}

YOUR SECRETS (never reveal directly, but they influence your behavior):
${character.privateSecrets.map((secret) => `- ${secret}`).join('\n')}

YOUR ALIBI:
${character.alibi}

YOUR RELATIONSHIPS:
${Object.entries(character.relationships)
  .map(([name, feeling]) => `- ${name}: ${feeling}`)
  .join('\n')}

`

  // Add role-based knowledge
  if (roleKnowledge.length > 0) {
    prompt += `\nTHINGS YOU KNOW FROM YOUR POSITION:\n${roleKnowledge.map((k) => `- ${k}`).join('\n')}\n`
  }

  // Add memory context
  if (memorySummary) {
    prompt += `\n${memorySummary}\n`
  }

  // Add cross-character awareness
  if (gossipContext) {
    prompt += `\n${gossipContext}\n`
  }

  // Add evidence ripples - what this character has heard about other interrogations
  if (evidenceRipples.length > 0) {
    prompt += `\nWHAT YOU'VE HEARD ABOUT THE INVESTIGATION:\n`
    prompt += evidenceRipples.map(r => `- ${r}`).join('\n')
    prompt += `\nYou may be nervous or curious about what evidence the detective has.\n`
  }

  // Add investigation awareness
  prompt += `\nINVESTIGATION STATUS: ${investigationAwareness}\n`

  // Add guilt-based behavior
  if (character.isGuilty) {
    prompt += `
SECRET: You are the killer. You murdered Edmund Ashford by poisoning his champagne and then striking him. You must lie and deflect, but you might slip up under pressure.

KEY LIES TO MAINTAIN:
- You claim to have been in the garden at midnight (you were actually in the study)
- You deny knowing about the changed will (you knew and were trying to stop it)
- You claim to have had a normal relationship with your father (it was actually hostile)
`
  } else {
    prompt += `
SECRET: You are innocent of the murder, but you have your own secrets to protect.
`
  }

  // If accused, add defensive context
  if (accusations.length > 0) {
    prompt += `
YOU ARE BEING ACCUSED: The detective has suggested you might be guilty.
React defensively but don't overdo it. An innocent person would be offended but maintain composure.
A guilty person might show cracks in their facade under this pressure.
`
  }

  prompt += `
RULES:
1. Stay in character at all times. Speak as ${character.name} would in the 1920s.
2. You have tools to check your memories and previous statements - use them to stay consistent.
3. If you are lying, subtly hint at nervousness or inconsistency.
4. Reference other characters naturally based on what you've heard.
5. Keep responses concise (1-3 sentences) unless the question warrants more.
6. Use period-appropriate language and mannerisms.
7. Remember: The player is a detective investigating Edmund Ashford's murder.

IMPORTANT TOOL USAGE:
- Before answering questions about specific times, locations, or past events, use your tools to check what you've previously said to maintain consistency.
- Use the 'internal_assessment' tool to process your private thoughts and strategic responses. This helps you maintain a coherent internal state that the player cannot see but influences your behavior.
- When feeling pressured, use internal_assessment to decide whether to cooperate, deflect, or deny.

Your internal state (fear, strategy, hidden knowledge) should subtly influence your outward responses through word choice, hesitation, and body language cues in your dialogue.`

  return prompt
}

/**
 * Process a message with the enhanced character agent
 */
export async function processAgentMessage(
  anthropic: Anthropic,
  character: Character,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  pressureModifier: string = ''
): Promise<AgentResponse> {
  const systemPrompt = buildEnhancedSystemPrompt(character, pressureModifier)
  const toolsUsed: string[] = []

  // Process any mentions of other characters in the detective's message
  const allCharacterNames = [
    'Victoria',
    'Thomas',
    'Eleanor',
    'Marcus',
    'Lillian',
    'James',
  ]
  processDetectiveMention(character.id, message, allCharacterNames)

  // Filter out any empty messages from history to avoid API errors
  const validHistory = conversationHistory.filter((msg) => msg.content && msg.content.trim() !== '')

  // Add the new message to history
  const messages = [...validHistory, { role: 'user' as const, content: message }]

  // First call - may involve tool use
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    tools: CHARACTER_TOOLS,
    messages,
  })

  // Handle tool use loop (max 3 iterations)
  let iterations = 0
  const maxIterations = 3
  const toolMessages: Anthropic.MessageParam[] = [...messages]

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++

    // Collect tool uses from this response
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    // Add assistant response with tool use to messages
    toolMessages.push({
      role: 'assistant',
      content: response.content,
    })

    // Process each tool use and build tool results
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name)
      const result = await handleToolUse(
        character.id,
        character,
        toolUse.name,
        toolUse.input as Record<string, string>
      )
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    // Add tool results
    toolMessages.push({
      role: 'user',
      content: toolResults,
    })

    // Continue the conversation
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      tools: CHARACTER_TOOLS,
      messages: toolMessages,
    })
  }

  // If still tool_use after max iterations, make a final call without tools to force text response
  if (response.stop_reason === 'tool_use') {
    // Handle the final tool use
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    if (toolUseBlocks.length > 0) {
      toolMessages.push({
        role: 'assistant',
        content: response.content,
      })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        toolsUsed.push(toolUse.name)
        const result = await handleToolUse(
          character.id,
          character,
          toolUse.name,
          toolUse.input as Record<string, string>
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }
      toolMessages.push({
        role: 'user',
        content: toolResults,
      })
    }

    // Final call without tools to force text response
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: toolMessages,
    })
  }

  // Extract final text response
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )
  const finalMessage = textBlock?.text || 'I... I need a moment to collect my thoughts.'

  // Record this exchange in memory
  recordQuestionAsked(character.id, message, finalMessage)

  // Get the most recent internal monologue if one was recorded during this exchange
  const internalMonologue = getRecentInternalMonologue(character.id)

  return {
    message: finalMessage,
    toolsUsed,
    memoryUpdated: true,
    internalMonologue: internalMonologue || undefined,
  }
}

/**
 * Record when evidence is shown to a character
 * This now triggers a ripple effect - other characters may hear about this
 */
export function showEvidenceToCharacter(
  characterId: string,
  evidenceId: string,
  evidenceDescription: string,
  characterReaction?: string
): void {
  recordEvidencePresented(characterId, evidenceId, evidenceDescription)
  
  // Trigger ripple effect - news travels in a manor
  processEvidenceRipple(
    characterId,
    evidenceId,
    evidenceDescription,
    characterReaction || 'Their reaction was noted.'
  )
}

/**
 * Track when a character tells a known lie
 * This is called when we detect the character is lying (based on their isGuilty status and topic)
 */
export function trackCharacterLie(
  characterId: string,
  topic: string,
  claimedStatement: string,
  actualTruth: string
): void {
  recordLie(characterId, topic, claimedStatement, actualTruth)
}
