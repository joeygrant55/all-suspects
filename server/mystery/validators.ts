/**
 * Mystery Validators - Ensures generated mysteries are logically consistent and solvable
 */

import { GeneratedMystery, Character, Evidence } from './mysterySchema'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateMystery(mystery: GeneratedMystery): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Must have victim
  if (!mystery.victim) {
    errors.push('Missing victim')
  } else {
    if (!mystery.victim.name) errors.push('Victim has no name')
    if (!mystery.victim.causeOfDeath) errors.push('Victim has no cause of death')
    if (!mystery.victim.secrets || mystery.victim.secrets.length === 0) {
      warnings.push('Victim has no secrets - may reduce motive variety')
    }
  }

  // 2. Must have killer in suspect list
  if (mystery.killer) {
    const killerInSuspects = mystery.suspects?.some(
      s => s.id === mystery.killer.characterId
    )
    if (!killerInSuspects) {
      errors.push('Killer not found in suspect list')
    }

    if (!mystery.killer.motive?.type) {
      errors.push('Killer has no motive type')
    }
    if (!mystery.killer.method?.weapon) {
      errors.push('Killer has no murder weapon/method')
    }
    if (!mystery.killer.method?.opportunity) {
      errors.push('Killer has no defined opportunity window')
    }
  } else {
    errors.push('No killer designated')
  }

  // 3. Check suspect count
  if (!mystery.suspects || mystery.suspects.length < 3) {
    errors.push('Need at least 3 suspects')
  } else if (mystery.suspects.length < 5) {
    warnings.push(`Only ${mystery.suspects.length} suspects - consider adding more for complexity`)
  }

  // 4. All suspects need alibis
  for (const suspect of mystery.suspects || []) {
    if (!suspect.alibi?.claimed) {
      errors.push(`Suspect ${suspect.name || suspect.id} has no claimed alibi`)
    }
    if (!suspect.alibi?.truth) {
      warnings.push(`Suspect ${suspect.name || suspect.id} has no truth for alibi - will default to claimed`)
    }
    if (!suspect.id) {
      errors.push(`Suspect missing ID: ${suspect.name}`)
    }
  }

  // 5. Killer alibi must have flaw (solvability check)
  if (mystery.killer) {
    const killer = mystery.suspects?.find(
      s => s.id === mystery.killer.characterId
    )
    if (killer) {
      if (!killer.alibi?.holes || killer.alibi.holes.length === 0) {
        errors.push("Killer's alibi has no detectable flaw - mystery is unsolvable")
      }
    }
  }

  // 6. Must have evidence
  if (!mystery.evidence || mystery.evidence.length < 3) {
    errors.push(`Insufficient evidence (need at least 3 pieces, have ${mystery.evidence?.length || 0})`)
  }

  // 7. At least one evidence piece must implicate killer
  if (mystery.killer && mystery.evidence) {
    const criticalEvidence = mystery.evidence.filter(e =>
      e.implications?.implicates?.includes(mystery.killer.characterId)
    )
    if (criticalEvidence.length === 0) {
      errors.push('No evidence points to killer - mystery is unsolvable')
    }
  }

  // 8. Check for red herrings (good mysteries have them)
  if (mystery.evidence && mystery.killer) {
    const redHerrings = mystery.evidence.filter(e =>
      e.implications?.implicates?.some(id => id !== mystery.killer.characterId)
    )
    if (redHerrings.length === 0) {
      warnings.push('No red herrings - mystery may be too easy')
    }
  }

  // 9. Timeline validation
  if (!mystery.timeline || mystery.timeline.length < 3) {
    warnings.push('Sparse timeline - consider adding more events for depth')
  } else {
    // Check timeline has murder window
    const hasMurderEvent = mystery.timeline.some(e =>
      e.description.toLowerCase().includes('murder') ||
      e.description.toLowerCase().includes('death') ||
      e.description.toLowerCase().includes('killed')
    )
    if (!hasMurderEvent) {
      warnings.push('Timeline does not explicitly mark murder event')
    }
  }

  // 10. Should have at least one witness
  const hasWitness = mystery.suspects?.some(s => s.knowledge?.sawSomething)
  if (!hasWitness) {
    warnings.push('No witnesses - may be too difficult to solve')
  }

  // 11. Check solution path exists
  if (!mystery.solution) {
    warnings.push('No solution path defined')
  } else {
    if (!mystery.solution.criticalEvidence || mystery.solution.criticalEvidence.length === 0) {
      warnings.push('No critical evidence identified in solution')
    }
    if (!mystery.solution.logicalChain || mystery.solution.logicalChain.length === 0) {
      warnings.push('No logical chain defined in solution')
    }
  }

  // 12. Check for duplicate IDs
  const suspectIds = mystery.suspects?.map(s => s.id) || []
  const evidenceIds = mystery.evidence?.map(e => e.id) || []

  if (new Set(suspectIds).size !== suspectIds.length) {
    errors.push('Duplicate suspect IDs detected')
  }
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    errors.push('Duplicate evidence IDs detected')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate timeline consistency - ensures no impossible events
 */
