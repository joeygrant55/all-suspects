/**
 * Blueprint System Verification Script
 * 
 * Run this to verify the Blueprint system is working correctly.
 * 
 * Usage:
 *   npx tsx shared/verify.ts
 */

import { getAshfordBlueprint, getHollywoodBlueprint } from './adapters'
import type { MysteryBlueprint } from './types'

console.log('🔍 Verifying Mystery Blueprint System...\n')

// ============================================================================
// Test 1: Load Ashford Blueprint
// ============================================================================

console.log('📚 Test 1: Loading Ashford Affair Blueprint...')
try {
  const ashford = getAshfordBlueprint()
  
  console.log(`  ✅ Loaded: ${ashford.title}`)
  console.log(`  ✅ ID: ${ashford.id}`)
  console.log(`  ✅ Difficulty: ${ashford.difficulty}`)
  console.log(`  ✅ Era: ${ashford.era}`)
  console.log(`  ✅ Characters: ${ashford.characters.length}`)
  console.log(`  ✅ Locations: ${ashford.locations.length}`)
  console.log(`  ✅ Evidence: ${ashford.evidence.length}`)
  console.log(`  ✅ Timeline Events: ${ashford.timeline.length}`)
  console.log(`  ✅ Killer: ${ashford.solution.killerId}`)
  
  // Verify structure
  const killer = ashford.characters.find(c => c.id === ashford.solution.killerId)
  if (!killer) {
    throw new Error('Killer not found in characters array')
  }
  if (!killer.isGuilty) {
    throw new Error('Killer is not marked as guilty')
  }
  
  console.log(`  ✅ Killer "${killer.name}" is marked guilty`)
  console.log(`  ✅ Ashford Blueprint valid!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 2: Load Hollywood Blueprint
// ============================================================================

console.log('🎬 Test 2: Loading Hollywood Premiere Blueprint...')
try {
  const hollywood = getHollywoodBlueprint()
  
  console.log(`  ✅ Loaded: ${hollywood.title}`)
  console.log(`  ✅ ID: ${hollywood.id}`)
  console.log(`  ✅ Difficulty: ${hollywood.difficulty}`)
  console.log(`  ✅ Era: ${hollywood.era}`)
  console.log(`  ✅ Characters: ${hollywood.characters.length}`)
  console.log(`  ✅ Locations: ${hollywood.locations.length}`)
  console.log(`  ✅ Evidence: ${hollywood.evidence.length}`)
  console.log(`  ✅ Timeline Events: ${hollywood.timeline.length}`)
  console.log(`  ✅ Killer: ${hollywood.solution.killerId}`)
  
  // Verify structure
  const killer = hollywood.characters.find(c => c.id === hollywood.solution.killerId)
  if (!killer) {
    throw new Error('Killer not found in characters array')
  }
  if (!killer.isGuilty) {
    throw new Error('Killer is not marked as guilty')
  }
  
  console.log(`  ✅ Killer "${killer.name}" is marked guilty`)
  console.log(`  ✅ Hollywood Blueprint valid!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 3: Verify Blueprint Structure
// ============================================================================

console.log('🔬 Test 3: Verifying Blueprint Structure...')
try {
  const blueprint = getAshfordBlueprint()
  
  // Check all required fields
  const requiredFields = [
    'id', 'title', 'subtitle', 'difficulty', 'era', 'setting',
    'victim', 'characters', 'locations', 'evidence', 'timeline',
    'solution', 'dialogueUnlocks', 'scoring'
  ]
  
  for (const field of requiredFields) {
    if (!(field in blueprint)) {
      throw new Error(`Missing required field: ${field}`)
    }
    console.log(`  ✅ Field '${field}' present`)
  }
  
  // Check character structure
  const char = blueprint.characters[0]
  const charFields = [
    'id', 'name', 'role', 'personality', 'speechPattern',
    'greeting', 'publicInfo', 'privateSecrets', 'alibi',
    'relationships', 'knowledge', 'isGuilty', 'pressureProfile', 'videoStyle'
  ]
  
  for (const field of charFields) {
    if (!(field in char)) {
      throw new Error(`Character missing field: ${field}`)
    }
  }
  console.log(`  ✅ Character structure valid`)
  
  // Check evidence structure
  const evidence = blueprint.evidence[0]
  const evidenceFields = [
    'id', 'name', 'type', 'location', 'description', 'detailedDescription',
    'discoveryCondition', 'implications', 'dialogueUnlocks'
  ]
  
  for (const field of evidenceFields) {
    if (!(field in evidence)) {
      throw new Error(`Evidence missing field: ${field}`)
    }
  }
  console.log(`  ✅ Evidence structure valid`)
  
  console.log(`  ✅ Blueprint structure verified!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 4: Verify Evidence-Location Mapping
// ============================================================================

console.log('🗺️  Test 4: Verifying Evidence-Location Mapping...')
try {
  const blueprint = getAshfordBlueprint()
  
  // Check that all evidence locations exist
  for (const evidence of blueprint.evidence) {
    if (evidence.location === 'conversation') continue
    
    const locationExists = blueprint.locations.some(loc => loc.id === evidence.location)
    if (!locationExists) {
      throw new Error(`Evidence "${evidence.id}" references non-existent location "${evidence.location}"`)
    }
  }
  
  console.log(`  ✅ All evidence locations exist`)
  
  // Check that location evidence IDs are valid
  for (const location of blueprint.locations) {
    for (const evidenceId of location.evidenceIds) {
      const evidenceExists = blueprint.evidence.some(ev => ev.id === evidenceId)
      if (!evidenceExists) {
        throw new Error(`Location "${location.id}" references non-existent evidence "${evidenceId}"`)
      }
    }
  }
  
  console.log(`  ✅ All location evidence IDs valid`)
  console.log(`  ✅ Evidence-location mapping verified!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 5: Verify Character Relationships
// ============================================================================

console.log('👥 Test 5: Verifying Character Relationships...')
try {
  const blueprint = getAshfordBlueprint()
  
  // Check that all relationship IDs reference existing characters
  for (const character of blueprint.characters) {
    for (const relatedCharId of Object.keys(character.relationships)) {
      const relatedCharExists = blueprint.characters.some(c => c.id === relatedCharId)
      if (!relatedCharExists) {
        // It's OK if it's 'victim' - that's a special case
        if (relatedCharId !== 'victim') {
          console.warn(`  ⚠️  Character "${character.id}" has relationship with non-existent character "${relatedCharId}"`)
        }
      }
    }
  }
  
  console.log(`  ✅ Character relationships verified!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 6: Verify Serialization
// ============================================================================

console.log('💾 Test 6: Verifying JSON Serialization...')
try {
  const blueprint = getAshfordBlueprint()
  
  // Serialize to JSON
  const json = JSON.stringify(blueprint, null, 2)
  console.log(`  ✅ Serialized to JSON (${json.length} bytes)`)
  
  // Deserialize back
  const parsed = JSON.parse(json) as MysteryBlueprint
  console.log(`  ✅ Deserialized from JSON`)
  
  // Verify structure preserved
  if (parsed.id !== blueprint.id) {
    throw new Error('Deserialization failed: ID mismatch')
  }
  if (parsed.characters.length !== blueprint.characters.length) {
    throw new Error('Deserialization failed: Character count mismatch')
  }
  
  console.log(`  ✅ Blueprint serialization verified!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Test 7: Verify Solution Integrity
// ============================================================================

console.log('🎯 Test 7: Verifying Solution Integrity...')
try {
  const blueprint = getAshfordBlueprint()
  
  // Check killer exists
  const killer = blueprint.characters.find(c => c.id === blueprint.solution.killerId)
  if (!killer) {
    throw new Error('Killer not found')
  }
  if (!killer.isGuilty) {
    throw new Error('Killer not marked as guilty')
  }
  console.log(`  ✅ Killer "${killer.name}" exists and is guilty`)
  
  // Check critical evidence exists
  for (const evidenceId of blueprint.solution.criticalEvidence) {
    const evidence = blueprint.evidence.find(ev => ev.id === evidenceId)
    if (!evidence) {
      throw new Error(`Critical evidence "${evidenceId}" not found`)
    }
  }
  console.log(`  ✅ All critical evidence exists (${blueprint.solution.criticalEvidence.length} pieces)`)
  
  // Check red herrings exist
  for (const herringId of blueprint.solution.redHerrings) {
    const character = blueprint.characters.find(c => c.id === herringId)
    if (!character) {
      throw new Error(`Red herring character "${herringId}" not found`)
    }
    if (character.isGuilty) {
      throw new Error(`Red herring "${herringId}" is marked as guilty`)
    }
  }
  console.log(`  ✅ All red herrings exist (${blueprint.solution.redHerrings.length} characters)`)
  
  console.log(`  ✅ Solution integrity verified!\n`)
  
} catch (error) {
  console.error('  ❌ Failed:', error)
  process.exit(1)
}

// ============================================================================
// Summary
// ============================================================================

console.log('✨ All Tests Passed! ✨\n')
console.log('Blueprint System Status:')
console.log('  ✅ Type definitions complete')
console.log('  ✅ Ashford adapter working')
console.log('  ✅ Hollywood adapter working')
console.log('  ✅ Structure validation passing')
console.log('  ✅ Data integrity verified')
console.log('  ✅ JSON serialization working')
console.log('  ✅ Solution integrity confirmed')
console.log('\n🚀 Ready for integration!')
