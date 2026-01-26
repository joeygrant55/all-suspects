# PersonaPlex Integration — Voice-Powered NPCs

All Suspects now supports **real-time voice conversations** with NPCs using NVIDIA PersonaPlex. Players can actually *talk* to suspects, interrupt them, and hear responses in unique character voices.

## What PersonaPlex Enables

- **Full-duplex conversation** — speak and listen simultaneously, no turn-taking
- **Natural interruptions** — cut off NPCs mid-sentence like real conversation
- **6 unique character voices** — each suspect has their own distinct voice
- **Persona-aware responses** — NPCs stay in character with consistent personalities
- **Low latency** — feels like talking to a real person

## Quick Start

### 1. Install PersonaPlex Server

```bash
# Clone the PersonaPlex repo
git clone https://github.com/NVIDIA/personaplex.git
cd personaplex

# Install dependencies
pip install moshi/.

# Accept the Hugging Face license
# Go to: https://huggingface.co/nvidia/personaplex-7b-v1
# Then set your token:
export HF_TOKEN=<your-huggingface-token>

# On Mac, also install Opus
brew install opus
```

### 2. Launch PersonaPlex Server

```bash
# Create temp SSL certs and launch
SSL_DIR=$(mktemp -d); python -m moshi.server --ssl "$SSL_DIR"
```

The server will start on `https://localhost:8998`.

**Low VRAM?** Use CPU offload:
```bash
SSL_DIR=$(mktemp -d); python -m moshi.server --ssl "$SSL_DIR" --cpu-offload
```

### 3. Configure All Suspects

Add to your `.env`:
```env
PERSONAPLEX_URL=wss://localhost:8998
```

### 4. Run All Suspects

```bash
npm run dev:all
```

Click the 🎤 button when talking to a character to switch to voice mode!

## Character Voice Assignments

| Character | Voice ID | Description |
|-----------|----------|-------------|
| Victoria Ashford | NATF0 | Formal, aristocratic, cold undertones |
| Thomas Ashford | NATM1 | Charming but nervous energy |
| Eleanor Crane | NATF2 | Clear, intelligent, professional |
| Dr. Marcus Webb | NATM0 | Mature, distinguished, reassuring |
| Lillian Moore | NATF3 | World-weary, hints of bitterness |
| James (Butler) | NATM2 | Dignified, formal, quietly observant |

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────────┐
│                 │ ◄────────────────► │                     │
│   React UI      │     Audio/Text     │   All Suspects      │
│   (Frontend)    │                    │   Server            │
│                 │                    │                     │
└─────────────────┘                    └──────────┬──────────┘
                                                  │
                                                  │ WebSocket
                                                  │ + Character Context
                                                  ▼
                                       ┌─────────────────────┐
                                       │                     │
                                       │   PersonaPlex       │
                                       │   Server            │
                                       │   (NVIDIA)          │
                                       │                     │
                                       └─────────────────────┘
```

**Flow:**
1. Player clicks 🎤 and speaks into mic
2. Audio streams to All Suspects server
3. Server injects character persona + context
4. PersonaPlex generates response in character voice
5. Audio streams back to player in real-time

## Voice Chat vs Text Chat

**Use Voice Chat when:**
- You want an immersive interrogation experience
- Testing character voice personalities
- Demoing the game to others

**Use Text Chat when:**
- You need precise control over questions
- Playing in a quiet environment
- Reviewing contradictions systematically

## Advanced: Custom Voices

PersonaPlex supports custom voice cloning from a 10-second audio sample:

```python
# Generate voice embedding from audio
python -m moshi.encode_voice --input my_voice.wav --output my_voice.pt
```

Then use `my_voice.pt` as the `voicePrompt` in character config.

## Files

```
server/voice/
├── personaplex.ts       # Voice configs + persona prompt builder
├── personaplexClient.ts # WebSocket client for Node.js
└── voiceRoutes.ts       # Express routes + WebSocket handler

src/
├── hooks/useVoiceChat.ts           # React hook for voice
└── components/Chat/VoiceChatPanel.tsx  # Voice UI component
```

## Hardware Requirements

PersonaPlex requires a CUDA-capable GPU:
- **Minimum:** 8GB VRAM (with `--cpu-offload`)
- **Recommended:** 16GB+ VRAM for best latency

For CPU-only (slower but works):
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

## Troubleshooting

**"Connection refused" on localhost:8998**
- Make sure PersonaPlex server is running
- Check if it's using a different port
- Verify SSL certs are created

**Audio not playing**
- Browser needs user interaction before playing audio
- Check browser permissions for microphone
- Try Chrome (best WebAudio support)

**High latency responses**
- Use `--cpu-offload` if GPU VRAM is low
- Reduce other GPU processes
- Consider running PersonaPlex on a separate machine

**"Voice not found for character"**
- Character ID must match: victoria, thomas, eleanor, marcus, lillian, james
- Check CHARACTER_VOICES in server/voice/personaplex.ts

## API Endpoints

```
GET  /api/voice/characters   # List characters + voice configs
GET  /api/voice/status       # Check PersonaPlex server status
GET  /api/voice/config/:id   # Get character's persona prompt (debug)
WS   /voice                  # WebSocket for real-time audio
```

## Credits

- **PersonaPlex** by NVIDIA Research
- **Moshi** architecture by Kyutai (backbone model)
- **All Suspects** voice integration by Slateworks

## Links

- [PersonaPlex GitHub](https://github.com/NVIDIA/personaplex)
- [PersonaPlex Paper](https://research.nvidia.com/labs/adlr/files/personaplex/personaplex_preprint.pdf)
- [Hugging Face Model](https://huggingface.co/nvidia/personaplex-7b-v1)
- [Discord Community](https://discord.gg/5jAXrrbwRb)
