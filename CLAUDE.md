# All Suspects - CLAUDE.md

A browser-based 3D mystery game where every NPC is an AI agent capable of real conversation, deception, and memory. Features AI-generated video visualization of character testimony using Veo 3.

## Quick Start

```bash
npm install              # Install dependencies
npm run dev:all          # Start frontend + backend
npm run dev              # Frontend only (port 5173)
npm run server           # Backend only (port 3001)
npm run build            # Production build
npm run lint             # Run ESLint
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **3D**: React Three Fiber + Drei
- **State**: Zustand
- **Styling**: Tailwind CSS v4
- **AI Characters**: Anthropic Claude (claude-sonnet-4)
- **Video Generation**: Google Veo 3 (via Gemini API)
- **Voice**: ElevenLabs
- **Backend**: Express.js

## Project Structure

```
all-suspects/
├── src/
│   ├── components/
│   │   ├── Scene/          # React Three Fiber 3D components
│   │   ├── UI/             # Header, character list, evidence board
│   │   ├── Chat/           # Conversation interface with video
│   │   └── VideoPlayer/    # Video generation components
│   │       ├── TestimonyVideo.tsx   # Single testimony visualization
│   │       ├── VideoComparison.tsx  # Side-by-side contradiction view
│   │       ├── IntroVideo.tsx       # Character introductions
│   │       └── HighlightReel.tsx    # Investigation summary
│   ├── api/
│   │   └── client.ts       # API client for backend
│   ├── game/
│   │   └── state.ts        # Zustand store
│   └── App.tsx
├── server/
│   ├── index.ts            # Express server + API endpoints
│   ├── contradictionDetector.ts  # Statement analysis
│   ├── pressureSystem.ts   # Character pressure tracking
│   ├── agents/
│   │   ├── characterAgent.ts    # Enhanced Claude agent with tools
│   │   ├── memoryStore.ts       # Persistent character memory
│   │   └── crossReference.ts    # Cross-character awareness
│   └── video/
│       ├── veoClient.ts         # Veo 3 API integration
│       ├── promptBuilder.ts     # Testimony to video prompt
│       ├── sceneTemplates.ts    # Manor location templates
│       └── videoCache.ts        # Video caching system
├── mysteries/
│   └── ashford-affair/
│       └── characters.ts   # Character profiles, secrets, alibis
└── package.json
```

## Architecture

### Agent System (Phase 1 - Complete)
- **Memory Persistence**: Characters remember all questions, evidence, and their own lies
- **Cross-Character Awareness**: Characters know what others have said (gossip spreads)
- **Tool Use**: Characters use Claude tools to "recall" memories and maintain consistency
- **Pressure System**: Characters crack under repeated questioning, showing more nervousness
- **Enhanced Contradiction Detection**: Semantic analysis with entity extraction

### Video Generation (Phase 2 - Complete)
- **Veo 3 Integration**: Generate short video clips from testimony
- **Testimony Analysis**: Extract visual elements (location, time, characters, objects)
- **Scene Templates**: Pre-built prompts for each manor location
- **Video Caching**: Avoid regenerating identical testimony

### Visualization (Phase 3 - Complete)
- **"Show Me" Button**: Appear on testimony that can be visualized
- **Video Comparison**: Side-by-side contradiction view
- **Evidence Board Integration**: Compare videos from evidence board
- **Highlight Reel**: Export investigation summary

### Game State (Zustand)
- Current room and navigation
- Active conversation
- Message history with video generation
- Collected evidence and contradictions
- Accusation unlock status (after 5 evidence pieces)

### 3D Scene
- Isometric manor view with 6 rooms
- WASD/arrow keys to navigate
- E key to talk, F key to examine evidence
- Stylized low-poly aesthetic

## The Two AI Pillars

### 1. Claude Agents: Living Suspects
Each character is a Claude agent with:
- Memory of every question asked
- Consistent lies (until pressure breaks them)
- Tool use for "checking notes" and "recalling"
- Cross-character knowledge (gossip)

### 2. Veo 3: Visual Testimony
- Ask a character "What did you see at 11:30?"
- They describe the scene in text
- Veo 3 generates a short video of their "memory"
- Different characters generate DIFFERENT videos of the same moment
- **You literally see the contradictions**

## Environment Variables (.env)

```env
ANTHROPIC_API_KEY=sk-ant-...      # Required - Claude API
GEMINI_API_KEY=AIza...            # Required - Veo 3 video generation
ELEVENLABS_API_KEY=sk_...         # Optional - Voice synthesis
```

## API Endpoints

### Chat
- `POST /api/chat` - Chat with a character
- `GET /api/characters` - List all characters
- `POST /api/reset` - Reset conversation history

### Analysis
- `GET /api/contradictions` - Get all detected contradictions
- `GET /api/statements` - Get all tracked statements
- `GET /api/pressure` - Get pressure states
- `GET /api/memories/:characterId` - Get character memory

### Video
- `POST /api/video/testimony` - Generate testimony video
- `POST /api/video/introduction` - Generate character intro
- `POST /api/video/image` - Generate image fallback
- `GET /api/video/status/:id` - Check generation status
- `GET /api/video/cache` - Get cache statistics

### Voice
- `POST /api/voice` - Generate character voice
- `GET /api/voices` - Get available voices

## Key Files

- `server/agents/characterAgent.ts` - Enhanced Claude agent with tool use
- `server/agents/memoryStore.ts` - Character memory persistence
- `server/video/veoClient.ts` - Veo 3 video generation
- `server/video/promptBuilder.ts` - Testimony to video prompts
- `src/components/VideoPlayer/VideoComparison.tsx` - Contradiction visualization
- `src/components/Chat/ChatPanel.tsx` - Conversation UI with video

## Mystery: The Ashford Affair

**Setting**: New Year's Eve, 1929. Ashford Manor.
**Victim**: Edmund Ashford (industrialist)
**Suspects**: 6 characters, each with secrets and motives
**Killer**: Thomas Ashford (son) - about to be disinherited
**Method**: Poisoned champagne + blunt force

## Development Status

- [x] Phase 1: Agent SDK Depth - Memory, cross-awareness, tools, enhanced contradiction detection
- [x] Phase 2: Veo 3 Integration - API client, prompt builder, scene templates, video player
- [x] Phase 3: Contradiction Visualization - "Show me" flow, video comparison, evidence board
- [x] Phase 4: Polish - Loading states, video caching, highlight reel

## Color Palette (1920s Noir)

- `noir-black`: #0a0a0a
- `noir-charcoal`: #1a1a1a
- `noir-slate`: #2d2d2d
- `noir-gold`: #c9a227 (accent)
- `noir-cream`: #f5f0e6 (text)
- `noir-blood`: #722f37 (danger)
