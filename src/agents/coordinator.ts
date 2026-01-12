/**
 * Coordinator Agent for All Suspects
 *
 * This module handles the orchestration of character agents and game state.
 * Currently uses simulated responses - will be replaced with real Agent SDK
 * calls when backend is implemented.
 *
 * Architecture:
 * - Coordinator manages overall game state
 * - Each character is a "subagent" with their own context
 * - MCP tools provide game state queries
 *
 * TODO: Implement backend API that uses Agent SDK
 * The frontend will call the backend, which runs the agents server-side
 * to protect the API key.
 */

import type { AgentResponse, CharacterProfile, ConversationContext, WorldState } from './types'
import { CHARACTERS, WORLD_STATE } from '../../mysteries/ashford-affair/characters'

class CoordinatorAgent {
  private _world: WorldState
  private characters: Map<string, CharacterProfile>
  private conversations: Map<string, ConversationContext>
  private statements: Array<{ characterId: string; statement: string; timestamp: number }>

  constructor() {
    this._world = WORLD_STATE
    this.characters = new Map(CHARACTERS.map((c) => [c.id, c]))
    this.conversations = new Map()
    this.statements = []
  }

  getWorld(): WorldState {
    return this._world
  }

  getCharacter(id: string): CharacterProfile | undefined {
    return this.characters.get(id)
  }

  getConversationContext(characterId: string): ConversationContext {
    if (!this.conversations.has(characterId)) {
      this.conversations.set(characterId, {
        characterId,
        previousStatements: [],
        playerQuestions: [],
        currentMood: 'calm',
      })
    }
    return this.conversations.get(characterId)!
  }

  logStatement(characterId: string, statement: string): void {
    this.statements.push({
      characterId,
      statement,
      timestamp: Date.now(),
    })

    const context = this.getConversationContext(characterId)
    context.previousStatements.push(statement)
  }

  /**
   * Generate a response from a character
   * This is where the Agent SDK will be integrated
   */
  async generateResponse(characterId: string, playerMessage: string): Promise<AgentResponse> {
    const character = this.getCharacter(characterId)
    if (!character) {
      throw new Error(`Character not found: ${characterId}`)
    }

    const context = this.getConversationContext(characterId)
    context.playerQuestions.push(playerMessage)

    // TODO: Replace with actual Agent SDK call
    // For now, generate contextual placeholder responses

    const response = this.generatePlaceholderResponse(character, playerMessage, context)

    // Log the statement
    this.logStatement(characterId, response.message)

    return response
  }

  private generatePlaceholderResponse(
    character: CharacterProfile,
    question: string,
    context: ConversationContext
  ): AgentResponse {
    const lowerQuestion = question.toLowerCase()

    // Check for specific trigger questions
    if (lowerQuestion.includes('where were you') || lowerQuestion.includes('alibi')) {
      return {
        message: this.formatResponse(character, character.alibi),
        mood: 'defensive',
        isLying: character.isGuilty,
      }
    }

    if (lowerQuestion.includes('relationship') || lowerQuestion.includes('feel about')) {
      // Find mentioned character
      const mentioned = Object.keys(character.relationships).find((name) =>
        lowerQuestion.includes(name)
      )
      if (mentioned) {
        return {
          message: this.formatResponse(character, character.relationships[mentioned]),
          mood: 'calm',
          isLying: false,
        }
      }
    }

    if (lowerQuestion.includes('secret') || lowerQuestion.includes('hiding')) {
      return {
        message: this.formatResponse(
          character,
          "I beg your pardon? I have nothing to hide. Perhaps you should be asking the others."
        ),
        mood: 'hostile',
        isLying: character.privateSecrets.length > 0,
      }
    }

    if (lowerQuestion.includes('study') || lowerQuestion.includes('body') || lowerQuestion.includes('murder')) {
      if (character.isGuilty) {
        return {
          message: this.formatResponse(
            character,
            "A terrible tragedy. I... I can't imagine who would do such a thing. Father and I had our differences, certainly, but..."
          ),
          mood: 'nervous',
          isLying: true,
        }
      }
      return {
        message: this.formatResponse(
          character,
          "Dreadful business. Edmund had his enemies, I suppose all powerful men do. But murder? In his own home?"
        ),
        mood: 'calm',
        isLying: false,
      }
    }

    // Default responses based on mood and character
    const defaultResponses = [
      "I'm not sure what you're implying, but I assure you I've told you everything I know.",
      "Perhaps you should speak to the others. I've been quite forthcoming.",
      "Is that really relevant to your investigation?",
      "I've answered enough questions. Unless you have something specific to ask?",
    ]

    return {
      message: this.formatResponse(
        character,
        defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
      ),
      mood: context.currentMood,
      isLying: false,
    }
  }

  private formatResponse(character: CharacterProfile, content: string): string {
    // Add character-specific speech patterns
    const prefix = this.getSpeechPrefix(character)
    return `${prefix}${content}`
  }

  private getSpeechPrefix(character: CharacterProfile): string {
    switch (character.id) {
      case 'victoria':
        return '"'
      case 'thomas':
        return '*nervously adjusts his collar* "'
      case 'eleanor':
        return '*choosing her words carefully* "'
      case 'marcus':
        return '*clearing his throat* "'
      case 'lillian':
        return '*with a wistful sigh* "'
      case 'james':
        return '*with quiet dignity* "'
      default:
        return '"'
    }
  }

  /**
   * Check for contradictions across all statements
   */
  findContradictions(): Array<{ char1: string; char2: string; topic: string }> {
    // TODO: Implement real contradiction detection
    // This would compare statements about the same topics
    return []
  }
}

// Singleton instance
export const coordinatorAgent = new CoordinatorAgent()
