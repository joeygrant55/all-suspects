import Anthropic from '@anthropic-ai/sdk'
import { getSaint } from './saintRegistry.js'
import * as memoryStore from './memoryStore.js'

const anthropic = new Anthropic()
const CHAT_CATEGORY = 'saint-chat'
const MAX_HISTORY_MESSAGES = 20

function getConversationHistory(sessionId: string): Anthropic.MessageParam[] {
  const sessionMemory = memoryStore.getCharacterMemory(sessionId)

  return sessionMemory.memories
    .filter((memory) => memory.category === CHAT_CATEGORY)
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((memory) => ({
      role: memory.type === 'question' ? 'user' : 'assistant',
      content: memory.content,
    }))
}

function storeConversationMessage(
  sessionId: string,
  saintId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  memoryStore.addMemory(
    sessionId,
    role === 'user' ? 'question' : 'statement',
    CHAT_CATEGORY,
    content,
    `Saint session for ${saintId}`,
    role === 'assistant' ? 'high' : 'medium'
  )
}

function getResponseText(response: Awaited<ReturnType<typeof anthropic.messages.create>>): string {
  if (!('content' in response)) {
    return ''
  }

  return response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()
}

export async function chat(
  saintId: string,
  message: string,
  sessionId: string
): Promise<string> {
  const normalizedSaintId = saintId.trim()
  const normalizedMessage = message.trim()
  const normalizedSessionId = sessionId.trim()

  if (!normalizedSaintId || !normalizedMessage || !normalizedSessionId) {
    throw new Error('Missing saintId, message, or sessionId')
  }

  const saint = getSaint(normalizedSaintId)
  if (!saint) {
    throw new Error(`Saint not found: ${normalizedSaintId}`)
  }

  const systemPrompt = [
    `You are ${saint.name}. Respond in character, drawing on your writings, theology, and life experience. Stay faithful to your actual teachings. Be warm but substantive.`,
    saint.content,
  ].join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    stream: false,
    system: systemPrompt,
    messages: [
      ...getConversationHistory(normalizedSessionId),
      { role: 'user', content: normalizedMessage },
    ],
  })

  const responseText = getResponseText(response)
  if (!responseText) {
    throw new Error('Anthropic returned an empty response')
  }

  storeConversationMessage(normalizedSessionId, saint.id, 'user', normalizedMessage)
  storeConversationMessage(normalizedSessionId, saint.id, 'assistant', responseText)

  return responseText
}
