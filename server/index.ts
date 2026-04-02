import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { chat, SaintChatError } from './agents/saintAgent.js'
import { askDirector } from './agents/orchestrator.js'
import { getSaint, listSaints } from './agents/saintRegistry.js'
import {
  SaintVoiceError,
  getSaintVoiceStatus,
  synthesizeSaintVoice,
} from './voice/saintVoice.js'
import {
  DEFAULT_INTERACTION_MODE,
  isSaintInteractionMode,
  type SaintInteractionMode,
} from './agents/studyMode.js'

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

app.get('/api/voice/status', (_req, res) => {
  res.json(getSaintVoiceStatus())
})

app.post('/api/voice', async (req, res) => {
  try {
    const { saintId, text } = req.body ?? {}

    if (typeof saintId !== 'string' || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing saintId or text',
        code: 'VOICE_REQUEST_INVALID',
      })
    }

    const audio = await synthesizeSaintVoice(saintId, text)

    res.setHeader('Content-Type', audio.contentType)
    res.setHeader('Content-Length', String(audio.contentLength))
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Voice-Saint', audio.voice.saintId)
    res.setHeader('X-Voice-Label', audio.voice.voiceLabel)
    res.setHeader('X-Voice-Truncated', audio.truncated ? 'true' : 'false')
    return res.send(audio.audio)
  } catch (error) {
    if (error instanceof SaintVoiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      })
    }

    console.error('Voice synthesis failed', error)
    return res.status(500).json({
      error: 'Failed to synthesize saint voice',
      code: 'VOICE_SYNTHESIS_FAILED',
    })
  }
})

app.post('/api/ask', async (req, res) => {
  try {
    const { message, sessionId, preferredSaint, mode, directorMode } = req.body ?? {}

    if (
      typeof message !== 'string' ||
      typeof sessionId !== 'string' ||
      !message.trim() ||
      !sessionId.trim()
    ) {
      return res.status(400).json({ error: 'Missing message or sessionId' })
    }

    if (preferredSaint !== undefined && typeof preferredSaint !== 'string') {
      return res.status(400).json({ error: 'preferredSaint must be a string' })
    }

    const interactionMode: SaintInteractionMode =
      isSaintInteractionMode(mode) ? mode : DEFAULT_INTERACTION_MODE
    const resolvedDirectorMode =
      directorMode === 'single' || directorMode === 'council'
        ? directorMode
        : mode === 'single' || mode === 'council'
          ? mode
          : undefined

    if (
      mode !== undefined &&
      !isSaintInteractionMode(mode) &&
      mode !== 'single' &&
      mode !== 'council'
    ) {
      return res
        .status(400)
        .json({ error: 'mode must be "counsel", "study", "single", or "council"' })
    }

    if (
      directorMode !== undefined &&
      directorMode !== 'single' &&
      directorMode !== 'council'
    ) {
      return res
        .status(400)
        .json({ error: 'directorMode must be either "single" or "council"' })
    }

    // Fast path: saint already selected — skip orchestrator entirely
    if (preferredSaint && resolvedDirectorMode !== 'council') {
      const saint = getSaint(preferredSaint)
      if (!saint) {
        return res.status(404).json({ error: `Saint not found: ${preferredSaint}` })
      }
      const response = await chat(preferredSaint, message, sessionId, {
        mode: interactionMode,
      })
      return res.json({
        mode: 'single',
        interactionMode,
        saints: [{ saintId: preferredSaint, name: saint.name, response }],
      })
    }

    const response = await askDirector(message, sessionId, {
      preferredSaint,
      directorMode: resolvedDirectorMode,
      interactionMode,
    })
    return res.json(response)
  } catch (error) {
    if (error instanceof SaintChatError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      })
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process director request'
    const statusCode = errorMessage.startsWith('Saint not found:') ? 404 : 500

    if (statusCode === 500) {
      console.error('Saint ask failed', error)
    }

    return res.status(statusCode).json({ error: errorMessage })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { saintId, message, sessionId, mode } = req.body ?? {}

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

    if (mode !== undefined && !isSaintInteractionMode(mode)) {
      return res.status(400).json({ error: 'mode must be either "counsel" or "study"' })
    }

    const interactionMode: SaintInteractionMode =
      isSaintInteractionMode(mode) ? mode : DEFAULT_INTERACTION_MODE
    const response = await chat(saintId, message, sessionId, { mode: interactionMode })
    return res.json({ response, interactionMode })
  } catch (error) {
    if (error instanceof SaintChatError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      })
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process saint chat'
    const statusCode = errorMessage.startsWith('Saint not found:') ? 404 : 500

    if (statusCode === 500) {
      console.error('Saint chat failed', error)
    }

    return res.status(statusCode).json({ error: errorMessage })
  }
})

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
