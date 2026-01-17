/**
 * Testimony to Video Prompt Builder
 *
 * Converts character testimony into video generation prompts.
 * Extracts key visual elements: location, time, actions, people, objects
 */

import Anthropic from '@anthropic-ai/sdk'
import { getSceneTemplate, MANOR_LOCATIONS } from './sceneTemplates'

export interface TestimonyAnalysis {
  location: string
  timeOfDay: string
  characters: string[]
  actions: string[]
  objects: string[]
  mood: string
  keyVisualElements: string[]
}

export interface VideoPrompt {
  fullPrompt: string
  baseScene: string
  specificDetails: string
  styleModifiers: string
  duration: number
  aspectRatio: '16:9' | '9:16' | '1:1'
}

// Character visual descriptions for video generation
const CHARACTER_VISUALS: Record<string, string> = {
  victoria: 'elegant woman in her late 40s, wearing pearls and a dark evening gown, silver-streaked hair pinned up, aristocratic bearing',
  thomas: 'young man in his late 20s, disheveled appearance, loosened bow tie, worried expression, dark suit',
  eleanor: 'professional woman in her 30s, simple but tasteful dress, wire-rimmed glasses, composed demeanor',
  marcus: 'distinguished older gentleman, gray beard, medical bag, three-piece suit, concerned expression',
  lillian: 'attractive woman in her 40s, bold red lipstick, stylish flapper dress, confident posture',
  james: 'elderly butler in formal livery, impeccable posture, silver hair, white gloves, dignified manner',
  edmund: 'wealthy older man, gray hair, stern expression, expensive evening wear, commanding presence (deceased)',
}

// Time of day visual modifiers
const TIME_VISUALS: Record<string, string> = {
  evening: 'warm amber lighting from chandeliers, long shadows',
  night: 'dim lighting, dramatic shadows, candlelight and firelight',
  midnight: 'near darkness, single light sources, noir shadows',
  late_evening: 'dying fire glow, muted colors, intimate lighting',
}

// Mood visual modifiers
const MOOD_VISUALS: Record<string, string> = {
  tense: 'harsh shadows, tight framing, uneasy atmosphere',
  calm: 'soft lighting, wide shot, peaceful ambiance',
  suspicious: 'dutch angle, dramatic lighting, unsettling mood',
  dramatic: 'high contrast, dynamic composition, intense atmosphere',
  secretive: 'dark corners, obscured faces, whispered intimacy',
  nervous: 'shaky perspective, sweat visible, darting glances',
}

/**
 * Use Claude to analyze testimony and extract visual elements
 */
