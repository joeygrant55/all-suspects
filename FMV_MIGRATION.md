# FMV Migration Summary

## ✅ COMPLETED

### 🎬 FMV Components Created
All new components are in `src/components/FMV/`:

1. **IntroSequence.tsx** - Cinematic opening sequence
   - 4 scenes with fade transitions
   - Letterbox bars with gold shimmer
   - Film grain overlay
   - Skip/Continue controls

2. **ManorMap.tsx** - 2D floor plan navigation
   - Stylized manor layout with 6 rooms
   - Shows character locations (gold dots)
   - Click-to-navigate rooms
   - Current room highlighting
   - Noir aesthetic with gold corners

3. **RoomView.tsx** - Full-screen room experience
   - Atmospheric room backgrounds (placeholder gradients)
   - Room descriptions
   - Character portraits as clickable buttons
   - Letterbox framing
   - Back to map navigation

4. **CharacterInterrogation.tsx** - Full-screen interrogation
   - Large character portrait at top
   - Scrolling conversation thread
   - Player messages (right) vs character messages (left)
   - Suggested questions on first interaction
   - Pressure level indicator
   - Lying detection feedback
   - Typewriter-style message display

5. **EvidenceReveal.tsx** - Dramatic evidence presentation
   - Photo-style reveal with zoom
   - Evidence type icon
   - Description with significance
   - Add to Evidence Board action
   - Cinematic vignette pulse

### 🎮 Game State Updates
Updated `src/game/state.ts`:
- Added `GameScreen` type: `'intro' | 'map' | 'room' | 'interrogation'`
- Added `currentScreen` and `showIntro` state
- Added `setCurrentScreen()` and `completeIntro()` actions
- Updated navigation actions to change screens automatically
- Updated `resetGame()` to reset screen state

### 🔄 App.tsx Rewrite
Completely rewrote `src/App.tsx`:
- Removed React Three Fiber 3D scene
- Removed ManorScene, PlayerCharacter, WASD controls
- New flow: TitleScreen → IntroSequence → ManorMap → RoomView → CharacterInterrogation
- Kept Watson, Evidence Board, Accusation, and all modals
- Kept Audio controls
- Backed up old version as `src/App.tsx.3d-backup`

### 🗂️ Type Refactoring
Created `src/types/evidence.ts`:
- Extracted `EvidenceData` interface for shared use
- Updated imports in ExaminationModal, evidence.ts
- Reduced coupling between FMV and 3D components

### ✅ Build Status
- **TypeScript compilation:** ✅ Success
- **Vite build:** ✅ Success (427KB gzipped)
- **No errors**

---

## 🚧 TODO / NEXT STEPS

### 1. **Room Backgrounds** (High Priority)
- Replace placeholder gradients in `RoomView.tsx` with actual images/video
- Options:
  - Static atmospheric images (noir photography style)
  - AI-generated room images (Midjourney, Stable Diffusion)
  - Short looping video clips (Veo 3 integration already exists)
- Add subtle animations (fog, dust particles)

### 2. **Character Integration** (High Priority)
- Connect `CharacterInterrogation.tsx` to actual AI backend
  - Currently shows placeholder "[AI Response to: ...]"
  - Replace with API call to `/api/chat` endpoint
  - Integrate pressure system and psychology updates
- Add Watson hints during interrogations
- Add contradiction detection UI

### 3. **Evidence System Integration**
- Add interactive evidence hotspots to `RoomView.tsx`
  - Clickable items in room (books, letters, weapons)
  - Trigger `EvidenceReveal.tsx` on click
- Connect to existing evidence database (`src/data/evidence.ts`)
- Track discovered vs collected evidence

### 4. **Visual Polish**
- Add more transitions (fade to black between scenes)
- Enhance film grain effect
- Add subtle camera shake for tension
- Add scanlines or VHS effect for extra noir feel
- Polish letterbox bars (maybe animated borders)

