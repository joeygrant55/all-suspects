/**
 * MysteryBlueprint - The Universal Mystery Data Format
 * 
 * This is THE canonical format for all mysteries in All Suspects.
 * Both hardcoded mysteries and AI-generated mysteries produce this format.
 * The game engine consumes ONLY Blueprints.
 */

// ============================================================================
// TOP-LEVEL MYSTERY BLUEPRINT
// ============================================================================

export interface MysteryBlueprint {
  // Metadata
  id: string
  title: string
  subtitle: string
  difficulty: 'easy' | 'medium' | 'hard'
  era: string // e.g., '1920s', '1940s'
  setting: MysterySettings

  // Core Mystery Components
  victim: VictimBlueprint
  characters: CharacterBlueprint[]
  locations: LocationBlueprint[]
  evidence: EvidenceBlueprint[]
  timeline: TimelineEvent[]

  // Solution & Gameplay
  solution: SolutionBlueprint
  dialogueUnlocks: DialogueUnlockMap
  scoring: ScoringConfig
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface MysterySettings {
  location: string // e.g., "Ashford Manor"
  date: string // e.g., "December 31, 1929"
  event: string // e.g., "New Year's Eve Party"
  weather: string // e.g., "Heavy snowstorm, roads impassable"
  atmosphere: string // e.g., "Tense, claustrophobic, noir"
  publicKnowledge: string[] // Facts everyone knows at the start
}

// ============================================================================
// VICTIM
// ============================================================================

export interface VictimBlueprint {
  name: string
  role: string // e.g., "Family Patriarch", "Famous Director"
  personality: string
  causeOfDeath: string
  secrets: string[] // Dark secrets that motivated the murder
  lastSeen: {
    time: string
    location: string
    witness: string
  }
}

// ============================================================================
// CHARACTER BLUEPRINT
// Merges CharacterProfile + Character + greeting + systemPrompt
// ============================================================================

export interface CharacterBlueprint {
  // Identity
  id: string
  name: string
  role: string // e.g., "Wife of the deceased", "Butler"
  
  // Personality & Behavior
  personality: string // Detailed personality description
  speechPattern: string // How they speak, mannerisms
  
  // Initial Interaction
  greeting: string // The character's initial greeting when first approached
  systemPrompt?: string // AI behavior instructions for interrogation
  
  // Information
  publicInfo: string // What everyone knows about them
  privateSecrets: string[] // What they're hiding
  
  // Alibi
  alibi: {
    claimed: string // What they say they were doing
    truth: string // What they were actually doing
    holes: string[] // Weaknesses in their alibi
  }
  
  // Relationships
  relationships: Record<string, string> // characterId -> relationship description
  
  // Knowledge
  knowledge: {
    sawSomething: boolean
    whatTheySaw?: string
    whyTheyreHiding?: string
  }
  
  // Guilt
  isGuilty: boolean
  
  // Pressure/Interrogation Profile
  pressureProfile: {
    threshold: number // 1-100, how much pressure before they crack
    weaknesses: string[] // Topics that make them nervous
    telltales: string[] // Behaviors when lying (e.g., "avoids eye contact")
  }
  
  // Visual/Cinematic Style
  videoStyle: {
    cinematography: string // e.g., "Close-up, dramatic shadows"
    emotionalTone: string // e.g., "Defensive, calculating"
    visualMotifs: string[] // e.g., ["cigarette smoke", "pearl necklace"]
  }
}

// ============================================================================
// LOCATION BLUEPRINT
// ============================================================================

export interface LocationBlueprint {
  id: string // e.g., "study", "projection-room"
  name: string // Display name: "The Study"
  icon?: string // Icon identifier for UI
  description: string // Atmospheric description
  evidenceIds: string[] // Evidence that can be found here
  characterPresent?: string // Character ID if someone is stationed here
}

// ============================================================================
// EVIDENCE BLUEPRINT
// Merges EVIDENCE_DATABASE format + mysterySchema Evidence
// ============================================================================

export interface EvidenceBlueprint {
  // Identity
  id: string
  name: string
  type: 'testimony' | 'contradiction' | 'physical' | 'document'
  
  // Location
  location: string // Where it can be found (room ID or "conversation")
  
  // Description
  description: string // Short description
  detailedDescription: string // Full examination text
  
  // Discovery
  discoveryCondition: 'always' | 'room-search' | 'interrogation' | 'contradiction'
  requiredQuestions?: string[] // Questions needed to unlock (for interrogation evidence)
  
  // Forensics (for physical evidence)
  forensics?: {
    fingerprints?: string[] // Character IDs
    bloodType?: string
    timeIndicators?: string
    otherDetails?: Record<string, string>
  }
  
  // Implications
  implications: {
    implicates: string[] // Character IDs this evidence points to
    exonerates: string[] // Character IDs this evidence clears
    reveals: string // What secret/fact this reveals
  }
  
  // Gameplay Hints
  hint?: string // Subtle hint for the player
  relatedCharacter?: string // Primary character ID this relates to
  pointsTo?: string // Character ID this strongly implicates
  
  // Dialogue Unlocks
  dialogueUnlocks: DialogueUnlock[] // What questions this enables
}

export interface DialogueUnlock {
  characterId: string
  prompt: string // e.g., "Ask about the threatening letter"
}

// ============================================================================
// TIMELINE
// ============================================================================

export interface TimelineEvent {
  time: string // e.g., "11:30 PM"
  location: string
  participants: string[] // Character IDs
  description: string
  isPublicKnowledge: boolean
  witnesses: string[] // Character IDs who saw this
}

// ============================================================================
// SOLUTION
// ============================================================================

export interface SolutionBlueprint {
  killerId: string // Character ID of the guilty party
  
  motive: {
    type: 'greed' | 'revenge' | 'fear' | 'love' | 'power'
    description: string
    triggerEvent: string // What pushed them to murder
  }
  
  method: {
    weapon: string
    poison?: string
    opportunity: string
  }
  
  // How to solve it
  criticalEvidence: string[] // Evidence IDs essential to solving
  keyContradictions: string[] // Contradictions that expose the killer
  logicalChain: string[] // Step-by-step reasoning to solution
  
  // Red herrings
  redHerrings: string[] // Evidence/character IDs that mislead
}

// ============================================================================
// DIALOGUE UNLOCKS MAP
// ============================================================================

export type DialogueUnlockMap = Record<string, DialogueUnlock[]>

// ============================================================================
// SCORING
// ============================================================================

export interface ScoringConfig {
  parTime: number // Expected completion time in minutes
  maxScore: number // Maximum achievable score
  difficultyMultiplier: number // Score multiplier based on difficulty
  
  penalties: {
    wrongAccusation: number // Points lost for wrong guess
    excessiveTime: number // Points lost per minute over par
  }
  
  bonuses: {
    allEvidenceFound: number
    allContradictionsDiscovered: number
    underParTime: number
    firstAttemptCorrect: number
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type MotiveType = 'greed' | 'revenge' | 'fear' | 'love' | 'power'

export type EvidenceType = 'testimony' | 'contradiction' | 'physical' | 'document'

export type DiscoveryCondition = 'always' | 'room-search' | 'interrogation' | 'contradiction'

export type Difficulty = 'easy' | 'medium' | 'hard'
