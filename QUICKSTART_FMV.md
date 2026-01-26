# FMV Quick Start Guide

## ✅ What's Done

The game has been successfully transformed from a 3D walking simulator to a **Full Motion Video (FMV) cinematic experience**.

### Working Features:
- ✅ Cinematic intro sequence
- ✅ 2D manor map navigation
- ✅ Room exploration with character discovery
- ✅ Full-screen interrogation UI
- ✅ Dramatic evidence reveal system
- ✅ All backend systems intact (Watson, agents, etc.)

### Build Status:
```bash
npm run build  # ✅ SUCCESS (941ms)
```

---

## 🎯 Top 3 Next Steps

### 1. **Connect Interrogation to Backend** (30 min)
**File:** `src/components/FMV/CharacterInterrogation.tsx`

**Current:** Lines 42-53 show placeholder response
```typescript
// Simulate AI response (replace with actual API call)
setTimeout(() => {
  addMessage({
    role: 'character',
    characterId,
    content: `[AI Response to: "${question}"]`,
  })
  setIsTyping(false)
}, 1500)
```

**Replace with:**
```typescript
// Make API call to backend
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    characterId,
    message: question,
    conversationHistory: conversationMessages,
  }),
})
const data = await response.json()
addMessage({
  role: 'character',
  characterId,
  content: data.message,
})
setIsTyping(false)
```

Check existing chat components for reference implementation.

---

### 2. **Add Room Background Images** (1 hour)
**File:** `src/components/FMV/RoomView.tsx`

**Current:** Lines 39-41 use placeholder gradients
```typescript
const ROOM_COLORS: Record<string, string> = {
  parlor: 'linear-gradient(180deg, #2a1a1a 0%, #1a0a0a 100%)',
  // ...
}
```

**What to do:**
1. Create or find 6 atmospheric noir images (1920s aesthetic)
   - Parlor: Elegant, velvet, chandeliers
   - Study: Dark wood, books, cigar smoke
   - Dining room: Long table, wine glasses
   - Hallway: Marble, portraits
   - Kitchen: Copper pots, servants area
   - Garden: Moonlit, frost, bare branches

2. Place images in `/public/backgrounds/`
   - `parlor.jpg`, `study.jpg`, etc.

3. Update `RoomView.tsx`:
```typescript
const ROOM_BACKGROUNDS: Record<string, string> = {
  parlor: '/backgrounds/parlor.jpg',
  study: '/backgrounds/study.jpg',
  // ...
}

// In render:
<div
  className="absolute inset-0 bg-cover bg-center"
  style={{
    backgroundImage: `url(${ROOM_BACKGROUNDS[currentRoom]})`,
  }}
>
```

**Quick option:** Use AI image generation (Midjourney, DALL-E, Stable Diffusion)
Prompt: "1929 noir detective game room, [room type], atmospheric lighting, cinematic, film grain"

---

### 3. **Add Character Portraits** (30 min)
**Files:** 
- `public/portraits/` (create this folder)
- Character portraits already integrated in `CharacterPortrait.tsx`

**What to do:**
1. Generate/find 6 character portraits (1920s noir style)
   - Victoria Ashford (widow)
   - Thomas Ashford (heir)
   - Eleanor Crane (secretary)
   - Dr. Marcus Webb (physician)
   - Lillian Moore (socialite)
   - James (butler)

2. Save as WebP images in `/public/portraits/`
   - `victoria.webp`, `thomas.webp`, etc.

3. Already wired up! The code in `CharacterPortrait.tsx` will automatically load them.

**AI Generation Prompt:**
"1920s noir portrait, [character description], black and white photograph, dramatic lighting, detective game character"

---

## 🔧 Development

```bash
# Run frontend + backend together
npm run dev:all

# Or separately:
npm run dev      # Frontend (port 5173)
npm run server   # Backend (port 3000)
```

---

## 📁 Key Files

### FMV Components (New)
- `src/components/FMV/IntroSequence.tsx` - Opening cinematic
- `src/components/FMV/ManorMap.tsx` - 2D floor plan
- `src/components/FMV/RoomView.tsx` - Room exploration
- `src/components/FMV/CharacterInterrogation.tsx` - Full-screen chat
- `src/components/FMV/EvidenceReveal.tsx` - Dramatic evidence

### Core Files
- `src/App.tsx` - Main app (now FMV-based)
- `src/game/state.ts` - Game state (updated with screen navigation)
- `src/types/evidence.ts` - Shared evidence types

### Backup
- `src/App.tsx.3d-backup` - Old 3D version (for reference)

---

## 🎨 Design System

### Colors
```typescript
noir-black: #0a0a0a
noir-gold: #c9a227
noir-cream: #f5f0e6
```

### Fonts
- Headings/Dialogue: Playfair Display (serif)
- UI: Inter (sans-serif)

### Effects
- Film grain overlay (`.film-grain` class)
- Letterbox bars (top/bottom 12-16px)
- Gold accents for interactive elements

---

## 🐛 Known Issues / Notes

1. **No real backend connection yet** - Interrogation shows placeholder responses
2. **Room backgrounds are gradients** - Need real images
3. **Character portraits may be missing** - Falls back to initials
4. **Evidence hotspots not in RoomView yet** - Need to add clickable items
5. **3D dependencies still in package.json** - Can remove later if fully committed to FMV

---

## 🧪 Testing Checklist

- [ ] Click through intro sequence
- [ ] Navigate between rooms on map
- [ ] Enter room and see characters
- [ ] Click character to start interrogation
- [ ] Type question and send (will show placeholder)
- [ ] Return to map from room
- [ ] Open evidence board
- [ ] Open Watson desk
- [ ] Test audio controls

---

## 📦 Branch & Commits

**Branch:** `feature/watson-agent`

**Recent commits:**
- `ff85b24` - docs: Add comprehensive FMV migration guide
- `fa4bdd0` - refactor: Extract EvidenceData type to shared types file
- `7d66b22` - feat: Replace 3D App with FMV navigation flow
- `eddda94` - feat: Update game state to support FMV navigation
- `95e59ff` - feat: Add FMV components for cinematic experience

All pushed and ready to continue!

---

## 🚀 Ready to Ship?

**MVP Checklist:**
- [x] FMV UI components
- [x] Screen navigation
- [ ] Backend integration (30 min)
- [ ] Room backgrounds (1 hour)
- [ ] Character portraits (30 min)
- [ ] Evidence hotspots (1 hour)
- [ ] Testing (30 min)

**Total time to MVP:** ~3.5 hours of focused work

---

Good luck! The foundation is solid. 🎬
