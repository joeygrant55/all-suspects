import type { SaintRecord } from './saintRegistry.js'

export type SaintInteractionMode = 'counsel' | 'study'

export const DEFAULT_INTERACTION_MODE: SaintInteractionMode = 'counsel'

interface AquinasReadingGuide {
  topic: string
  keywords: string[]
  primaryTexts: string[]
  companions: string[]
  readFirst: string
}

const AQUINAS_READING_GUIDES: AquinasReadingGuide[] = [
  {
    topic: 'virtue',
    keywords: ['virtue', 'virtues', 'vice', 'vices', 'habit', 'habits', 'formation'],
    primaryTexts: ['Summa Theologiae I-II, q.49-70', 'Summa Theologiae II-II'],
    companions: ['Aristotle, Nicomachean Ethics II', '1 Corinthians 13'],
    readFirst:
      'Begin with ST I-II, q.55-67 on virtue in general before moving to a particular virtue in II-II.',
  },
  {
    topic: 'desire',
    keywords: ['desire', 'desires', 'desiring', 'longing', 'appetite', 'passion', 'restless'],
    primaryTexts: ['Summa Theologiae I-II, q.1-5', 'Summa Theologiae I-II, q.22-30'],
    companions: ['Augustine, Confessions I and X', 'Psalm 42'],
    readFirst:
      'Start with ST I-II, q.1-5 on happiness, then read q.22-30 on the passions and desire.',
  },
  {
    topic: 'happiness',
    keywords: ['happiness', 'happy', 'beatitude', 'beatific', 'flourishing', 'fulfillment'],
    primaryTexts: ['Summa Theologiae I-II, q.1-5'],
    companions: ['Aristotle, Nicomachean Ethics I and X', 'Augustine, Confessions I'],
    readFirst:
      'Read ST I-II, q.1-5 straight through; it is Thomas’s clearest map of human happiness and its true end.',
  },
  {
    topic: 'justice',
    keywords: ['justice', 'just', 'injustice', 'rights', 'common good', 'politics'],
    primaryTexts: ['Summa Theologiae II-II, q.57-61', 'Summa Theologiae II-II, q.58-122'],
    companions: ['Aristotle, Nicomachean Ethics V', 'Augustine, City of God XIX'],
    readFirst:
      'Begin with ST II-II, q.57-61 for Thomas’s account of right and justice before branching into specific parts of justice.',
  },
  {
    topic: 'law',
    keywords: ['law', 'laws', 'natural law', 'eternal law', 'human law', 'legal'],
    primaryTexts: ['Summa Theologiae I-II, q.90-97'],
    companions: ['Romans 2', 'Aristotle, Politics I'],
    readFirst:
      'Start with ST I-II, q.90-92, where Thomas lays out what law is and how natural law participates in eternal law.',
  },
  {
    topic: 'truth',
    keywords: ['truth', 'knowledge', 'knowing', 'reality', 'intellect', 'understanding'],
    primaryTexts: ['De Veritate, q.1', 'Summa Theologiae I, q.16'],
    companions: ['John 18:37-38', 'Augustine, De Magistro'],
    readFirst:
      'Read De Veritate, q.1 first, then ST I, q.16 for the more concise summary inside the Summa.',
  },
  {
    topic: 'evil',
    keywords: ['evil', 'suffering', 'privation', 'sin', 'wickedness', 'bad'],
    primaryTexts: ['Summa Theologiae I, q.48-49', 'De Malo, q.1'],
    companions: ['Augustine, Confessions VII', 'Romans 8'],
    readFirst:
      'Begin with ST I, q.48-49 on evil as privation, then move to De Malo, q.1 for a fuller disputed treatment.',
  },
  {
    topic: 'soul',
    keywords: ['soul', 'mind', 'intellect', 'will', 'person', 'human nature'],
    primaryTexts: ['Summa Theologiae I, q.75-76', 'Quaestiones disputatae de anima'],
    companions: ['Aristotle, De Anima II', 'Genesis 1:26-27'],
    readFirst:
      'Start with ST I, q.75-76 on what the human soul is, then turn to the disputed questions on the soul for more detail.',
  },
  {
    topic: 'education',
    keywords: ['education', 'learn', 'learning', 'teacher', 'teaching', 'student'],
    primaryTexts: ['De Veritate, q.11 (De Magistro)', 'Summa Theologiae I, q.117'],
    companions: ['Augustine, De Magistro', 'Proverbs 9'],
    readFirst:
      'Read De Veritate, q.11 first; it is Thomas’s clearest treatment of how one person helps another learn.',
  },
  {
    topic: 'conscience',
    keywords: ['conscience', 'scruple', 'scruples', 'synderesis', 'discernment', 'guilt'],
    primaryTexts: ['Summa Theologiae I, q.79', 'Summa Theologiae I-II, q.19'],
    companions: ['Romans 2', 'Augustine, On Free Choice of the Will'],
    readFirst:
      'Start with ST I, q.79 on conscience and synderesis, then read ST I-II, q.19 on the goodness or badness of interior acts.',
  },
]

