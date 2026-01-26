# All Suspects: Cinematic + Agent SDK Overhaul

## Vision
Transform from a "3D game with AI chat" into a **cinematic video experience with living AI characters**.

---

## Phase 1: Character Portraits (Week 1)

### Goal
When you interrogate a character, you see a **looping video portrait** of them — not a 3D model.

### Implementation
1. **Pre-generate base portraits** for each character (composed state)
2. **Dynamic state videos** generated on-demand based on pressure/emotion
3. **Seamless swap** between states as conversation evolves

### Character Portrait Specs
- **Duration**: 8-10 seconds, seamless loop
- **Framing**: Close-up to medium shot, character facing camera
- **Style**: 1920s noir, candlelit/firelit, atmospheric
- **States**: composed, nervous, defensive, breaking

### Files
- `server/video/portraitGenerator.ts` - Portrait video generation
- `src/components/Interrogation/CharacterPortrait.tsx` - Video portrait component
- `src/hooks/useCharacterPortrait.ts` - Portrait state management

---

## Phase 2: Room Atmospheres (Week 2)

### Goal
Each room has an **ambient video loop** that sets the mood.

### Implementation
1. Generate 6 room atmosphere videos
2. Display as full-bleed background when in room
3. Overlay UI elements on top

### Room Video Specs
- **Duration**: 15-20 seconds, seamless loop
- **Style**: Slow camera movement, atmospheric details
- **Elements**: Flickering fire, rain on windows, shadows moving

---

## Phase 3: Agent SDK Integration (Week 2-3)

### Goal
Characters have **internal monologues** that drive their visual state.

### New Agent Output Structure
```typescript
interface CharacterResponse {
  dialogue: string
  internal: {
    thought: string           // What they're really thinking
    fear: string | null       // What they're afraid you'll discover
    strategy: string          // How they're trying to manipulate you
  }
  emotion: {
    primary: EmotionalState
    intensity: number         // 0-100
    tells: string[]           // Observable behaviors
  }
  voice: {
    pace: 'fast' | 'normal' | 'slow'
    tremor: boolean
    volume: 'whisper' | 'normal' | 'raised'
  }
}
```

### Visual Integration
- `emotion.primary` → Selects which portrait video to show
- `emotion.tells` → Displayed as subtle UI hints
- `internal.thought` → Can be revealed with special mechanics (Watson insight?)

---

## Phase 4: Inter-Character Dynamics (Week 3-4)

### Goal
Characters talk to each other when you're not there. You can **overhear** or **interrupt**.

### Implementation
1. Background simulation of character interactions
2. "Overheard" snippets when entering rooms
3. Video cutscenes of key character confrontations

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Room View    │  │ Interrogation │  │ Evidence     │      │
│  │ (Video BG)   │  │ (Portrait)    │  │ Board        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                  │
│                    useCharacterState                         │
│                           │                                  │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                        BACKEND                               │
├───────────────────────────┼─────────────────────────────────┤
│                           ▼                                  │
│  ┌──────────────────────────────────────┐                   │
│  │         Enhanced Character Agent      │                   │
│  │  - Memory + Tools (existing)          │                   │
│  │  - Internal Monologue (new)           │                   │
│  │  - Structured Emotion Output (new)    │                   │
│  └──────────────────────────────────────┘                   │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Portrait Generator│      │ Voice Synthesis  │            │
│  │ (Veo 3)          │      │ (PersonaPlex)    │            │
│  └──────────────────┘      └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Portrait Prompts (Ready to Generate)

### Victoria Ashford - Composed
```
Cinematic close-up portrait, elegant woman late 40s, silver-streaked hair pinned up in 1920s style, pearl necklace, dark burgundy evening gown, sitting in wing chair by fireplace, warm amber candlelight, she gazes directly at camera with cold composure, subtle breathing movement, occasional slow blink, 1920s manor study background slightly blurred, noir cinematography with film grain, 8 seconds seamless loop
```

### Thomas Ashford - Nervous
```
Cinematic medium shot, anxious young man late 20s, dark disheveled hair, loosened bow tie on white shirt, dark green suit jacket, standing by rain-streaked window, he shifts weight nervously, runs hand through hair, swallows hard, avoids eye contact then forces himself to look at camera, sweat visible on brow, dramatic shadows from window light, 1920s manor, noir style film grain, 8 seconds
```

### Eleanor Crane - Composed
```
Cinematic close-up, professional woman early 30s, wire-rimmed glasses, brown hair in neat bun, simple navy dress with white collar, seated at writing desk, she looks up from papers with alert intelligent expression, subtle head tilt, composed but watchful, warm desk lamp lighting one side of face, 1920s study setting, noir cinematography, 8 seconds loop
```

### Dr. Marcus Webb - Composed
```
Cinematic portrait, distinguished older gentleman 50s, well-groomed gray beard, three-piece brown suit, pocket watch chain visible, standing by bookshelf, medical bag on table nearby, he regards camera with professional concern, fingers steepled, firelight flickers across face, 1920s manor library, atmospheric noir lighting, 8 seconds loop
```

### Lillian Moore - Guarded
```
Cinematic medium shot, attractive woman early 40s, bold red lipstick, styled finger waves hair, purple beaded flapper dress, seated on settee, cigarette holder in hand with subtle smoke wisps, she watches camera with mixture of bitterness and calculation, slow deliberate movements, 1920s parlor with dying fire behind, moody noir lighting, 8 seconds
```

### James the Butler - Formal
```
Cinematic portrait, elderly butler 60s, silver hair impeccably combed, formal black tailcoat with white gloves, standing at attention with dignified posture, subtle knowing expression, he inclines head slightly, eyes observant and intelligent, servants' hall or manor hallway background, soft overhead lighting with deep shadows, 1920s period, 8 seconds loop
```

---

## Next Steps

1. [x] Create plan document
2. [x] Build portrait generator system
3. [x] Enhance agent with structured emotional output
4. [x] Create portrait video component
5. [ ] Generate first set of character portraits (requires Veo API)
6. [x] Integrate with interrogation UI (CharacterPortrait in InterrogationExperience)
7. [x] Add emotional state switching (driven by Agent SDK emotion output)
8. [x] Generate room atmospheres (roomAtmosphereGenerator + RoomAtmosphere.tsx)

---

## 🚀 Completed This Session (Night Build)

### Phase 1: Interrogation UI Overhaul
- **InterrogationExperience.tsx** now uses CharacterPortrait component
- Emotion data from chat responses drives portrait state changes
- Dynamic question suggestions based on emotional state
- DialogueBox with typewriter effect
- PsychologyOverlay showing real-time stress levels
- Observable tells display and Watson insight hints

### Phase 2: Room Atmosphere System
- **roomAtmosphereGenerator.ts** - Cinematic prompts for all 6 rooms
- Support for time of day (night/dawn/dusk) and weather (rain/storm/fog/clear)
- **RoomAtmosphere.tsx** - Full-bleed video backgrounds
- Weather overlay effects (rain, lightning, fog)
- Film grain and vignette effects
- Cinematic room name transitions

### Phase 3: Enhanced Agent SDK
- **internal_assessment** tool for character private thoughts
- Threat level tracking (safe/concerning/dangerous/critical)
- Evidence ripple system - news travels through the manor
- CHARACTER_RELATIONSHIPS graph for gossip propagation
- Internal monologue influences observable behaviors

### Phase 4: Inter-Character Dynamics
- **backgroundSimulation.ts** - Characters move and talk autonomously
- Overheard snippets when entering rooms
- Conversation pairs with tension levels
- AI-generated background conversations
- Living world that exists when player isn't watching
