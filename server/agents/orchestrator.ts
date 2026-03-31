import Anthropic from '@anthropic-ai/sdk'
import { chat } from './saintAgent.js'
import {
  getSaint,
  getSaintsByTopic,
  listSaints,
  type SaintSummary,
} from './saintRegistry.js'

const anthropic = new Anthropic()
const DIRECTOR_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_COUNCIL_SIZE = 3
const MAX_TOPIC_COUNT = 6
const DIRECTOR_SESSION_PREFIX = 'director'

export interface DirectorResponse {
  mode: 'single' | 'council'
  saints: Array<{ saintId: string; name: string; response: string }>
  scripture?: { reference: string; text: string }
}

interface DirectorOptions {
  preferredSaint?: string
  mode?: 'single' | 'council'
}

interface RoutingAnalysis {
  mode: 'single' | 'council'
  topics: string[]
  saintIds: string[]
}

interface ScriptureAnalysis {
  include: boolean
  reference: string
  text: string
}

const TOPIC_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'being',
  'could',
  'faith',
  'from',
  'have',
  'into',
  'just',
  'more',
  'need',
  'pray',
  'prayer',
  'saint',
  'should',
  'that',
  'their',
  'them',
  'there',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
])

function getResponseText(
  response: Awaited<ReturnType<typeof anthropic.messages.create>>
): string {
  if (!('content' in response)) {
    return ''
  }

  return response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()
}

function parseJson<T>(value: string): T | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const candidates = [
    trimmedValue,
    trimmedValue.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? '',
  ].filter(Boolean)

  const objectStartIndex = trimmedValue.indexOf('{')
  const objectEndIndex = trimmedValue.lastIndexOf('}')
  if (objectStartIndex !== -1 && objectEndIndex > objectStartIndex) {
    candidates.push(trimmedValue.slice(objectStartIndex, objectEndIndex + 1))
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      continue
    }
  }

  return null
}

function normalizeStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ).slice(0, maxItems)
}

function extractFallbackTopics(message: string): string[] {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 4 &&
            !TOPIC_STOP_WORDS.has(token) &&
            Number.isNaN(Number(token))
        )
    )
  ).slice(0, MAX_TOPIC_COUNT)
}

function buildSaintRoster(saints: SaintSummary[]): string {
  return saints
    .map((saint) => {
      const parts = [
        `${saint.id}: ${saint.name}`,
        saint.topics.length > 0 ? `topics: ${saint.topics.join(', ')}` : '',
        saint.patronage.length > 0 ? `patronage: ${saint.patronage.join(', ')}` : '',
        saint.titles.length > 0 ? `titles: ${saint.titles.join(', ')}` : '',
      ].filter(Boolean)

      return `- ${parts.join(' | ')}`
    })
    .join('\n')
}

async function analyzeRouting(
  message: string,
  saints: SaintSummary[],
  requestedMode?: 'single' | 'council'
): Promise<RoutingAnalysis> {
  const fallback: RoutingAnalysis = {
    mode: requestedMode ?? 'single',
    topics: extractFallbackTopics(message),
    saintIds: [],
  }

  if (saints.length === 0) {
    return fallback
  }

  try {
    const response = await anthropic.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 512,
      system: [
        'You are the Spiritual Director for a Catholic saint chat system.',
        'Choose which saints should answer a user question.',
        'Return only JSON with the shape {"mode":"single"|"council","topics":["topic"],"saintIds":["saint-id"]}.',
        'Use "council" when the question clearly spans multiple domains or would benefit from multiple complementary saints.',
        'Never include saintIds that are not in the roster.',
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: [
            `Requested mode: ${requestedMode ?? 'auto'}`,
            'Available saints:',
            buildSaintRoster(saints),
            '',
            `User question: ${message}`,
          ].join('\n'),
        },
      ],
    })

    const parsed = parseJson<Partial<RoutingAnalysis>>(getResponseText(response))
    const availableSaintIds = new Set(saints.map((saint) => saint.id))
    const saintIds = normalizeStringList(parsed?.saintIds, MAX_COUNCIL_SIZE).filter((id) =>
      availableSaintIds.has(id)
    )
    const topics = normalizeStringList(parsed?.topics, MAX_TOPIC_COUNT)
    const mode =
      requestedMode === 'council' || parsed?.mode === 'council' ? 'council' : 'single'

    return {
      mode,
      topics: topics.length > 0 ? topics : fallback.topics,
      saintIds,
    }
  } catch {
    return fallback
  }
}