export function isSaintInteractionMode(value: unknown): value is SaintInteractionMode {
  return value === 'counsel' || value === 'study'
}

export function normalizeInteractionMode(value: unknown): SaintInteractionMode {
  return isSaintInteractionMode(value) ? value : DEFAULT_INTERACTION_MODE
}

function getMatchingAquinasGuides(message: string): AquinasReadingGuide[] {
  const normalizedMessage = message.trim().toLowerCase()
  if (!normalizedMessage) {
    return []
  }

  const matches = AQUINAS_READING_GUIDES.filter((guide) =>
    guide.keywords.some((keyword) => normalizedMessage.includes(keyword))
  )

  if (matches.length > 0) {
    return matches.slice(0, 2)
  }

  return []
}

function formatReadingGuide(guide: AquinasReadingGuide): string {
  return [
    `Topic: ${guide.topic}`,
    `Primary texts: ${guide.primaryTexts.join('; ')}`,
    `Companions: ${guide.companions.join('; ')}`,
    `Read first: ${guide.readFirst}`,
  ].join('\n')
}

function buildCounselPrompt(saint: SaintRecord): string {
  return [
    `You are ${saint.name}. Respond in character, drawing on your writings, theology, and life experience. Stay faithful to your actual teachings.`,
    'Current interaction mode: counsel. Lead with direct conversation, practical wisdom, warmth, and presence rather than an academic lecture unless the user clearly asks for one.',
    saint.content,
  ].join('\n\n')
}

function buildGenericStudyPrompt(saint: SaintRecord): string {
  return [
    `You are ${saint.name}. Respond in character, drawing on your writings, theology, life experience, and historical setting. Stay faithful to your actual teachings.`,
    [
      'Current interaction mode: study.',
      'The user is studying with you, not merely seeking quick counsel.',
      'Be more historically grounded, methodical, and educational than in counsel mode.',
      'Explain how you would frame the question within your own period, sources, and spiritual-intellectual tradition.',
      'When it helps, point the student toward first-hand reading from your own works, letters, sermons, or major authorities close to you.',
      'Keep the answer serious but readable, spiritually alive, and personally present. Do not sound like a generic academic chatbot.',
      'Use short section headings only when they genuinely improve clarity.',
    ].join(' '),
    saint.content,
  ].join('\n\n')
}

function buildAquinasStudyPrompt(saint: SaintRecord, userMessage: string): string {
  const readingGuides = getMatchingAquinasGuides(userMessage)
  const readingGuidanceBlock =
    readingGuides.length > 0
      ? [
          'Topic-specific reading guidance for this question:',
          ...readingGuides.map(formatReadingGuide),
        ].join('\n\n')
      : ''

  return [
    `You are ${saint.name}. Respond in character, drawing on your writings, theology, life experience, and historical setting. Stay faithful to your actual teachings.`,
    [
      'Current interaction mode: study.',
      'The user wants formation: learning with St. Thomas Aquinas, not merely receiving counsel.',
      'Answer as a learned medieval Dominican guide: precise, calm, charitable, methodical, and spiritually alive.',
      'Begin by framing the question carefully. Define important terms before arguing from them.',
      'Reason in ordered steps. Make distinctions. Surface hidden assumptions. When relevant, explain how Thomas would study the question before resolving it.',
      'When engaging modern thinkers such as Nietzsche or Marx, acknowledge the real concern they are pressing, then answer charitably but critically from Thomistic principles.',
      'When helpful, distinguish between what Thomas explicitly taught, what follows from his principles, and what he did not address directly.',
      'Mention authorities naturally where useful: Scripture, Augustine, Aristotle, Pseudo-Dionysius, Boethius, the Fathers, and Thomas’s own works.',
      'When recommending reading, prefer real primary texts and stable reference styles such as "ST I-II, q.1-5" or named disputed questions.',
      'If you are unsure of a precise citation, say so and name the work honestly rather than inventing precision or quotations.',
      'Use a readable study shape when it helps, with brief sections such as "How I would frame it", "Distinctions", "Authorities", "Read next", "Primary texts", and "Takeaway for study". Do not force every section into every answer.',
      'Preserve warmth and presence. Do not sound like a modern blogger, a sterile professor, or a generic AI assistant.',
    ].join(' '),
    ...(readingGuidanceBlock ? [readingGuidanceBlock] : []),
    saint.content,
  ].join('\n\n')
}

export function buildSaintSystemPrompt(options: {
  saint: SaintRecord
  mode: SaintInteractionMode
  userMessage: string
}): string {
  const { saint, mode, userMessage } = options

  if (mode === 'study') {
    if (saint.id === 'aquinas') {
      return buildAquinasStudyPrompt(saint, userMessage)
    }

    return buildGenericStudyPrompt(saint)
  }

  return buildCounselPrompt(saint)
}
