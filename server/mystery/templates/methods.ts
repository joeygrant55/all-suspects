/**
 * Murder Method Templates - 1920s appropriate methods for mystery generation
 */

export interface MethodTemplate {
  id: string
  name: string
  category: 'poison' | 'weapon' | 'staged_accident' | 'strangulation' | 'suffocation'
  description: string
  requires: string[]
  evidenceLeft: string[]
  discoveryDifficulty: 'obvious' | 'moderate' | 'subtle'
  eraAppropriate: boolean
  commonFor: string[] // character types likely to use this method
}

export const METHOD_TEMPLATES: MethodTemplate[] = [
  // Poisons
  {
    id: 'arsenic',
    name: 'Arsenic Poisoning',
    category: 'poison',
    description: 'Slow-acting poison, often administered over time or in a single lethal dose',
    requires: ['access_to_arsenic', 'opportunity_to_administer'],
    evidenceLeft: ['arsenic_traces', 'suspicious_illness_history', 'purchase_records'],
    discoveryDifficulty: 'moderate',
    eraAppropriate: true,
    commonFor: ['spouse', 'family_member', 'servant', 'medical_professional']
  },
  {
    id: 'cyanide',
    name: 'Cyanide Poisoning',
    category: 'poison',
    description: 'Fast-acting poison with distinctive bitter almond smell',
    requires: ['access_to_cyanide', 'chemistry_knowledge'],
    evidenceLeft: ['almond_smell', 'blue_lips', 'rapid_death_indicators'],
    discoveryDifficulty: 'moderate',
    eraAppropriate: true,
    commonFor: ['scientist', 'photographer', 'chemist', 'jeweler']
  },
  {
    id: 'poisoned_drink',
    name: 'Poisoned Champagne/Drink',
    category: 'poison',
    description: 'Poison administered through celebratory or social drink',
    requires: ['access_to_victim_drink', 'distraction_opportunity'],
    evidenceLeft: ['residue_in_glass', 'witness_to_drink_handling', 'poison_source'],
    discoveryDifficulty: 'moderate',
    eraAppropriate: true,
    commonFor: ['party_guest', 'servant', 'romantic_partner']
  },
  {
    id: 'medication_tampering',
    name: 'Tampered Medication',
    category: 'poison',
    description: 'Victim\'s regular medication replaced or contaminated',
    requires: ['knowledge_of_medication', 'access_to_medicine'],
    evidenceLeft: ['tampered_bottles', 'pharmacy_records', 'medical_knowledge_evidence'],
    discoveryDifficulty: 'subtle',
    eraAppropriate: true,
    commonFor: ['doctor', 'nurse', 'family_member', 'servant']
  },

  // Weapons
  {
    id: 'revolver',
    name: 'Gunshot (Revolver)',
    category: 'weapon',
    description: 'Shot with a period-appropriate revolver',
    requires: ['firearm', 'opportunity'],
    evidenceLeft: ['bullet', 'gunshot_residue', 'weapon_if_not_disposed', 'sound_witness'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['anyone_with_gun_access', 'military_background', 'criminal']
  },
  {
    id: 'blunt_force',
    name: 'Blunt Force Trauma',
    category: 'weapon',
    description: 'Struck with heavy object - candlestick, statue, paperweight',
    requires: ['heavy_object', 'physical_proximity'],
    evidenceLeft: ['bloody_weapon', 'blood_spatter', 'struggle_evidence', 'defensive_wounds'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['crime_of_passion', 'opportunistic_killer', 'physically_strong']
  },
  {
    id: 'knife_stabbing',
    name: 'Stabbing',
    category: 'weapon',
    description: 'Killed with knife or letter opener',
    requires: ['blade', 'close_proximity'],
    evidenceLeft: ['murder_weapon', 'blood_evidence', 'wound_pattern', 'struggle_signs'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['crime_of_passion', 'kitchen_access', 'letter_opener_access']
  },
  {
    id: 'fireplace_poker',
    name: 'Fireplace Poker',
    category: 'weapon',
    description: 'Struck with fireplace poker - classic manor murder',
    requires: ['fireplace_access', 'physical_capability'],
    evidenceLeft: ['bloody_poker', 'ash_transfer', 'wound_shape'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['anyone_in_study', 'library', 'drawing_room']
  },

  // Staged Accidents
  {
    id: 'pushed_stairs',
    name: 'Pushed Down Stairs',
    category: 'staged_accident',
    description: 'Pushed to make death appear accidental',
    requires: ['staircase_access', 'element_of_surprise'],
    evidenceLeft: ['bruising_pattern', 'witness_hearing_struggle', 'inconsistent_injuries'],
    discoveryDifficulty: 'subtle',
    eraAppropriate: true,
    commonFor: ['opportunistic_killer', 'intimate_acquaintance']
  },
  {
    id: 'drowning',
    name: 'Drowning',
    category: 'staged_accident',
    description: 'Drowned in bath, pool, or lake - staged as accident',
    requires: ['water_access', 'physical_capability'],
    evidenceLeft: ['struggle_marks', 'water_evidence', 'held_under_indicators'],
    discoveryDifficulty: 'moderate',
    eraAppropriate: true,
    commonFor: ['strong_killer', 'intimate_setting']
  },
  {
    id: 'car_accident',
    name: 'Sabotaged Automobile',
    category: 'staged_accident',
    description: 'Brakes or steering tampered with',
    requires: ['mechanical_knowledge', 'car_access'],
    evidenceLeft: ['tampered_parts', 'mechanical_evidence', 'grease_on_hands'],
    discoveryDifficulty: 'subtle',
    eraAppropriate: true,
    commonFor: ['chauffeur', 'mechanic', 'technically_skilled']
  },

  // Strangulation
  {
    id: 'manual_strangulation',
    name: 'Manual Strangulation',
    category: 'strangulation',
    description: 'Strangled with bare hands',
    requires: ['physical_strength', 'close_proximity'],
    evidenceLeft: ['neck_bruises', 'fingernail_marks', 'petechial_hemorrhaging', 'defensive_wounds'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['strong_male', 'crime_of_passion']
  },
  {
    id: 'ligature_strangulation',
    name: 'Ligature Strangulation',
    category: 'strangulation',
    description: 'Strangled with rope, scarf, or wire',
    requires: ['ligature', 'element_of_surprise'],
    evidenceLeft: ['ligature_marks', 'fiber_evidence', 'missing_item'],
    discoveryDifficulty: 'obvious',
    eraAppropriate: true,
    commonFor: ['premeditated_killer', 'anyone']
  },

  // Suffocation
  {
    id: 'pillow_suffocation',
    name: 'Suffocation',
    category: 'suffocation',
    description: 'Suffocated with pillow or similar',
    requires: ['bedroom_access', 'victim_vulnerability'],
    evidenceLeft: ['petechial_hemorrhaging', 'fiber_in_airway', 'disturbed_bedding'],
    discoveryDifficulty: 'subtle',
    eraAppropriate: true,
    commonFor: ['intimate_relationship', 'medical_knowledge']
  }
]

/**
 * Get methods by category
 */
export function getMethodsByCategory(category: MethodTemplate['category']): MethodTemplate[] {
  return METHOD_TEMPLATES.filter(m => m.category === category)
}

/**
 * Get methods suitable for a character type
 */
export function getMethodsForCharacter(characterType: string): MethodTemplate[] {
  return METHOD_TEMPLATES.filter(m => m.commonFor.includes(characterType))
}

/**
 * Get random method
 */
export function getRandomMethod(): MethodTemplate {
  return METHOD_TEMPLATES[Math.floor(Math.random() * METHOD_TEMPLATES.length)]
}

/**
 * Get methods by discovery difficulty
 */
export function getMethodsByDifficulty(difficulty: 'obvious' | 'moderate' | 'subtle'): MethodTemplate[] {
  return METHOD_TEMPLATES.filter(m => m.discoveryDifficulty === difficulty)
}

/**
 * Get poisons specifically (common in 1920s mysteries)
 */
export function getPoisons(): MethodTemplate[] {
  return METHOD_TEMPLATES.filter(m => m.category === 'poison')
}