export async function analyzeTestimony(
  anthropic: Anthropic,
  testimony: string,
  characterId: string,
  question: string
): Promise<TestimonyAnalysis> {
  const prompt = `Analyze this testimony from a 1920s murder mystery for visual elements.

CHARACTER: ${characterId}
QUESTION ASKED: "${question}"
TESTIMONY: "${testimony}"

Extract the visual elements that could be shown in a short video clip:

Respond with JSON only:
{
  "location": "specific room/area mentioned (e.g., 'study', 'hallway near study', 'garden')",
  "timeOfDay": "evening|night|midnight|late_evening",
  "characters": ["list of people mentioned or implied to be present"],
  "actions": ["list of actions described (e.g., 'walking down hallway', 'arguing')"],
  "objects": ["notable objects mentioned (e.g., 'champagne glass', 'letter', 'study door')"],
  "mood": "tense|calm|suspicious|dramatic|secretive|nervous",
  "keyVisualElements": ["most important visual details to include"]
}

If the testimony doesn't describe a specific scene (e.g., just a denial or emotional response),
set location to "abstract" and provide minimal visual elements.

JSON only:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error analyzing testimony:', error)
    // Return default analysis
    return {
      location: 'manor',
      timeOfDay: 'night',
      characters: [characterId],
      actions: [],
      objects: [],
      mood: 'tense',
      keyVisualElements: [],
    }
  }
}

/**
 * Build a video generation prompt from testimony analysis
 */
export function buildVideoPrompt(
  analysis: TestimonyAnalysis,
  characterId: string,
  isIntroduction: boolean = false
): VideoPrompt {
  const parts: string[] = []

  // Get base scene template
  const baseScene = getSceneTemplate(analysis.location as keyof typeof MANOR_LOCATIONS)
  parts.push(baseScene)

  // Add time of day visuals
  const timeVisual = TIME_VISUALS[analysis.timeOfDay] || TIME_VISUALS.night
  parts.push(timeVisual)

  // Add character descriptions if present
  const characterDescriptions = analysis.characters
    .filter((c) => CHARACTER_VISUALS[c.toLowerCase()])
    .map((c) => CHARACTER_VISUALS[c.toLowerCase()])

  if (characterDescriptions.length > 0) {
    parts.push(characterDescriptions.join(', '))
  } else if (CHARACTER_VISUALS[characterId]) {
    // At minimum, show the speaking character
    parts.push(CHARACTER_VISUALS[characterId])
  }

  // Add actions
  if (analysis.actions.length > 0) {
    parts.push(analysis.actions.join(', '))
  }

  // Add key objects
  if (analysis.objects.length > 0) {
    parts.push(`visible: ${analysis.objects.join(', ')}`)
  }

  // Add mood
  const moodVisual = MOOD_VISUALS[analysis.mood] || MOOD_VISUALS.tense
  parts.push(moodVisual)

  // Add key visual elements
  if (analysis.keyVisualElements.length > 0) {
    parts.push(analysis.keyVisualElements.join(', '))
  }

  // Style modifiers for 1920s noir aesthetic
  const styleModifiers =
    'cinematic, 1920s period accurate, film noir lighting, sepia undertones, ' +
    'old Hollywood glamour, dramatic shadows, silent film era aesthetic, ' +
    '4K quality, professional cinematography'

  // Introduction prompts are more character-focused
  if (isIntroduction) {
    const characterVisual = CHARACTER_VISUALS[characterId] || 'mysterious figure'
    return {
      fullPrompt: `Close-up portrait shot of ${characterVisual}, ${baseScene}, ${timeVisual}, ${styleModifiers}, establishing shot, character introduction, dramatic entrance`,
      baseScene,
      specificDetails: `Introduction of ${characterId}`,
      styleModifiers,
      duration: 5,
      aspectRatio: '16:9',
    }
  }

  return {
    fullPrompt: parts.join(', ') + ', ' + styleModifiers,
    baseScene,
    specificDetails: parts.slice(1).join(', '),
    styleModifiers,
    duration: 5,
    aspectRatio: '16:9',
  }
}

/**
 * Generate a character introduction video prompt
 */
export function buildIntroductionPrompt(characterId: string): VideoPrompt {
  const characterVisual = CHARACTER_VISUALS[characterId] || 'mysterious figure in 1920s attire'

  // Character-specific introduction scenes
  const introScenes: Record<string, string> = {
    victoria:
      'elegant woman adjusting her pearls by the fireplace, cold calculating gaze, cigarette smoke curling, widow in mourning but composed',
    thomas:
      'nervous young man pacing near a window, loosening his collar, checking his pocket watch repeatedly, sweating',
    eleanor:
      'professional secretary organizing papers at a desk, adjusting glasses, quick glance at the door, hiding something',
    marcus:
      'distinguished doctor checking his medical bag, concerned expression, hesitating before speaking',
    lillian:
      'glamorous woman in flapper dress, bold red lipstick, knowing smile, sipping champagne, worldly confidence',
    james:
      'elderly butler standing at attention, white gloves immaculate, observing everything, knows all secrets',
  }

  const introScene = introScenes[characterId] || characterVisual

  return {
    fullPrompt: `Cinematic character introduction, 1920s manor house, night time, ${introScene}, film noir lighting, dramatic shadows, sepia tones, close-up then medium shot, old Hollywood glamour, 4K cinematic quality, establishing shot`,
    baseScene: 'Ashford Manor',
    specificDetails: introScene,
    styleModifiers:
      'cinematic, 1920s period accurate, film noir, dramatic lighting, 4K quality',
    duration: 5,
    aspectRatio: '16:9',
  }
}

/**
 * Generate a contradiction comparison prompt
 * Creates visuals that specifically highlight the conflicting elements
 */
export function buildContradictionPrompt(
  testimony1: TestimonyAnalysis,
  testimony2: TestimonyAnalysis,
  contradictionType: string
): { prompt1: VideoPrompt; prompt2: VideoPrompt } {
  // Emphasize the contradicting element
  let emphasis = ''

  switch (contradictionType) {
    case 'location':
      emphasis = 'clear establishing shot of the room, visible doorways and landmarks'
      break
    case 'timeline':
      emphasis = 'visible clock or time indicator, specific lighting for time of day'
      break
    case 'witness':
      emphasis = 'clear view of who is present, faces visible, no obscured figures'
      break
    case 'factual':
      emphasis = 'focus on the object or detail in question, close-up insert shot'
      break
    default:
      emphasis = 'high detail, clear visibility of scene elements'
  }

  const prompt1 = buildVideoPrompt(testimony1, testimony1.characters[0] || 'unknown')
  const prompt2 = buildVideoPrompt(testimony2, testimony2.characters[0] || 'unknown')

  // Add emphasis to both prompts
  prompt1.fullPrompt += `, ${emphasis}`
  prompt2.fullPrompt += `, ${emphasis}`

  return { prompt1, prompt2 }
}
