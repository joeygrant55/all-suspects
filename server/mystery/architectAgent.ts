/**
 * Mystery Architect Agent - Procedural mystery generation using Claude
 *
 * Uses Claude with tools to generate unique, logically consistent mysteries
 * following 1920s noir conventions.
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  GeneratedMystery,
  Character,
  Evidence,
  TimelineEvent,
  MotiveType
} from './mysterySchema'
import { validateMystery, validateSolvability } from './validators'
import { getRandomMotive } from './templates/motives'
import { getRandomMethod } from './templates/methods'
import { getRandomAlibi } from './templates/alibis'

const anthropic = new Anthropic()

const ARCHITECT_SYSTEM_PROMPT = `You are the Mystery Architect, a master of crafting intricate 1920s murder mysteries.

Your role is to generate complete, fair, and compelling mysteries with these principles:

1. FAIRNESS: The player must be able to solve it with available evidence
2. MISDIRECTION: Include red herrings but never unfair tricks
3. CONSISTENCY: No plot holes, timeline must be airtight
4. DEPTH: Every character has secrets, not just the killer
5. DRAMA: The solution should be emotionally satisfying

Setting: 1920s wealthy estates, noir atmosphere
Tone: Dark, sophisticated, morally complex

When generating, think step by step:
1. Create a victim with secrets worth killing for
2. Design suspects with complex relationships
3. Choose the killer based on strongest motive + opportunity
4. Plant evidence that creates a logical chain
5. Validate everything is consistent

IMPORTANT: Generate unique content each time. Avoid clichés. Make each character memorable with distinct personalities and speech patterns.

Character roles should include a mix of:
- Family members (spouse, children, siblings)
- Staff (butler, maid, cook, chauffeur)
- Professionals (doctor, lawyer, secretary)
- Social connections (old friends, business partners, rivals)

Every suspect needs:
- A plausible motive (even if innocent)
- An alibi (with flaws for the killer)
- Secrets they're hiding
- Relationships with other characters
- Unique personality and mannerisms`

const tools: Anthropic.Tool[] = [
  {
    name: 'generate_victim',
    description: 'Generate the murder victim with their background, secrets, and relationships. The victim should have secrets that give multiple people motive to kill them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Full name of the victim' },
        role: { type: 'string', description: 'Their role (e.g., "Wealthy Industrialist", "Family Patriarch")' },
        personality: { type: 'string', description: 'Key personality traits' },
        secrets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dark secrets the victim was hiding (2-4 secrets)'
        },
        cause_of_death: { type: 'string', description: 'How they died' },
        last_seen_time: { type: 'string', description: 'When they were last seen alive (e.g., "11:30 PM")' },
        last_seen_location: { type: 'string', description: 'Where they were last seen' },
        last_seen_by: { type: 'string', description: 'Who saw them last' }
      },
      required: ['name', 'role', 'personality', 'secrets', 'cause_of_death', 'last_seen_time', 'last_seen_location', 'last_seen_by']
    }
  },
  {
    name: 'generate_suspect',
    description: 'Generate a single suspect with their background, alibi, secrets, and relationship to the victim. Call this multiple times to create all suspects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Unique ID for the suspect (e.g., "suspect_1", "victoria")' },
        name: { type: 'string', description: 'Full name' },
        role: { type: 'string', description: 'Their role (e.g., "Wife", "Butler", "Business Partner")' },
        personality: { type: 'string', description: 'Detailed personality description' },
        relationship_to_victim: { type: 'string', description: 'How they knew the victim' },
        motive: { type: 'string', description: 'Why they might want the victim dead' },
        alibi_claimed: { type: 'string', description: 'What they claim they were doing' },
        alibi_truth: { type: 'string', description: 'What they were actually doing' },
        alibi_holes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Weaknesses in their alibi (leave empty for solid alibis, add holes for killer)'
        },
        secrets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              who_knows: { type: 'array', items: { type: 'string' } },
              blackmailable: { type: 'boolean' }
            }
          },
          description: 'Secrets this character is hiding'
        },
        saw_something: { type: 'boolean', description: 'Did they witness something relevant?' },
        what_they_saw: { type: 'string', description: 'If they saw something, what was it?' },
        why_hiding: { type: 'string', description: 'Why they might hide what they saw' },
        pressure_threshold: { type: 'number', description: 'How much pressure before they crack (1-100)' },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topics that make them nervous'
        },
        telltales: {
          type: 'array',
          items: { type: 'string' },
          description: 'Behaviors when lying or nervous'
        },
        cinematography: { type: 'string', description: 'Visual style for video generation' },
        emotional_tone: { type: 'string', description: 'Emotional quality of their scenes' }
      },
      required: ['id', 'name', 'role', 'personality', 'relationship_to_victim', 'motive', 'alibi_claimed', 'alibi_truth', 'pressure_threshold']
    }
  },
  {
    name: 'designate_killer',
    description: 'Choose which suspect is the killer and define the details of their crime. The killer must already exist in the suspect list.',
    input_schema: {
      type: 'object' as const,
      properties: {
        suspect_id: { type: 'string', description: 'ID of the suspect who is the killer' },
        motive_type: {
          type: 'string',
          enum: ['greed', 'revenge', 'fear', 'love', 'power'],
          description: 'Category of motive'
        },
        motive_description: { type: 'string', description: 'Detailed explanation of why they killed' },
        trigger_event: { type: 'string', description: 'What finally pushed them to murder' },
        weapon: { type: 'string', description: 'Murder weapon used' },
        poison: { type: 'string', description: 'If poison was used, what kind' },
        opportunity: { type: 'string', description: 'How they got the victim alone' },
        alibi_story: { type: 'string', description: 'Their cover story' },
        frame_target: { type: 'string', description: 'If trying to frame someone, who?' },
        evidence_hidden: {
          type: 'array',
          items: { type: 'string' },
          description: 'Evidence they tried to hide or destroy'
        }
      },
      required: ['suspect_id', 'motive_type', 'motive_description', 'trigger_event', 'weapon', 'opportunity', 'alibi_story']
    }
  },
  {
    name: 'plant_evidence',
    description: 'Place a piece of evidence in the mystery. Evidence should help (or mislead) the detective.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Unique ID for the evidence' },
        name: { type: 'string', description: 'Name of the evidence (e.g., "Bloodstained Letter Opener")' },
        location: { type: 'string', description: 'Where it can be found' },
        description: { type: 'string', description: 'Detailed description' },
        fingerprints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Whose fingerprints are on it'
        },
        blood_type: { type: 'string', description: 'If blood present, whose type' },
        time_indicators: { type: 'string', description: 'Any time-related clues' },
        implicates: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suspect IDs this evidence points to'
        },
        exonerates: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suspect IDs this evidence clears'
        },
        reveals: { type: 'string', description: 'What secret or fact this evidence reveals' },
        discovery_condition: {
          type: 'string',
          enum: ['always', 'search', 'interrogation'],
          description: 'How the evidence can be found'
        },
        is_red_herring: { type: 'boolean', description: 'Is this evidence misleading?' }
      },
      required: ['id', 'name', 'location', 'description', 'discovery_condition']
    }
  },
  {
    name: 'add_timeline_event',
    description: 'Add an event to the murder night timeline. Build a complete picture of what happened when.',
    input_schema: {
      type: 'object' as const,
      properties: {
        time: { type: 'string', description: 'Time of the event (e.g., "10:30 PM")' },
        location: { type: 'string', description: 'Where it happened' },
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Who was involved'
        },
        description: { type: 'string', description: 'What happened' },
        is_public_knowledge: { type: 'boolean', description: 'Would guests generally know about this?' },
        witnesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Who saw this happen'
        }
      },
      required: ['time', 'location', 'description']
    }
  },
  {
    name: 'define_solution',
    description: 'Define the solution path - how the detective can solve the mystery.',
    input_schema: {
      type: 'object' as const,
      properties: {
        critical_evidence: {
          type: 'array',
          items: { type: 'string' },
          description: 'Evidence IDs that are essential to solving the case'
        },
        key_contradictions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contradictions in the killer\'s story'
        },
        logical_chain: {
          type: 'array',
          items: { type: 'string' },
          description: 'Step-by-step logic to reach the solution'
        }
      },
      required: ['critical_evidence', 'key_contradictions', 'logical_chain']
    }
  },
  {
    name: 'finalize_mystery',
    description: 'Output the complete mystery after all components are created. Call this when done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        setting_location: { type: 'string', description: 'Name of the estate/location' },
        setting_date: { type: 'string', description: 'Date of the murder' },
        setting_event: { type: 'string', description: 'What occasion (e.g., "New Year\'s Eve Party")' },
        complete: { type: 'boolean', description: 'Confirm all components are ready' }
      },
      required: ['setting_location', 'setting_date', 'setting_event', 'complete']
    }
  }
]

interface BuildingMystery {
  id: string
  seed: number
  difficulty: 'easy' | 'medium' | 'hard'
  setting: {
    location: string
    date: string
    event: string
  }
  victim?: GeneratedMystery['victim']
  killer?: GeneratedMystery['killer']
  suspects: Character[]
  evidence: Evidence[]
  timeline: TimelineEvent[]
  solution?: GeneratedMystery['solution']
}

/**
 * Generate a new mystery using Claude as the architect
 */
