/**
 * Mystery Module - Procedural mystery generation for All Suspects
 *
 * This module provides:
 * - Mystery generation using Claude as the architect
 * - Type-safe mystery schemas
 * - Validation for consistency and solvability
 * - Template libraries for motives, methods, and alibis
 * - In-memory storage for active mysteries
 */

// Core generation
export { generateMystery } from './architectAgent'

// Schema types
export type {
  GeneratedMystery,
  Character,
  Evidence,
  TimelineEvent,
  Relationship,
  Secret,
  MotiveType,
  GenerationParams,
  MysteryPublicInfo,
  MysteryPlayerView
} from './mysterySchema'

// Validation
export {
  validateMystery,
  validateTimeline,
  validateSolvability,
  type ValidationResult
} from './validators'

// Storage
export {
  saveMystery,
  getCurrentMystery,
  getMysteryById,
  clearCurrentMystery,
  getMysteryHistory,
  getCharacterById,
  getKillerInfo,
  isKiller,
  getDiscoverableEvidence,
  getSolution,
  exportMystery,
  importMystery
} from './store'

// Templates (for reference/customization)
export {
  MOTIVE_TEMPLATES,
  getMotiveTemplates,
  getRandomMotive,
  getMotivesForTraits
} from './templates/motives'

export {
  METHOD_TEMPLATES,
  getMethodsByCategory,
  getMethodsForCharacter,
  getRandomMethod,
  getMethodsByDifficulty,
  getPoisons
} from './templates/methods'

export {
  ALIBI_TEMPLATES,
  getAlibisForRole,
  getVerifiableAlibis,
  getUnverifiableAlibis,
  getRandomAlibi,
  getAlibisByLocation,
  generateFlawedAlibi,
  generateSolidAlibi
} from './templates/alibis'
