/**
 * Motive Templates - Building blocks for murder motives in 1920s mysteries
 */

import { MotiveType } from '../mysterySchema'

export interface MotiveTemplate {
  type: MotiveType
  name: string
  description: string
  triggerPatterns: string[]
  evidenceTypes: string[]
  characterTraits: string[]
}

export const MOTIVE_TEMPLATES: Record<MotiveType, MotiveTemplate[]> = {
  greed: [
    {
      type: 'greed',
      name: 'Inheritance',
      description: 'Killing to inherit wealth or property',
      triggerPatterns: [
        'Learned they would be cut from the will',
        'Discovery of a secret codicil',
        'Victim threatening to change beneficiaries',
        'Massive debts requiring immediate funds'
      ],
      evidenceTypes: ['will_document', 'debt_records', 'bank_statements', 'letter_from_creditor'],
      characterTraits: ['desperate', 'in_debt', 'entitled', 'jealous_of_wealth']
    },
    {
      type: 'greed',
      name: 'Business Takeover',
      description: 'Eliminating a partner or rival for business control',
      triggerPatterns: [
        'Partnership dispute reaching breaking point',
        'Victim about to expose embezzlement',
        'Hostile takeover blocked by victim',
        'Victim holding crucial patents or contracts'
      ],
      evidenceTypes: ['business_contracts', 'embezzlement_records', 'threatening_letters', 'financial_audit'],
      characterTraits: ['ambitious', 'ruthless', 'calculating', 'corporate']
    },
    {
      type: 'greed',
      name: 'Insurance Fraud',
      description: 'Murder for insurance payout',
      triggerPatterns: [
        'Recent large insurance policy taken out',
        'Beneficiary in financial trouble',
        'Staged accident gone too far',
        'Double indemnity clause'
      ],
      evidenceTypes: ['insurance_policy', 'beneficiary_documents', 'financial_records'],
      characterTraits: ['calculating', 'cold', 'financially_desperate']
    }
  ],

  revenge: [
    {
      type: 'revenge',
      name: 'Old Grudge',
      description: 'Revenge for a past wrong, sometimes decades old',
      triggerPatterns: [
        'Victim ruined their family years ago',
        'Victim responsible for loved one\'s death',
        'Long-planned vengeance finally executed',
        'Victim never faced justice for past crimes'
      ],
      evidenceTypes: ['old_newspaper_clippings', 'personal_letters', 'family_records', 'court_documents'],
      characterTraits: ['patient', 'obsessive', 'bitter', 'methodical']
    },
    {
      type: 'revenge',
      name: 'Betrayal',
      description: 'Revenge for recent betrayal of trust',
      triggerPatterns: [
        'Discovered affair with spouse',
        'Business partner\'s secret deal',
        'Victim exposed their secret',
        'Victim broke a sacred promise'
      ],
      evidenceTypes: ['love_letters', 'photographs', 'witness_testimony', 'confrontation_evidence'],
      characterTraits: ['passionate', 'volatile', 'proud', 'wounded']
    },
    {
      type: 'revenge',
      name: 'Justice Denied',
      description: 'Taking justice into their own hands',
      triggerPatterns: [
        'Victim escaped prosecution for crime',
        'Legal system failed them',
        'Victim continues to harm others',
        'Vigilante execution'
      ],
      evidenceTypes: ['trial_records', 'victim_letters', 'evidence_of_victim_crimes'],
      characterTraits: ['righteous', 'haunted', 'determined', 'morally_complex']
    }
  ],

  fear: [
    {
      type: 'fear',
      name: 'Blackmail Escape',
      description: 'Killing to escape blackmail or exposure',
      triggerPatterns: [
        'Victim was blackmailing them',
        'Victim threatened to reveal their secret',
        'Secret would destroy their life/career',
        'Blackmail demands escalated'
      ],
      evidenceTypes: ['blackmail_letters', 'payment_records', 'incriminating_photographs', 'hidden_evidence'],
      characterTraits: ['desperate', 'secretive', 'cornered', 'respectable_facade']
    },
    {
      type: 'fear',
      name: 'Self-Preservation',
      description: 'Killing to protect themselves from victim\'s threat',
      triggerPatterns: [
        'Victim was going to have them killed',
        'Victim knew too much about criminal past',
        'Kill or be killed situation',
        'Victim was dangerous to them'
      ],
      evidenceTypes: ['threatening_notes', 'criminal_records', 'weapon_evidence', 'witness_statements'],
      characterTraits: ['survival_instinct', 'paranoid', 'trapped', 'resourceful']
    },
    {
      type: 'fear',
      name: 'Protecting Someone',
      description: 'Killing to protect a loved one from the victim',
      triggerPatterns: [
        'Victim was harming their child',
        'Victim threatening family member',
        'Victim had power over loved one',
        'Desperate protection of innocent'
      ],
      evidenceTypes: ['medical_records', 'testimony_of_abuse', 'protective_letters'],
      characterTraits: ['protective', 'self_sacrificing', 'devoted', 'parent_figure']
    }
  ],

  love: [
    {
      type: 'love',
      name: 'Jealous Rage',
      description: 'Killing over romantic jealousy',
      triggerPatterns: [
        'Discovered affair',
        'Rejected for another',
        'Love triangle explosion',
        'Obsessive love turned deadly'
      ],
      evidenceTypes: ['love_letters', 'photographs', 'diary_entries', 'witness_to_confrontation'],
      characterTraits: ['passionate', 'possessive', 'jealous', 'intense']
    },
    {
      type: 'love',
      name: 'Removing an Obstacle',
      description: 'Killing someone who stands in the way of love',
      triggerPatterns: [
        'Victim forbade the relationship',
        'Victim was arranged marriage',
        'Victim would inherit instead of lover',
        'Victim was rival for affection'
      ],
      evidenceTypes: ['secret_correspondence', 'marriage_documents', 'family_threats'],
      characterTraits: ['romantic', 'desperate', 'star_crossed', 'impulsive']
    },
    {
      type: 'love',
      name: 'Mercy Killing',
      description: 'Killing out of twisted love or mercy',
      triggerPatterns: [
        'Victim was suffering',
        'Believed they were helping victim',
        'Could not bear to see them suffer',
        'Victim asked them to do it'
      ],
      evidenceTypes: ['medical_records', 'personal_letters', 'testimony_about_illness'],
      characterTraits: ['compassionate', 'devoted', 'conflicted', 'loving']
    }
  ],

  power: [
    {
      type: 'power',
      name: 'Political Assassination',
      description: 'Killing for political gain or to prevent political damage',
      triggerPatterns: [
        'Victim had damaging information',
        'Victim blocking political ambitions',
        'Victim was political rival',
        'Cover up political scandal'
      ],
      evidenceTypes: ['political_documents', 'campaign_records', 'secret_files', 'bribery_evidence'],
      characterTraits: ['ambitious', 'ruthless', 'public_figure', 'calculating']
    },
    {
      type: 'power',
      name: 'Social Climbing',
      description: 'Killing to rise in social standing',
      triggerPatterns: [
        'Victim held social power over them',
        'Victim knew their true origins',
        'Marriage into wealth blocked',
        'Social humiliation demanded response'
      ],
      evidenceTypes: ['society_columns', 'family_records', 'social_correspondence'],
      characterTraits: ['aspirational', 'insecure', 'obsessed_with_status', 'charming']
    },
    {
      type: 'power',
      name: 'Criminal Enterprise',
      description: 'Killing to maintain or expand criminal power',
      triggerPatterns: [
        'Victim was informant',
        'Victim threatened criminal operation',
        'Power struggle in organization',
        'Victim was competition'
      ],
      evidenceTypes: ['criminal_records', 'smuggling_evidence', 'coded_messages', 'witness_intimidation'],
      characterTraits: ['criminal', 'connected', 'dangerous', 'street_smart']
    }
  ]
}

/**
 * Get random motive templates for a given type
 */
export function getMotiveTemplates(type: MotiveType): MotiveTemplate[] {
  return MOTIVE_TEMPLATES[type] || []
}

/**
 * Get a random motive template
 */
export function getRandomMotive(): MotiveTemplate {
  const types = Object.keys(MOTIVE_TEMPLATES) as MotiveType[]
  const randomType = types[Math.floor(Math.random() * types.length)]
  const templates = MOTIVE_TEMPLATES[randomType]
  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * Get motives that match certain character traits
 */
export function getMotivesForTraits(traits: string[]): MotiveTemplate[] {
  const matches: MotiveTemplate[] = []

  for (const templates of Object.values(MOTIVE_TEMPLATES)) {
    for (const template of templates) {
      const matchCount = template.characterTraits.filter(t => traits.includes(t)).length
      if (matchCount > 0) {
        matches.push(template)
      }
    }
  }

  return matches
}