export async function generateMystery(
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<GeneratedMystery> {
  console.log('[ARCHITECT] Starting mystery generation, difficulty:', difficulty)

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Generate a complete 1920s murder mystery.

Difficulty: ${difficulty}
Setting: A wealthy estate during a social gathering
Suspects: 6 characters
Evidence pieces: ${difficulty === 'easy' ? '7' : difficulty === 'medium' ? '5' : '4'}

Requirements:
- Victim must have secrets that give multiple people motive
- Killer must have motive, method, AND opportunity
- 2-3 suspects should be suspicious but innocent (red herrings)
- At least one witness saw something (but may not realize its importance)
- Killer's alibi must have a detectable flaw
- Evidence should create a logical chain to the solution

Use your tools step by step:
1. First, generate_victim to create the murder victim
2. Then, generate_suspect 6 times to create all suspects
3. Then, designate_killer to choose who did it
4. Then, plant_evidence multiple times for clues
5. Then, add_timeline_event to build the timeline
6. Then, define_solution to map the solution path
7. Finally, finalize_mystery when complete

Be creative! Generate unique names, scenarios, and relationships.`
    }
  ]

  const buildingMystery: BuildingMystery = {
    id: `mystery-${Date.now()}`,
    seed: Math.floor(Math.random() * 1000000),
    difficulty,
    setting: {
      location: 'Ashford Manor',
      date: 'December 31, 1929',
      event: "New Year's Eve Party"
    },
    suspects: [],
    evidence: [],
    timeline: []
  }

  let mystery: GeneratedMystery | null = null
  let iterations = 0
  const maxIterations = 15 // Safety limit

  // Agentic loop - let Claude build the mystery step by step
  while (!mystery && iterations < maxIterations) {
    iterations++
    console.log(`[ARCHITECT] Iteration ${iterations}`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,
      system: ARCHITECT_SYSTEM_PROMPT,
      tools,
      messages
    })

    // Collect all tool uses and results
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`[ARCHITECT] Tool: ${block.name}`)
        const result = handleTool(block.name, block.input as Record<string, unknown>, buildingMystery)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        })

        if (block.name === 'finalize_mystery' && result.success) {
          // Validate and finalize
          const completeMystery = assembleMystery(buildingMystery)
          const validation = validateMystery(completeMystery)

          if (validation.valid) {
            mystery = completeMystery
            console.log('[ARCHITECT] Mystery validated successfully')
          } else {
            console.log('[ARCHITECT] Validation failed:', validation.errors)
            // Continue loop to fix issues
            toolResults[toolResults.length - 1] = {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({
                success: false,
                validation_errors: validation.errors,
                warnings: validation.warnings,
                message: 'Please fix these issues before finalizing'
              })
            }
          }
        }
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    if (response.stop_reason === 'end_turn' && !mystery) {
      // Claude finished without finalizing - prompt to complete
      messages.push({
        role: 'user',
        content: 'Please use finalize_mystery to complete the mystery generation. Make sure all 6 suspects have been created, a killer has been designated, and evidence has been planted.'
      })
    }
  }

  if (!mystery) {
    throw new Error('Failed to generate valid mystery after maximum iterations')
  }

  // Final solvability check
  const solvability = validateSolvability(mystery)
  if (!solvability.valid) {
    console.warn('[ARCHITECT] Solvability warnings:', solvability.warnings)
  }

  console.log('[ARCHITECT] Mystery generation complete:', mystery.id)
  return mystery
}

/**
 * Handle tool calls from Claude
 */
function handleTool(
  name: string,
  input: Record<string, unknown>,
  mystery: BuildingMystery
): Record<string, unknown> {
  switch (name) {
    case 'generate_victim': {
      const victimId = `victim-${Date.now()}`
      mystery.victim = {
        id: victimId,
        name: input.name as string,
        role: input.role as string,
        personality: input.personality as string,
        secrets: input.secrets as string[],
        relationships: {},
        lastKnownAlive: {
          time: input.last_seen_time as string,
          location: input.last_seen_location as string,
          witness: input.last_seen_by as string
        },
        causeOfDeath: input.cause_of_death as string
      }
      return { success: true, victim_id: victimId, message: 'Victim created' }
    }

    case 'generate_suspect': {
      const suspect: Character = {
        id: input.id as string,
        name: input.name as string,
        role: input.role as string,
        personality: input.personality as string,
        alibi: {
          claimed: input.alibi_claimed as string,
          truth: (input.alibi_truth as string) || (input.alibi_claimed as string),
          holes: (input.alibi_holes as string[]) || []
        },
        secrets: ((input.secrets as Array<{ content: string; who_knows?: string[]; blackmailable?: boolean }>) || []).map(s => ({
          content: s.content,
          whoKnows: s.who_knows || [],
          blackmailable: s.blackmailable || false
        })),
        knowledge: {
          sawSomething: (input.saw_something as boolean) || false,
          whatTheySaw: input.what_they_saw as string,
          whyTheyreHiding: input.why_hiding as string
        },
        relationships: {
          victim: {
            type: 'secret',
            description: input.relationship_to_victim as string,
            publicKnowledge: true
          }
        },
        pressureProfile: {
          threshold: (input.pressure_threshold as number) || 50,
          weaknesses: (input.weaknesses as string[]) || [],
          telltales: (input.telltales as string[]) || []
        },
        videoStyle: {
          cinematography: (input.cinematography as string) || 'Medium shot, noir lighting',
          emotionalTone: (input.emotional_tone as string) || 'Guarded, tense',
          visualMotifs: []
        }
      }

      mystery.suspects.push(suspect)
      return {
        success: true,
        suspect_id: suspect.id,
        suspect_count: mystery.suspects.length,
        message: `Suspect ${suspect.name} created (${mystery.suspects.length}/6)`
      }
    }

    case 'designate_killer': {
      const killerId = input.suspect_id as string
      const killer = mystery.suspects.find(s => s.id === killerId)

      if (!killer) {
        return { success: false, error: `Suspect ${killerId} not found in suspect list` }
      }

      // Update killer's alibi to have holes if not already
      if (killer.alibi.holes.length === 0) {
        killer.alibi.holes = ['Timeline has gaps', 'No witness for claimed location']
      }

      mystery.killer = {
        characterId: killerId,
        motive: {
          type: input.motive_type as MotiveType,
          description: input.motive_description as string,
          triggerEvent: input.trigger_event as string
        },
        method: {
          weapon: input.weapon as string,
          poison: input.poison as string,
          opportunity: input.opportunity as string
        },
        coverup: {
          alibi: input.alibi_story as string,
          frameTarget: input.frame_target as string,
          evidenceHidden: (input.evidence_hidden as string[]) || []
        }
      }

      return { success: true, killer_id: killerId, message: `${killer.name} designated as killer` }
    }

    case 'plant_evidence': {
      const evidence: Evidence = {
        id: input.id as string,
        name: input.name as string,
        location: input.location as string,
        description: input.description as string,
        forensics: {
          fingerprints: input.fingerprints as string[],
          bloodType: input.blood_type as string,
          timeIndicators: input.time_indicators as string
        },
        implications: {
          implicates: (input.implicates as string[]) || [],
          exonerates: (input.exonerates as string[]) || [],
          reveals: (input.reveals as string) || ''
        },
        discoveryCondition: (input.discovery_condition as 'always' | 'search' | 'interrogation') || 'search'
      }

      mystery.evidence.push(evidence)
      return {
        success: true,
        evidence_id: evidence.id,
        evidence_count: mystery.evidence.length,
        message: `Evidence "${evidence.name}" planted at ${evidence.location}`
      }
    }

    case 'add_timeline_event': {
      const event: TimelineEvent = {
        time: input.time as string,
        location: input.location as string,
        participants: (input.participants as string[]) || [],
        description: input.description as string,
        isPublicKnowledge: (input.is_public_knowledge as boolean) || false,
        witnesses: (input.witnesses as string[]) || []
      }

      mystery.timeline.push(event)
      // Sort timeline by time
      mystery.timeline.sort((a, b) => {
        const timeA = parseTime(a.time)
        const timeB = parseTime(b.time)
        return timeA - timeB
      })

      return {
        success: true,
        event_count: mystery.timeline.length,
        message: `Timeline event added at ${event.time}`
      }
    }

    case 'define_solution': {
      mystery.solution = {
        criticalEvidence: (input.critical_evidence as string[]) || [],
        keyContradictions: (input.key_contradictions as string[]) || [],
        logicalChain: (input.logical_chain as string[]) || []
      }
      return { success: true, message: 'Solution path defined' }
    }

    case 'finalize_mystery': {
      // Update setting if provided
      if (input.setting_location) {
        mystery.setting.location = input.setting_location as string
      }
      if (input.setting_date) {
        mystery.setting.date = input.setting_date as string
      }
      if (input.setting_event) {
        mystery.setting.event = input.setting_event as string
      }

      // Check completeness
      const issues: string[] = []
      if (!mystery.victim) issues.push('No victim')
      if (!mystery.killer) issues.push('No killer designated')
      if (mystery.suspects.length < 3) issues.push(`Only ${mystery.suspects.length} suspects (need at least 3)`)
      if (mystery.evidence.length < 3) issues.push(`Only ${mystery.evidence.length} evidence pieces (need at least 3)`)
      if (!mystery.solution) issues.push('No solution defined')

      if (issues.length > 0) {
        return { success: false, issues, message: 'Mystery incomplete' }
      }

      return {
        success: true,
        summary: {
          victim: mystery.victim?.name,
          suspects: mystery.suspects.length,
          evidence: mystery.evidence.length,
          timeline_events: mystery.timeline.length
        }
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

/**
 * Assemble the final mystery object
 */
function assembleMystery(building: BuildingMystery): GeneratedMystery {
  if (!building.victim || !building.killer || !building.solution) {
    throw new Error('Cannot assemble incomplete mystery')
  }

  return {
    id: building.id,
    seed: building.seed,
    difficulty: building.difficulty,
    setting: building.setting,
    victim: building.victim,
    killer: building.killer,
    suspects: building.suspects,
    evidence: building.evidence,
    timeline: building.timeline,
    solution: building.solution
  }
}

/**
 * Parse time string to minutes for sorting
 */
function parseTime(time: string): number {
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
