import type { Contradiction } from '../game/state'

const API_BASE = 'http://localhost:3001/api'

export interface PressureData {
  level: number
  confrontations: number
  evidencePresented: number
  contradictionsExposed: number
}

export interface ChatResponse {
  message: string
  characterName: string
  statementId?: string
  contradictions?: Contradiction[]
  pressure?: PressureData
}

export async function sendMessage(
  characterId: string,
  message: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId, message }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

export async function resetConversation(characterId?: string): Promise<void> {
  await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ characterId }),
  })
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}
