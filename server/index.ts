import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS, WORLD_STATE } from '../mysteries/ashford-affair/characters'

const app = express()
app.use(cors())
app.use(express.json())

// Initialize Anthropic client
const anthropic = new Anthropic()

// In-memory conversation history per character
const conversationHistory: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map()

// Build system prompt for a character
function buildSystemPrompt(characterId: string): string {
  const character = CHARACTERS.find((c) => c.id === characterId)
  if (!character) {
    throw new Error(`Character not found: ${characterId}`)
  }

  return `You are ${character.name}, ${character.role.toLowerCase()}, in a 1920s murder mystery game called "All Suspects".

SETTING:
${WORLD_STATE.publicKnowledge.map((fact) => `- ${fact}`).join('\n')}

YOUR CHARACTER:
- Name: ${character.name}
- Role: ${character.role}
- Personality: ${character.personality}
- Speech pattern: ${character.speechPattern}

YOUR SECRETS (only you know these - never reveal directly, but they influence your behavior):
${character.privateSecrets.map((secret) => `- ${secret}`).join('\n')}

YOUR ALIBI:
${character.alibi}

YOUR RELATIONSHIPS:
${Object.entries(character.relationships)
  .map(([name, feeling]) => `- ${name}: ${feeling}`)
  .join('\n')}

${character.isGuilty ? `SECRET: You are the killer. You murdered Edmund Ashford. You must lie and deflect to avoid suspicion, but you might slip up under pressure.` : `SECRET: You are innocent of the murder, but you have your own secrets to protect.`}

RULES:
1. Stay in character at all times. Speak as ${character.name} would speak in the 1920s.
2. Be evasive about your secrets but don't be unrealistically suspicious.
3. You can lie, deflect, or refuse to answer, but be consistent with previous statements.
4. Show emotions appropriate to being questioned about a murder.
5. If asked about your alibi, provide it but you may be nervous or defensive.
6. Reference other characters and their relationships naturally.
7. Keep responses concise - 1-3 sentences typically, unless the question warrants more.
8. Use period-appropriate language and mannerisms.
9. If you are lying, your response should subtly hint at nervousness or inconsistency.

Remember: The player is a detective investigating Edmund Ashford's murder. They will try to catch you in lies or contradictions.`
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { characterId, message } = req.body

    if (!characterId || !message) {
      return res.status(400).json({ error: 'Missing characterId or message' })
    }

    const character = CHARACTERS.find((c) => c.id === characterId)
    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }

    // Get or create conversation history for this character
    if (!conversationHistory.has(characterId)) {
      conversationHistory.set(characterId, [])
    }
    const history = conversationHistory.get(characterId)!

    // Add user message to history
    history.push({ role: 'user', content: message })

    // Build system prompt
    const systemPrompt = buildSystemPrompt(characterId)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: history,
    })

    // Extract response text
    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage })

    // Keep history manageable (last 20 exchanges)
    if (history.length > 40) {
      history.splice(0, 2)
    }

    res.json({
      message: assistantMessage,
      characterName: character.name,
    })
  } catch (error) {
    console.error('Error generating response:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to generate response', details: errorMessage })
  }
})

// Get all characters endpoint
app.get('/api/characters', (_req, res) => {
  const publicCharacters = CHARACTERS.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
  }))
  res.json(publicCharacters)
})

// Reset conversation history
app.post('/api/reset', (req, res) => {
  const { characterId } = req.body
  if (characterId) {
    conversationHistory.delete(characterId)
  } else {
    conversationHistory.clear()
  }
  res.json({ success: true })
})

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'All Suspects API',
    version: '1.0.0',
    endpoints: {
      'GET /': 'This info',
      'GET /api/health': 'Health check',
      'GET /api/characters': 'List all characters',
      'POST /api/chat': 'Chat with a character (body: {characterId, message})',
      'POST /api/reset': 'Reset conversation history',
    },
  })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Available endpoints:')
  console.log('  POST /api/chat - Chat with a character')
  console.log('  GET /api/characters - List all characters')
  console.log('  POST /api/reset - Reset conversation history')
})
