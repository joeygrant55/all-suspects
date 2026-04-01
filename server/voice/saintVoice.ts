import { getSaint, listSaints } from '../agents/saintRegistry.js'

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_flash_v2_5'
const DEFAULT_OUTPUT_FORMAT =
  process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || 'mp3_44100_128'
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || 'JBFqnCBsd6RMkjVDRZzb'
const MAX_TTS_CHARACTERS = 1800

interface VoiceSettings {
  stability: number
  similarityBoost: number
  style: number
  useSpeakerBoost: boolean
}

interface SaintVoicePreset {
  fallbackVoiceId: string
  label: string
  settings: VoiceSettings
}

interface ResolvedSaintVoice {
  saintId: string
  saintName: string
  voiceId: string
  voiceLabel: string
  modelId: string
  outputFormat: string
  settings: VoiceSettings
  source: 'saint-override' | 'default-override' | 'built-in'
}

export interface SaintVoiceStatus {
  provider: 'elevenlabs'
  configured: boolean
  modelId: string
  outputFormat: string
  message: string
  saints: Array<{
    saintId: string
    saintName: string
    voiceId: string
    voiceLabel: string
    source: ResolvedSaintVoice['source']
  }>
}

export interface SynthesizedSaintVoice {
  audio: Buffer
  contentType: string
  contentLength: number
  voice: Pick<ResolvedSaintVoice, 'saintId' | 'saintName' | 'voiceId' | 'voiceLabel'>
  truncated: boolean
}

export class SaintVoiceError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.name = 'SaintVoiceError'
    this.statusCode = statusCode
    this.code = code
  }
}

const SAINT_VOICE_PRESETS: Record<string, SaintVoicePreset> = {
  aquinas: {
    fallbackVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    label: 'George',
    settings: {
      stability: 0.72,
      similarityBoost: 0.78,
      style: 0.15,
      useSpeakerBoost: true,
    },
  },
  augustine: {
    fallbackVoiceId: 'pNInz6obpgDQGcFmaJgB',
    label: 'Adam',
    settings: {
      stability: 0.58,
      similarityBoost: 0.82,
      style: 0.3,
      useSpeakerBoost: true,
    },
  },
  therese: {
    fallbackVoiceId: '21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel',
    settings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.2,
      useSpeakerBoost: true,
    },
  },
  ignatius: {
    fallbackVoiceId: 'pNInz6obpgDQGcFmaJgB',
    label: 'Adam',
    settings: {
      stability: 0.68,
      similarityBoost: 0.8,
      style: 0.18,
      useSpeakerBoost: true,
    },
  },
  'francis-de-sales': {
    fallbackVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    label: 'George',
    settings: {
      stability: 0.66,
      similarityBoost: 0.78,
      style: 0.12,
      useSpeakerBoost: true,
    },
  },
}

function getVoiceOverrideKey(saintId: string): string {
  return `ELEVENLABS_VOICE_ID_${saintId.toUpperCase().replace(/-/g, '_')}`
}

function getElevenLabsApiKey(): string | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  return apiKey ? apiKey : null
}

function normalizeSpeechText(text: string): string {
  const normalized = text
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized.length <= MAX_TTS_CHARACTERS) {
    return normalized
  }

  const truncated = normalized.slice(0, MAX_TTS_CHARACTERS)
  const lastSentenceBreak = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('; ')
  )

  if (lastSentenceBreak > Math.floor(MAX_TTS_CHARACTERS * 0.6)) {
    return truncated.slice(0, lastSentenceBreak + 1).trim()
  }

  return truncated.trim()
}