### 5. **Audio Hooks**
- Add ambient sound per room (already have audio system)
- Add tension music during interrogations
- Add sound effects for:
  - Screen transitions
  - Evidence reveals
  - Character entries/exits
  - Pressure level changes

### 6. **Character Portraits**
- Generate/add actual character portrait images
  - Already have portrait system in `CharacterPortrait.tsx`
  - Need images for: Victoria, Thomas, Eleanor, Marcus, Lillian, James
  - Place in `/public/portraits/` folder
- Consider AI-generated 1920s noir portraits

### 7. **Tutorial/Onboarding**
- Update tutorial for new FMV controls
- No more WASD/mouse controls to explain
- Just: click rooms, click characters, ask questions

### 8. **Remove 3D Dependencies** (Optional)
If we're fully committed to FMV:
- Remove from `package.json`:
  - `@react-three/fiber`
  - `@react-three/drei`
  - `@react-three/postprocessing`
  - `three`
  - `@types/three`
- Delete `src/components/Scene/` directory
- Delete `src/App.tsx.3d-backup`
- This will reduce bundle size significantly

### 9. **Testing**
- Test all navigation flows
- Test on mobile/tablet (touch controls)
- Test accessibility (keyboard navigation)
- Test with actual AI responses

### 10. **Performance**
- Lazy load FMV components
- Preload room backgrounds
- Optimize portrait images

---

## 📊 Design System

### Colors (Noir Palette)
- `noir-black`: #0a0a0a
- `noir-charcoal`: #1a1a1a
- `noir-slate`: #2d2d2d
- `noir-smoke`: #4a4a4a
- `noir-ash`: #8a8a8a
- `noir-cream`: #f5f0e6
- `noir-gold`: #c9a227
- `noir-rust`: #8b4513
- `noir-blood`: #722f37

### Typography
- Serif: Playfair Display (headings, dialogue)
- Sans: Inter (UI elements)

### Animations
- Film grain overlay
- Letterbox gold shimmer
- Fade transitions
- Vignette pulse
- Typewriter text effect

---

## 🎯 Vision

Transform "All Suspects" from a 3D walking simulator into a **cinematic FMV detective game**:

**Think:**
- **Her Story** (FMV interrogations, piecing together truth)
- **LA Noire** (pressure system, lie detection)
- **AI Dungeon** (free-form questions, dynamic responses)

**Feel:**
- 1929 noir aesthetic
- Film grain and letterbox framing
- Dramatic reveals and transitions
- Tension building through cinematography

**Flow:**
1. Cinematic intro sets the scene
2. Navigate manor via stylized 2D map
3. Enter rooms to find suspects and evidence
4. Full-screen interrogations with AI characters
5. Dramatic evidence reveals
6. Build case, make accusation
7. Cinematic conclusion

---

## 📝 Commits Made

1. `feat: Add FMV components for cinematic experience`
2. `feat: Update game state to support FMV navigation`
3. `feat: Replace 3D App with FMV navigation flow`
4. `refactor: Extract EvidenceData type to shared types file`

All pushed to `feature/watson-agent` branch.

---

## 🚀 How to Run

```bash
# Start dev server
npm run dev

# Start backend (in another terminal)
npm run server

# Or run both
npm run dev:all
```

Navigate to http://localhost:5173

---

## 📦 What's Kept from 3D Version

- ✅ All backend/agent code (`server/agents/*`)
- ✅ Character personalities, memory, lies
- ✅ Watson investigation assistant
- ✅ Veo 3 video generation integration
- ✅ Emotional state/pressure system
- ✅ Evidence database
- ✅ Contradiction detection
- ✅ API endpoints
- ✅ Audio system
- ✅ UI components (Header, EvidenceBoard, etc.)
- ✅ Game state management (Zustand)

---

## 🎬 Ready for Next Phase!

The foundation is complete. The game now has a cinematic FMV flow with:
- ✅ Intro sequence
- ✅ Map navigation
- ✅ Room exploration
- ✅ Character interrogation
- ✅ Evidence reveals

Next: Connect to backend, add real content (images/video), and polish!