export function validateTimeline(mystery: GeneratedMystery): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!mystery.timeline || mystery.timeline.length === 0) {
    return { valid: true, errors: [], warnings: ['No timeline to validate'] }
  }

  // Parse times and sort
  const events = mystery.timeline.map((event, index) => ({
    ...event,
    index,
    minutes: parseTimeToMinutes(event.time)
  })).sort((a, b) => a.minutes - b.minutes)

  // Check for participant conflicts (same person in two places at once)
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i]
      const eventB = events[j]

      // If events overlap in time (within 5 minutes) and different locations
      if (Math.abs(eventA.minutes - eventB.minutes) < 5 && eventA.location !== eventB.location) {
        // Check for participant overlap
        const overlap = eventA.participants.filter(p => eventB.participants.includes(p))
        if (overlap.length > 0) {
          errors.push(
            `Timeline conflict: ${overlap.join(', ')} cannot be in "${eventA.location}" and "${eventB.location}" at ${eventA.time}`
          )
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Parse time string to minutes for comparison
 */
function parseTimeToMinutes(time: string): number {
  // Handle formats like "11:45 PM", "23:45", "11:45pm"
  const normalized = time.toUpperCase().replace(/\s+/g, '')

  let hours = 0
  let minutes = 0

  const match = normalized.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/)
  if (match) {
    hours = parseInt(match[1], 10)
    minutes = parseInt(match[2] || '0', 10)

    if (match[3] === 'PM' && hours !== 12) hours += 12
    if (match[3] === 'AM' && hours === 12) hours = 0
  }

  return hours * 60 + minutes
}

/**
 * Check if mystery is solvable through evidence chain
 */
export function validateSolvability(mystery: GeneratedMystery): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!mystery.killer || !mystery.evidence || !mystery.suspects) {
    return { valid: false, errors: ['Missing required data for solvability check'], warnings }
  }

  const killerId = mystery.killer.characterId

  // Find all evidence that implicates the killer
  const implicatingEvidence = mystery.evidence.filter(e =>
    e.implications?.implicates?.includes(killerId)
  )

  if (implicatingEvidence.length === 0) {
    errors.push('No evidence implicates the killer - unsolvable')
    return { valid: false, errors, warnings }
  }

  // Check if at least one piece is always discoverable
  const alwaysAvailable = implicatingEvidence.filter(e => e.discoveryCondition === 'always')
  if (alwaysAvailable.length === 0) {
    warnings.push('All killer-implicating evidence requires search or interrogation to find')
  }

  // Check killer's alibi has holes
  const killer = mystery.suspects.find(s => s.id === killerId)
  if (!killer?.alibi?.holes || killer.alibi.holes.length === 0) {
    errors.push("Killer's alibi has no holes - cannot be broken")
  }

  // Check if any witness saw something relevant
  const relevantWitnesses = mystery.suspects.filter(s =>
    s.knowledge?.sawSomething &&
    (s.knowledge.whatTheySaw?.includes(killer?.name || '') ||
     s.knowledge.whatTheySaw?.toLowerCase().includes('killer') ||
     s.knowledge.whatTheySaw?.toLowerCase().includes('suspicious'))
  )

  if (relevantWitnesses.length === 0 && implicatingEvidence.length < 2) {
    warnings.push('Limited evidence and no helpful witnesses - may be very difficult')
  }

  return { valid: errors.length === 0, errors, warnings }
}