function resolveSaintVoice(saintId: string): ResolvedSaintVoice {
  const saint = getSaint(saintId)

  if (!saint) {
    throw new SaintVoiceError(`Saint not found: ${saintId}`, 404, 'SAINT_NOT_FOUND')
  }

  const preset = SAINT_VOICE_PRESETS[saint.id] ?? {
    fallbackVoiceId: DEFAULT_VOICE_ID,
    label: 'George',
    settings: {
      stability: 0.65,
      similarityBoost: 0.8,
      style: 0.16,
      useSpeakerBoost: true,
    },
  }

  const saintOverride = process.env[getVoiceOverrideKey(saint.id)]?.trim()
  const defaultOverride = process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim()
  const voiceId = saintOverride || defaultOverride || preset.fallbackVoiceId
  const source = saintOverride
    ? 'saint-override'
    : defaultOverride
      ? 'default-override'
      : 'built-in'

  return {
    saintId: saint.id,
    saintName: saint.name,
    voiceId,
    voiceLabel: preset.label,
    modelId: DEFAULT_MODEL_ID,
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    settings: preset.settings,
    source,
  }
}

async function getUpstreamErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        detail?: { message?: string } | string
        message?: string
      }

      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim()
      }

      if (
        payload.detail &&
        typeof payload.detail === 'object' &&
        typeof payload.detail.message === 'string' &&
        payload.detail.message.trim()
      ) {
        return payload.detail.message.trim()
      }

      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim()
      }
    } catch {
      return `ElevenLabs returned HTTP ${response.status}`
    }
  }

  try {
    const text = (await response.text()).trim()
    return text ? text.slice(0, 240) : `ElevenLabs returned HTTP ${response.status}`
  } catch {
    return `ElevenLabs returned HTTP ${response.status}`
  }
}

export function getSaintVoiceStatus(): SaintVoiceStatus {
  const configured = Boolean(getElevenLabsApiKey())

  return {
    provider: 'elevenlabs',
    configured,
    modelId: DEFAULT_MODEL_ID,
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    message: configured
      ? 'ElevenLabs text-to-speech is available for saint replies.'
      : 'Set ELEVENLABS_API_KEY to enable saint voice playback.',
    saints: listSaints().map((saint) => {
      const voice = resolveSaintVoice(saint.id)

      return {
        saintId: saint.id,
        saintName: saint.name,
        voiceId: voice.voiceId,
        voiceLabel: voice.voiceLabel,
        source: voice.source,
      }
    }),
  }
}

export async function synthesizeSaintVoice(
  saintId: string,
  text: string
): Promise<SynthesizedSaintVoice> {
  const apiKey = getElevenLabsApiKey()

  if (!apiKey) {
    throw new SaintVoiceError(
      'ElevenLabs is not configured on this deployment.',
      503,
      'VOICE_NOT_CONFIGURED'
    )
  }

  const trimmedText = text.trim()
  if (!trimmedText) {
    throw new SaintVoiceError('Missing text to synthesize.', 400, 'VOICE_TEXT_REQUIRED')
  }

  const voice = resolveSaintVoice(saintId)
  const speechText = normalizeSpeechText(trimmedText)
  const url = new URL(`${ELEVENLABS_BASE_URL}/text-to-speech/${voice.voiceId}`)
  url.searchParams.set('output_format', voice.outputFormat)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: speechText,
      model_id: voice.modelId,
      voice_settings: {
        stability: voice.settings.stability,
        similarity_boost: voice.settings.similarityBoost,
        style: voice.settings.style,
        use_speaker_boost: voice.settings.useSpeakerBoost,
      },
    }),
  })

  if (!response.ok) {
    const message = await getUpstreamErrorMessage(response)
    throw new SaintVoiceError(message, 502, 'VOICE_UPSTREAM_ERROR')
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  return {
    audio: audioBuffer,
    contentType: response.headers.get('content-type') ?? 'audio/mpeg',
    contentLength: audioBuffer.length,
    voice: {
      saintId: voice.saintId,
      saintName: voice.saintName,
      voiceId: voice.voiceId,
      voiceLabel: voice.voiceLabel,
    },
    truncated: speechText.length < trimmedText.length,
  }
}
