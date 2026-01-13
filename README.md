# All Suspects

A browser-based 3D murder mystery game where every NPC is an AI agent capable of real conversation, deception, and memory.

## Overview

Players investigate a murder mystery by interrogating AI-powered suspects in an interactive 3D manor environment. Each character has their own personality, secrets, and the ability to lie or deflect during questioning.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **3D Graphics**: React Three Fiber + Drei
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **AI Backend**: Anthropic SDK (Claude) + Express

## Quick Start

```bash
npm install
npm run dev:all    # Runs frontend + backend concurrently
```

Or run separately:
```bash
npm run dev        # Frontend only (port 5173)
npm run server     # Backend only (port 3001)
```

## Current Mystery: The Ashford Affair

**Setting**: New Year's Eve, 1929 at Ashford Manor during a snowstorm

**Victim**: Edmund Ashford, wealthy industrialist

**Suspects**: 6 characters, each with motives and secrets to uncover

## Project Structure

```
all-suspects/
├── src/
│   ├── components/
│   │   ├── Scene/       # React Three Fiber 3D components
│   │   ├── UI/          # Game interface components
│   │   └── Chat/        # Conversation interface
│   ├── agents/          # AI agent system
│   ├── game/            # Zustand state management
│   └── App.tsx
├── server/              # Express backend with Claude integration
├── mysteries/           # Mystery scenario data
└── package.json
```

## Development Status

- Phase 1: Foundation (Complete)
- Phase 2: Agent System (In Progress)
- Phase 3: Mystery Content (Planned)
- Phase 4: Polish (Planned)
- Phase 5: Game Loop (Planned)

## License

Private - All rights reserved
