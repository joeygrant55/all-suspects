import type { EvidenceData } from '../components/Scene/InteractiveObject'

// All discoverable evidence in the game
export const EVIDENCE_DATABASE: Record<string, EvidenceData> = {
  // STUDY (Crime Scene) - 3 pieces of evidence
  'threatening-letter': {
    id: 'threatening-letter',
    name: 'Threatening Letter',
    description: 'A crumpled letter in the desk drawer.',
    detailedDescription: `A letter dated December 28th, 1929, addressed to Edmund Ashford:

"Father,

I know about the will changes. You cannot cut me off after everything I've done for this family. If you proceed with this, I will have no choice but to take drastic measures. You've left me no other option.

Your son,
Thomas"

The paper is expensive stationery with the Ashford family crest.`,
    type: 'document',
    relatedCharacter: 'thomas',
    hint: 'Someone in the family had a strong motive...',
    pointsTo: 'thomas',
  },
  'champagne-glass': {
    id: 'champagne-glass',
    name: 'Poisoned Champagne Glass',
    description: 'A champagne glass with residue on the rim.',
    detailedDescription: `A crystal champagne flute, half-empty, sits on Edmund's desk. The liquid inside has a faint yellowish tinge that proper champagne wouldn't have.

Upon closer inspection, there's a powdery residue along the inside of the glass - barely visible but unmistakably present.

This appears to be the glass Edmund drank from at the midnight toast.`,
    type: 'physical',
    relatedCharacter: 'thomas',
    hint: 'Who poured the champagne that night?',
    pointsTo: 'thomas',
  },
  'body-outline': {
    id: 'body-outline',
    name: 'Body Position',
    description: 'Where Edmund Ashford was found.',
    detailedDescription: `Edmund Ashford was discovered slumped over his desk at 11:47 PM by James the butler.

The position suggests he collapsed suddenly while seated. Papers are scattered as if he knocked them over in his final moments.

There are no signs of a struggle - whatever happened, it was quick and unexpected. The victim likely trusted whoever brought him the champagne.`,
    type: 'physical',
    hint: 'No struggle means Edmund trusted his killer...',
  },

  // PARLOR - 2 pieces of evidence
  'burned-document': {
    id: 'burned-document',
    name: 'Partially Burned Document',
    description: 'Charred papers in the fireplace ashes.',
    detailedDescription: `Among the fireplace ashes, you find fragments of a burned document. Most is destroyed, but a few legible pieces remain:

"...hereby revoke all previous...Thomas Ashford...disinherited effective...signed this 31st day of December..."

Someone tried to destroy this document recently - the ashes are still warm. This appears to be Edmund's new will, which would have disinherited Thomas.`,
    type: 'document',
    relatedCharacter: 'thomas',
    hint: 'Someone stood to lose everything...',
    pointsTo: 'thomas',
  },
  'victoria-medication': {
    id: 'victoria-medication',
    name: 'Sleeping Powder',
    description: 'A small bottle on the side table.',
    detailedDescription: `A brown glass bottle labeled "Dr. Webb's Sleeping Powder - For Victoria Ashford. Take one spoonful before bed."

The bottle is nearly empty. According to the label, it was filled just last week and should contain a month's supply.

Victoria claims she only takes it occasionally, but this much is missing in just a few days?`,
    type: 'physical',
    relatedCharacter: 'victoria',
    hint: 'Where did all the medication go?',
    pointsTo: 'victoria',
  },

  // DINING ROOM - 1 piece of evidence
  'extra-place-setting': {
    id: 'extra-place-setting',
    name: 'Extra Place Setting',
    description: 'One too many places set at the table.',
    detailedDescription: `The formal dining table is set for seven guests, but only six people attended the party: Victoria, Thomas, Eleanor, Dr. Webb, Lillian, and James (who served).

Who was the seventh place for? Did someone not show up... or did someone leave early and their place was never cleared?

The setting appears untouched - whoever was expected never arrived or never ate.`,
    type: 'physical',
    hint: 'Someone was expected but never came...',
  },

  // KITCHEN - 1 piece of evidence
  'rat-poison': {
    id: 'rat-poison',
    name: 'Rat Poison Container',
    description: 'A tin container on the back counter.',
    detailedDescription: `A tin of "Acme Rat Poison" sits on the kitchen counter. James the butler explains it's for the cellar rats.

However, the container has been opened recently - the seal is broken and some powder is missing. The amount missing is significant.

The active ingredient? Arsenic - the same compound that would cause Edmund's symptoms.`,
    type: 'physical',
    relatedCharacter: 'james',
    hint: 'Arsenic... the murder weapon?',
    pointsTo: 'thomas',
  },

  // HALLWAY - 1 piece of evidence
  'stopped-clock': {
    id: 'stopped-clock',
    name: 'Stopped Grandfather Clock',
    description: 'The grandfather clock has stopped at 11:32 PM.',
    detailedDescription: `The ornate grandfather clock in the hallway has stopped at exactly 11:32 PM.

According to James, the clock was working fine earlier in the evening. It appears someone bumped into it hard enough to stop the mechanism.

11:32 PM - fifteen minutes before Edmund was found dead. Someone was in a hurry through this hallway right around the time of the murder.`,
    type: 'physical',
    hint: '11:32 PM - a crucial timestamp. Where was everyone?',
    pointsTo: 'thomas',
  },

  // GARDEN - 1 piece of evidence
  'discarded-gloves': {
    id: 'discarded-gloves',
    name: 'Discarded Gloves',
    description: 'A pair of gloves floating in the fountain.',
    detailedDescription: `A pair of fine leather gloves, men's size, float in the garden fountain. They're clearly expensive and well-made.

The gloves have a faint chemical smell - the same slight bitterness you detected on the champagne glass.

Someone wore these while handling something toxic, then discarded them in the fountain, hoping the water would wash away any evidence.`,
    type: 'physical',
    relatedCharacter: 'thomas',
    hint: 'Expensive men\'s gloves with poison residue... who owns them?',
    pointsTo: 'thomas',
  },
}

