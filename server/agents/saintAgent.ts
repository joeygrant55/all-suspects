import Anthropic, { APIConnectionTimeoutError } from '@anthropic-ai/sdk'
import { getSaint } from './saintRegistry.js'
import * as memoryStore from './memoryStore.js'

const CHAT_CATEGORY = 'saint-chat'
const MAX_HISTORY_MESSAGES = 20

function getTimeoutMs(envKey: string, fallbackMs: number): number {
  const rawValue = process.env[envKey]?.trim()
  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackMs
}

const CHAT_TIMEOUT_MS = getTimeoutMs('SAINT_CHAT_TIMEOUT_MS', 40_000)
const anthropic = new Anthropic({
  maxRetries: 0,
  timeout: CHAT_TIMEOUT_MS,
})

export class SaintChatError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.name = 'SaintChatError'
    this.statusCode = statusCode
    this.code = code
  }
}

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

  let response: Awaited<ReturnType<typeof anthropic.messages.create>>

  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      stream: false,
      system: systemPrompt,
      messages: [
        ...getConversationHistory(normalizedSessionId),
        { role: 'user', content: normalizedMessage },
      ],
    })
  } catch (error) {
    if (error instanceof APIConnectionTimeoutError) {
      throw new SaintChatError(
        'The saint took too long to reply. Please try again.',
        504,
        'SAINT_CHAT_TIMEOUT'
      )
    }

    throw error
  }

  const responseText = getResponseText(response)
  if (!responseText) {
    throw new SaintChatError(
      'The saint returned an empty response. Please try again.',
      502,
      'SAINT_CHAT_EMPTY'
    )
  }

  storeConversationMessage(normalizedSessionId, saint.id, 'user', normalizedMessage)
  storeConversationMessage(normalizedSessionId, saint.id, 'assistant', responseText)

  return responseText
}
