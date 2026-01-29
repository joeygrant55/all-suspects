# Mystery Blueprint System

This directory contains the **universal Mystery Blueprint format** for All Suspects.

## Overview

The Blueprint is the **single source of truth** for all mysteries in the game. Whether hardcoded or AI-generated, every mystery must be converted to this format before the game can consume it.

```
┌─────────────────────────────────────────────────────────┐
│                    MYSTERY SOURCES                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Hardcoded Mysteries          AI-Generated Mysteries   │
│  (ashford-affair/)            (Mystery Architect)       │
│  (hollywood-premiere/)        (server/mystery/)         │
│          │                            │                 │
│          ▼                            ▼                 │
│   ┌──────────────┐          ┌──────────────┐          │
│   │   Adapter    │          │   Adapter    │          │
│   └──────────────┘          └──────────────┘          │
│          │                            │                 │
│          └────────────┬───────────────┘                │
│                       ▼                                 │
│              ┌─────────────────┐                       │
│              │ MysteryBlueprint │ ◄─── THE FORMAT     │
│              └─────────────────┘                       │
│                       │                                 │
│                       ▼                                 │
│              ┌─────────────────┐                       │
│              │   Game Engine   │                       │
│              └─────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
shared/
├── types/
│   ├── MysteryBlueprint.ts   # THE canonical format
│   └── index.ts              # Type exports
├── adapters/
│   ├── ashfordAdapter.ts     # Ashford Affair → Blueprint
│   ├── hollywoodAdapter.ts   # Hollywood Premiere → Blueprint
│   ├── fromGenerated.ts      # AI Generated → Blueprint
│   └── index.ts              # Adapter exports
└── README.md                 # This file
```

## The Blueprint Format

### Core Components

**MysteryBlueprint** contains:

- **Metadata**: id, title, subtitle, difficulty, era
- **Setting**: location, date, event, weather, atmosphere
- **Victim**: name, role, cause of death, secrets, last seen
- **Characters[]**: Full character profiles with AI prompts
- **Locations[]**: Rooms/areas with evidence placement
- **Evidence[]**: Clues with discovery conditions and implications
- **Timeline[]**: Chronological events
- **Solution**: Killer ID, motive, method, critical evidence, logical chain
- **Dialogue Unlocks**: Evidence → conversation prompts mapping
- **Scoring**: Par time, penalties, bonuses

### Key Features

1. **Serializable**: Pure JSON, no functions
2. **Complete**: Everything the game needs to run
3. **Consistent**: Same structure for all mysteries
4. **Rich**: Includes AI prompts, forensics, scoring metadata

## Usage

### Loading a Hardcoded Mystery

```typescript
import { getAshfordBlueprint } from '@/shared/adapters'

const mystery = getAshfordBlueprint()
// mystery is now a MysteryBlueprint
```

### Converting AI-Generated Mystery

```typescript
import { fromGeneratedMystery } from '@/shared/adapters'
import type { GeneratedMystery } from '@/server/mystery/mysterySchema'

const aiMystery: GeneratedMystery = await generateMystery('medium')
const blueprint = fromGeneratedMystery(aiMystery)
// blueprint is now a MysteryBlueprint
```

### Using in Game

```typescript
import type { MysteryBlueprint } from '@/shared/types'

function loadMystery(blueprint: MysteryBlueprint) {
  // Initialize game state from blueprint
  const characters = blueprint.characters
  const evidence = blueprint.evidence
  const locations = blueprint.locations
  
  // Game engine only needs to understand MysteryBlueprint
}
```

## Character Blueprint

The **CharacterBlueprint** merges multiple schemas:

- **CharacterProfile** (from `src/agents/types.ts`)
- **Character** (from `server/mystery/mysterySchema.ts`)
- **greeting** (initial dialogue)
- **systemPrompt** (AI behavior instructions)

