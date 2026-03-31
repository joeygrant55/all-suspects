import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { chat } from './agents/saintAgent.js'
import { getSaint, listSaints } from './agents/saintRegistry.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/saints', (_req, res) => {
  res.json(listSaints())
})

app.get('/api/saints/:id', (req, res) => {
  const saint = getSaint(req.params.id)

  if (!saint) {
    return res.status(404).json({ error: 'Saint not found' })
  }

  return res.json(saint)
})

app.post('/api/chat', async (req, res) => {
  try {
    const { saintId, message, sessionId } = req.body ?? {}

    if (
      typeof saintId !== 'string' ||
      typeof message !== 'string' ||
      typeof sessionId !== 'string' ||
      !saintId.trim() ||
      !message.trim() ||
      !sessionId.trim()
    ) {
      return res.status(400).json({ error: 'Missing saintId, message, or sessionId' })
    }

    const response = await chat(saintId, message, sessionId)
    return res.json({ response })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process saint chat'
    const statusCode = errorMessage.startsWith('Saint not found:') ? 404 : 500

    return res.status(statusCode).json({ error: errorMessage })
  }
})

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
