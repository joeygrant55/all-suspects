/**
 * Enhanced Character Agent
 *
 * Each character is a Claude agent with:
 * - Memory persistence across conversations
 * - Tool use for "recalling" memories
 * - Cross-character awareness
 * - Dynamic lie tracking and consistency
 */

import Anthropic from '@anthropic-ai/sdk'
import { Character } from '../../mysteries/ashford-affair/characters'
import {
  getCharacterMemory,
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
} from './crossReference'

// Tool definitions for character agents
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
]

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

    default:
      return 'Unknown tool'
  }
}

export interface AgentResponse {
  message: string
  toolsUsed: string[]
  memoryUpdated: boolean
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

IMPORTANT: Before answering questions about specific times, locations, or past events, use your tools to check what you've previously said to maintain consistency.`

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

  return {
    message: finalMessage,
    toolsUsed,
    memoryUpdated: true,
  }
}

/**
 * Record when evidence is shown to a character
 */
export function showEvidenceToCharacter(
  characterId: string,
  evidenceId: string,
  evidenceDescription: string
): void {
  recordEvidencePresented(characterId, evidenceId, evidenceDescription)
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
