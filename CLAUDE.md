# All Suspects - CLAUDE.md

A browser-based 3D mystery game where every NPC is an AI agent capable of real conversation, deception, and memory.

## Quick Start

```bash
npm run dev     # Start development server
npm run build   # Production build
npm run lint    # Run ESLint
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **3D**: React Three Fiber + Drei
- **State**: Zustand
- **Styling**: Tailwind CSS v4
- **AI**: Anthropic SDK (Agent SDK integration planned)

## Project Structure

```
all-suspects/
├── src/
│   ├── components/
│   │   ├── Scene/       # React Three Fiber 3D components
│   │   ├── UI/          # Header, character list, evidence board
│   │   └── Chat/        # Conversation interface
│   ├── agents/
│   │   ├── types.ts     # Agent type definitions
│   │   ├── coordinator.ts # Main game orchestration
│   │   └── tools/       # MCP tool definitions (TODO)
│   ├── game/
│   │   └── state.ts     # Zustand store
│   └── App.tsx
├── mysteries/
│   └── ashford-affair/  # Mystery scenario data
│       └── characters.ts # Character profiles, secrets, alibis
└── package.json
```

## Architecture

### Agent System
- **Coordinator Agent**: Manages game state, routes conversations, tracks evidence
- **Character Subagents**: Each suspect has personality, secrets, relationships
- Currently uses simulated responses - backend API needed for real Agent SDK

### Game State (Zustand)
- Current room and navigation
- Active conversation
- Message history
- Collected evidence and contradictions
- Accusation unlock status

### 3D Scene
- Isometric manor view with 6 rooms
- Click rooms to navigate
- Character indicators show who's present
- Stylized low-poly aesthetic

## Mystery: The Ashford Affair

**Setting**: New Year's Eve, 1929. Ashford Manor.
**Victim**: Edmund Ashford (industrialist)
**Suspects**: 6 characters, each with secrets and motives
**Solution**: [SPOILER in mysteries/ashford-affair/characters.ts]

## Development Phases

### Phase 1: Foundation ✅
- Project setup, 3D scene, chat interface, agent scaffolding

### Phase 2: Agent System (Next)
- Real Anthropic Agent SDK integration
- Backend API for secure API key handling
- Character personality prompts
- Contradiction detection

### Phase 3: Mystery Content
- Complete character dialogue trees
- Evidence discovery system
- Red herrings

### Phase 4: Polish
- 3D models and environments
- Sound design
- UI animations

### Phase 5: Game Loop
- Evidence board UI
- Accusation system
- Win/lose conditions

## Key Files

- `src/game/state.ts` - Game state management
- `src/agents/coordinator.ts` - Agent orchestration
- `mysteries/ashford-affair/characters.ts` - Character data
- `src/components/Chat/ChatPanel.tsx` - Conversation UI

## TODO

1. [ ] Backend API for Agent SDK (protect API key)
2. [ ] Real Claude integration for character responses
3. [ ] Contradiction detection system
4. [ ] Evidence board UI
5. [ ] Accusation system
6. [ ] 3D character models
7. [ ] Sound effects and music

## Color Palette (1920s Noir)

- `noir-black`: #0a0a0a
- `noir-charcoal`: #1a1a1a
- `noir-slate`: #2d2d2d
- `noir-gold`: #c9a227 (accent)
- `noir-cream`: #f5f0e6 (text)
- `noir-blood`: #722f37 (danger)