// Evidence organized by room for easy placement
export const EVIDENCE_BY_ROOM: Record<string, string[]> = {
  study: ['threatening-letter', 'champagne-glass', 'body-outline'],
  parlor: ['burned-document', 'victoria-medication'],
  'dining-room': ['extra-place-setting'],
  kitchen: ['rat-poison'],
  hallway: ['stopped-clock'],
  garden: ['discarded-gloves'],
}

// Evidence that unlocks dialogue options
export const EVIDENCE_DIALOGUE_UNLOCKS: Record<string, { characterId: string; prompt: string }[]> = {
  'threatening-letter': [
    { characterId: 'thomas', prompt: 'Ask about the threatening letter you wrote' },
    { characterId: 'victoria', prompt: 'Ask if she knew about the letter' },
  ],
  'burned-document': [
    { characterId: 'thomas', prompt: 'Confront about the burned will' },
    { characterId: 'victoria', prompt: 'Ask about Edmund changing his will' },
  ],
  'champagne-glass': [
    { characterId: 'thomas', prompt: 'Ask who poured Edmund\'s champagne' },
    { characterId: 'james', prompt: 'Ask about the champagne service' },
  ],
  'rat-poison': [
    { characterId: 'james', prompt: 'Ask about access to the rat poison' },
    { characterId: 'thomas', prompt: 'Ask if he knew about the rat poison' },
  ],
  'discarded-gloves': [
    { characterId: 'thomas', prompt: 'Ask about his missing gloves' },
    { characterId: 'lillian', prompt: 'Ask if she saw anyone in the garden' },
  ],
  'stopped-clock': [
    { characterId: 'eleanor', prompt: 'Ask what she heard at 11:32' },
    { characterId: 'thomas', prompt: 'Ask where he was at 11:32 PM' },
  ],
  'victoria-medication': [
    { characterId: 'victoria', prompt: 'Ask about her sleeping powder' },
    { characterId: 'marcus', prompt: 'Ask about prescribing the medication' },
  ],
}