```typescript
interface CharacterBlueprint {
  // Identity
  id: string
  name: string
  role: string
  
  // Personality
  personality: string
  speechPattern: string
  
  // Interaction
  greeting: string
  systemPrompt?: string
  
  // Information
  publicInfo: string
  privateSecrets: string[]
  
  // Alibi
  alibi: {
    claimed: string
    truth: string
    holes: string[]
  }
  
  // Relationships & Knowledge
  relationships: Record<string, string>
  knowledge: { sawSomething: boolean; whatTheySaw?: string }
  
  // Game Mechanics
  isGuilty: boolean
  pressureProfile: { threshold: number; weaknesses: string[]; telltales: string[] }
  videoStyle: { cinematography: string; emotionalTone: string; visualMotifs: string[] }
}
```

## Evidence Blueprint

**EvidenceBlueprint** merges:

- **EVIDENCE_DATABASE** format (from `src/data/evidence.ts`)
- **Evidence** schema (from `server/mystery/mysterySchema.ts`)
- **Discovery conditions** (room-search vs interrogation)
- **Dialogue unlocks** (what questions this enables)

```typescript
interface EvidenceBlueprint {
  id: string
  name: string
  type: 'testimony' | 'contradiction' | 'physical' | 'document'
  location: string
  description: string
  detailedDescription: string
  discoveryCondition: 'always' | 'room-search' | 'interrogation' | 'contradiction'
  forensics?: { fingerprints?: string[]; bloodType?: string }
  implications: { implicates: string[]; exonerates: string[]; reveals: string }
  hint?: string
  dialogueUnlocks: Array<{ characterId: string; prompt: string }>
}
```

## Location Blueprint

**LocationBlueprint** defines rooms/areas:

```typescript
interface LocationBlueprint {
  id: string              // e.g., 'study'
  name: string            // e.g., 'The Study'
  icon?: string           // e.g., '📚'
  description: string     // Atmospheric description
  evidenceIds: string[]   // Evidence in this location
  characterPresent?: string  // Character stationed here
}
```

## Solution Blueprint

**SolutionBlueprint** contains the answer:

```typescript
interface SolutionBlueprint {
  killerId: string
  motive: { type: MotiveType; description: string; triggerEvent: string }
  method: { weapon: string; poison?: string; opportunity: string }
  criticalEvidence: string[]      // Must find to solve
  keyContradictions: string[]     // Holes in killer's story
  logicalChain: string[]          // Step-by-step reasoning
  redHerrings: string[]           // Misleading suspects
}
```

## Creating New Adapters

To add support for a new mystery format:

1. Create `shared/adapters/yourAdapter.ts`
2. Import the source format types
3. Export a function that returns `MysteryBlueprint`
4. Map all fields appropriately

Example template:

```typescript
import type { MysteryBlueprint } from '../types/MysteryBlueprint'
import type { YourFormat } from 'somewhere'

export function fromYourFormat(mystery: YourFormat): MysteryBlueprint {
  return {
    id: mystery.id,
    title: mystery.name,
    // ... map all required fields
    characters: mystery.suspects.map(convertCharacter),
    evidence: mystery.clues.map(convertEvidence),
    // ... etc
  }
}
```

## Validation

Before using a Blueprint in production, validate:

1. **Completeness**: All required fields present
2. **Consistency**: Evidence references match character IDs
3. **Solvability**: Critical evidence is discoverable
4. **Timeline**: Events are chronologically ordered

(Validators coming soon in `shared/validators/`)

## Best Practices

1. **Always use Blueprints**: Never pass raw mystery formats to game code
2. **Convert at load time**: Run adapters when loading mysteries
3. **Cache Blueprints**: Converted Blueprints can be saved to JSON
4. **Type safety**: Import `MysteryBlueprint` type everywhere
5. **Testing**: Write tests that verify adapters produce valid Blueprints

## Next Steps

**Immediate:**
- Integrate Blueprints into game state (`src/game/state.ts`)
- Update mystery loader to use adapters
- Refactor interrogation system to use Blueprint character data

**Future:**
- Add validation layer
- Create Blueprint editor tool
- Support mystery serialization/deserialization
- Add difficulty balancing tools

---

**Questions?** Check the TypeScript types in `shared/types/MysteryBlueprint.ts` for complete documentation.
