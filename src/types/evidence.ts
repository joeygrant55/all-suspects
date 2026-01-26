export interface EvidenceData {
  id: string
  name: string
  description: string
  detailedDescription: string
  type: 'physical' | 'document' | 'testimony'
  relatedCharacter?: string
  prerequisite?: string // Evidence ID that must be found first
  hint?: string // Investigative hint for player guidance
  pointsTo?: string // Hidden field for suspicion tracking
}
