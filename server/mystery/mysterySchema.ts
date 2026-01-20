/**
 * Mystery Schema - TypeScript interfaces for procedurally generated mysteries
 * Used by the Mystery Architect Agent to create unique playthrough experiences
 */

export interface GeneratedMystery {
  id: string
  seed: number
  difficulty: 'easy' | 'medium' | 'hard'

  setting: {
    location: string
    date: string
    event: string
  }

  victim: {
    id: string
    name: string
    role: string
    personality: string
    secrets: string[]
    relationships: Record<string, Relationship>
    lastKnownAlive: {
      time: string
      location: string
      witness: string
    }
    causeOfDeath: string
  }

  killer: {
    characterId: string
    motive: {
      type: MotiveType
      description: string
      triggerEvent: string
    }
    method: {
      weapon: string
      poison?: string
      opportunity: string
    }
    coverup: {
      alibi: string
      frameTarget?: string
      evidenceHidden: string[]
    }
  }

  suspects: Character[]
  evidence: Evidence[]
  timeline: TimelineEvent[]

  solution: {
    criticalEvidence: string[]
    keyContradictions: string[]
    logicalChain: string[]
  }
}

export type MotiveType = 'greed' | 'revenge' | 'fear' | 'love' | 'power'

export interface Character {
  id: string
  name: string
  role: string
  personality: string

  alibi: {
    claimed: string
    truth: string
    holes: string[]
  }

  secrets: Secret[]

  knowledge: {
    sawSomething: boolean
    whatTheySaw?: string
    whyTheyreHiding?: string
  }

  relationships: Record<string, Relationship>

  pressureProfile: {
    threshold: number
    weaknesses: string[]
    telltales: string[]
  }

  videoStyle: {
    cinematography: string
    emotionalTone: string
    visualMotifs: string[]
  }
}

export interface Evidence {
  id: string
  name: string
  location: string
  description: string

  forensics: {
    fingerprints?: string[]
    bloodType?: string
    timeIndicators?: string
  }

  implications: {
    implicates: string[]
    exonerates: string[]
    reveals: string
  }

  discoveryCondition: 'always' | 'search' | 'interrogation'
}

export interface TimelineEvent {
  time: string
  location: string
  participants: string[]
  description: string
  isPublicKnowledge: boolean
  witnesses: string[]
}

export interface Relationship {
  type: 'family' | 'romantic' | 'professional' | 'rival' | 'friend' | 'secret'
  description: string
  publicKnowledge: boolean
}

export interface Secret {
  content: string
  whoKnows: string[]
  evidence?: string
  blackmailable: boolean
}

// Generation parameters for API requests
export interface GenerationParams {
  difficulty?: 'easy' | 'medium' | 'hard'
  seed?: number
  setting?: {
    location?: string
    era?: string
  }
}

// API response types (spoiler-free for players)
export interface MysteryPublicInfo {
  id: string
  setting: GeneratedMystery['setting']
  victim: {
    name: string
    role: string
  }
  suspectCount: number
  evidenceCount: number
}

export interface MysteryPlayerView {
  id: string
  setting: GeneratedMystery['setting']
  victim: GeneratedMystery['victim']
  suspects: Array<{
    id: string
    name: string
    role: string
    personality: string
    videoStyle: Character['videoStyle']
  }>
}
