# All Suspects - Audio System

## Current Status ✅

The audio system is **fully functional** with placeholder sounds. All required files are present and the game will play audio when enabled by the player.

### What's Working:
- ✅ Audio toggle controls in bottom-right corner
- ✅ Separate toggles for Music, Ambience, SFX, and Voice
- ✅ Master volume control
- ✅ LocalStorage persistence (remembers user preferences)
- ✅ Crossfading between different ambience tracks
- ✅ Sound effect pooling (multiple simultaneous SFX)
- ✅ All audio files present and loading

### Current Audio Files (Placeholders):

All files are **synthetic/generated** and should be replaced with proper noir jazz and atmospheric sounds:

#### Background Music
- **jazz-ambient.mp3** (60s, silent placeholder)
  - Currently: silence
  - **Should be**: Smooth 1920s noir jazz loop (piano, muted trumpet, brushed drums, upright bass)
  - Volume: 30% by default (stays in background)

#### Room Ambience (10s loops)
- **ambience-fireplace.mp3** - Parlor/study atmosphere
  - Currently: pink noise (fireplace simulation)
  - **Should be**: Real crackling fire, warm room tone
  
- **ambience-clock.mp3** - Study/dining room
  - Currently: simple tick generator
  - **Should be**: Grandfather clock ticking, subtle room tone
  
- **ambience-wind.mp3** - Hallway/garden (drafty areas)
  - Currently: filtered white noise
  - **Should be**: Wind outside old windows, subtle drafts
  
- **ambience-kitchen.mp3** - Kitchen
  - Currently: silence
  - **Should be**: Subtle kitchen sounds, settling pipes, distant drips

#### Sound Effects
- **sfx-click.mp3** (0.1s) - UI interactions
  - Currently: simple sine wave beep
  - **Should be**: Subtle vintage typewriter key or paper tap
  
- **sfx-evidence.mp3** (1s) - Evidence collected
  - Currently: simple tone
  - **Should be**: Mystery revelation chime, satisfying "aha!" sound
  
- **sfx-footstep.mp3** (0.2s) - Character movement
  - Currently: low frequency thud
  - **Should be**: Single wooden floor creak/step
  
- **sfx-door.mp3** (2s) - Room transitions
  - Currently: low frequency sweep
  - **Should be**: Old door creaking open
  
- **sfx-conversation.mp3** (1s) - Starting dialogue
  - Currently: filtered noise
  - **Should be**: Paper rustle or subtle attention sound

---

## How to Upgrade Audio

### Recommended Sources:

1. **Pixabay** (https://pixabay.com/music/)
   - Free for commercial use, no attribution required
   - Search: "noir jazz", "1920s jazz", "mystery ambient"

2. **Freesound.org** (https://freesound.org/)
   - Huge SFX library, mostly CC0/CC-BY
   - Search terms provided below
   - Always check license

3. **Suno.ai** (AI Music Generation)
   - Best for custom background music
   - Prompt: "1920s speakeasy noir jazz, ambient, lo-fi mystery, soft piano and muted trumpet, seamless loop, moody atmosphere"

4. **Uppbeat** (https://uppbeat.io/)
   - Royalty-free music, free tier available
   - Good for noir/jazz genres

### Search Terms for Freesound.org:
- Ambience fireplace: "fireplace crackle loop" or "fire ambience"
- Ambience clock: "grandfather clock tick" or "clock ambience"
- Ambience wind: "wind inside house" or "drafty room"
- Ambience kitchen: "kitchen ambience quiet" or "house settling"
- SFX click: "typewriter key single" or "ui click vintage"
- SFX evidence: "chime discovery" or "mystery reveal"
- SFX footstep: "wood floor creak" or "footstep old floor"
- SFX door: "door creak old" or "creaky door open"
- SFX conversation: "paper rustle" or "book page turn"

### Audio Specifications:
- **Format**: MP3 (best browser compatibility)
- **Sample Rate**: 44.1kHz
- **Bitrate**: 
  - Music: 128-192kbps
  - Ambience: 96-128kbps
  - SFX: 64-96kbps
- **Ambience/Music**: MUST loop seamlessly (trim silence, match start/end)
- **SFX**: Short and punchy, minimal silence padding

### Quick Upgrade Path:

**Priority 1** (Most noticeable):
1. `jazz-ambient.mp3` - This is what sets the mood
2. `sfx-evidence.mp3` - Plays often, very noticeable

**Priority 2** (Frequently heard):
3. `sfx-click.mp3` - Every UI interaction
4. `ambience-fireplace.mp3` - Most common room type

**Priority 3** (Polish):
5. Other ambience files
6. Other SFX files

---

## Technical Implementation

### Audio System Features:

**Crossfading**: 
- Ambience tracks automatically crossfade when changing rooms
- Smooth volume transitions (50ms steps)
- No jarring audio cuts

**Performance**:
- SFX use a pool of 5 audio elements for overlapping sounds
- Lazy loading - files only load when audio is enabled
- Graceful fallback if files don't load

**User Control**:
- Default state: SFX enabled, Music/Ambience off (autoplay policy compliance)
- Preferences persist in localStorage
- Individual volume control for each category
- Master volume slider

**Integration Points**:
- Evidence collection triggers `sfx-evidence`
- UI clicks trigger `sfx-click`
- Room changes trigger ambience crossfade
- Music plays continuously when enabled

### Testing the Audio:

1. Start the game
2. Click Audio button (bottom-right)
3. Enable Music, Ambience, and SFX
4. Explore the mansion - you should hear:
   - Background music playing continuously
   - Room ambience changing as you move
   - Click sounds on buttons
   - Evidence collection sounds

---

## License Requirements

When replacing placeholder audio:
- ✅ CC0 (Public Domain) - No attribution needed
- ✅ CC-BY - Attribution required (add to credits)
- ❌ Copyrighted - Don't use
- ❌ "Free for non-commercial" - Don't use (game is commercial project)

### Attribution File:
If you use CC-BY licensed audio, create `AUDIO_CREDITS.md` in this directory with:
```markdown
# Audio Credits

## Background Music
- "Title" by Artist Name (freesound.org)
  License: CC-BY 4.0

## Ambience
...
```

---

## Notes

The placeholder sounds are **intentionally simple** - they prove the system works without adding size to the repo. Replace them at your convenience with proper atmospheric audio for the full noir detective experience.

The system is designed to handle missing files gracefully (silent fallback), so you can upgrade files one at a time without breaking anything.