function selectSaints(
  availableSaints: SaintSummary[],
  analysis: RoutingAnalysis,
  requestedMode?: 'single' | 'council'
): SaintSummary[] {
  if (availableSaints.length <= 1) {
    return availableSaints.slice(0, 1)
  }

  const saintMap = new Map(
    availableSaints.map((saint) => [
      saint.id,
      {
        saint,
        score: 0,
        priority: Number.MAX_SAFE_INTEGER,
      },
    ])
  )

  analysis.saintIds.forEach((saintId, index) => {
    const entry = saintMap.get(saintId)
    if (!entry) {
      return
    }

    entry.score += 100 - index
    entry.priority = Math.min(entry.priority, index)
  })

  analysis.topics.forEach((topic) => {
    getSaintsByTopic(topic).forEach((saint) => {
      const entry = saintMap.get(saint.id)
      if (!entry) {
        return
      }

      entry.score += 10
    })
  })

  const rankedSaints = Array.from(saintMap.values()).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    if (left.priority !== right.priority) {
      return left.priority - right.priority
    }

    return left.saint.name.localeCompare(right.saint.name)
  })

  const positivelyMatchedSaints = rankedSaints
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.saint)
  const wantsCouncil = requestedMode === 'council' || analysis.mode === 'council'

  if (!wantsCouncil) {
    return [positivelyMatchedSaints[0] ?? rankedSaints[0].saint]
  }

  const desiredCount =
    availableSaints.length >= 3 && positivelyMatchedSaints.length >= 3 ? 3 : 2
  const selectedSaints = positivelyMatchedSaints.slice(0, desiredCount)

  for (const entry of rankedSaints) {
    if (selectedSaints.some((saint) => saint.id === entry.saint.id)) {
      continue
    }

    selectedSaints.push(entry.saint)
    if (selectedSaints.length >= Math.min(desiredCount, MAX_COUNCIL_SIZE)) {
      break
    }
  }

  return selectedSaints.slice(0, Math.min(desiredCount, MAX_COUNCIL_SIZE))
}

function buildSaintSessionId(sessionId: string, saintId: string): string {
  // Keep each saint's history isolated so council mode does not cross-contaminate context.
  return `${DIRECTOR_SESSION_PREFIX}:${sessionId}:${saintId}`
}

async function selectScripture(
  message: string,
  saints: DirectorResponse['saints']
): Promise<DirectorResponse['scripture'] | undefined> {
  try {
    const response = await anthropic.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 384,
      system: [
        'You add a single Scripture citation when it would materially help a spiritual response.',
        'Return only JSON with the shape {"include":boolean,"reference":"Book X:Y-Z","text":"brief paraphrase"}.',
        'If no citation is clearly helpful, return {"include":false,"reference":"","text":""}.',
        'Use a real biblical reference and write the text as a short paraphrase, not a direct modern translation quote.',
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: [
            `User question: ${message}`,
            'Saint responses:',
            ...saints.map(
              (saint) =>
                `- ${saint.name}: ${saint.response.slice(0, 600).replace(/\s+/g, ' ')}`
            ),
          ].join('\n'),
        },
      ],
    })

    const parsed = parseJson<Partial<ScriptureAnalysis>>(getResponseText(response))
    if (!parsed?.include) {
      return undefined
    }

    const reference =
      typeof parsed.reference === 'string' ? parsed.reference.trim() : ''
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''

    if (!reference || !text) {
      return undefined
    }

    return { reference, text }
  } catch {
    return undefined
  }
}

export async function askDirector(
  message: string,
  sessionId: string,
  options?: DirectorOptions
): Promise<DirectorResponse> {
  const normalizedMessage = message.trim()
  const normalizedSessionId = sessionId.trim()

  if (!normalizedMessage || !normalizedSessionId) {
    throw new Error('Missing message or sessionId')
  }

  const saints = listSaints()
  if (saints.length === 0) {
    throw new Error('No saints are available')
  }

  if (options?.preferredSaint) {
    const preferredSaint = getSaint(options.preferredSaint)
    if (!preferredSaint) {
      throw new Error(`Saint not found: ${options.preferredSaint.trim()}`)
    }

    const response = await chat(
      preferredSaint.id,
      normalizedMessage,
      buildSaintSessionId(normalizedSessionId, preferredSaint.id)
    )
    const saintResponses: DirectorResponse['saints'] = [
      {
        saintId: preferredSaint.id,
        name: preferredSaint.name,
        response,
      },
    ]
    const scripture = await selectScripture(normalizedMessage, saintResponses)

    return {
      mode: 'single',
      saints: saintResponses,
      ...(scripture ? { scripture } : {}),
    }
  }

  const onlySaint = saints.length === 1 ? saints[0] : null
  const selectedSaints = onlySaint
    ? [onlySaint]
    : selectSaints(
        saints,
        await analyzeRouting(normalizedMessage, saints, options?.mode),
        options?.mode
      )

  const saintResponses: DirectorResponse['saints'] = []
  for (const saint of selectedSaints) {
    const response = await chat(
      saint.id,
      normalizedMessage,
      buildSaintSessionId(normalizedSessionId, saint.id)
    )

    saintResponses.push({
      saintId: saint.id,
      name: saint.name,
      response,
    })
  }

  const scripture = await selectScripture(normalizedMessage, saintResponses)

  return {
    mode: saintResponses.length > 1 ? 'council' : 'single',
    saints: saintResponses,
    ...(scripture ? { scripture } : {}),
  }
}
