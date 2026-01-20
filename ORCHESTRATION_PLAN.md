# Video-First Interrogation: Veo 3 Integration Plan

## Current Status

The video-first interrogation system is mostly implemented, but **Veo 3 video generation is not working**. Currently:
- Voice generation via ElevenLabs works
- Claude agent responses work
- Video generation falls back to text descriptions instead of actual videos

## Root Cause

In `server/video/veoClient.ts`, the `generateVideo()` function:
1. Tries to call non-existent model endpoints (`veo-2.0-generate-001`, `veo-3`, `imagen-video`)
2. Falls back to generating text descriptions via `gemini-2.0-flash`
3. Never returns an actual `videoUrl` - only `videoData` (text)

The Veo 3 API requires specific REST calls to the `generativelanguage.googleapis.com` endpoint.

## Task List

### Task 1: Fix Veo 3 API Integration (IN PROGRESS)
**File**: `server/video/veoClient.ts`

**Changes needed**:
1. Use proper REST API for Veo 3: `POST https://generativelanguage.googleapis.com/v1beta/models/veo-002:generateContent`
2. Handle async video generation (operations endpoint)
3. Poll for completion and retrieve video URL
4. Store completed video URLs in the generation queue

**API Structure**:
```typescript
// Start generation
POST /v1beta/models/veo-002:generateContent
{
  "contents": [{"parts": [{"text": "prompt"}]}],
  "generationConfig": {
    "responseModalities": ["video"],
    "videoDuration": 5
  }
}

// Returns operation name, poll for completion
GET /v1beta/operations/{operationName}
```

### Task 2: Update Video Status Polling
**File**: `server/index.ts`

Ensure `/api/video/status/:id` returns the `videoUrl` when ready.

### Task 3: Update VideoInterrogationView
**File**: `src/components/VideoPlayer/VideoInterrogationView.tsx`

Ensure it transitions properly when video URL becomes available.

### Task 4: Test End-to-End Flow
1. Start dev server: `npm run dev:all`
2. Open interrogation modal
3. Ask a question
4. Verify: Voice plays immediately
5. Verify: "Video generating..." indicator shows
6. Verify: Video appears when ready

## Files to Modify

| File | Priority | Description |
|------|----------|-------------|
| `server/video/veoClient.ts` | HIGH | Fix Veo 3 REST API calls |
| `server/index.ts` | MEDIUM | Ensure video status endpoint works |
| `src/components/VideoPlayer/VideoInterrogationView.tsx` | LOW | Already handles polling, may need tweaks |

## Environment Requirements

```env
GEMINI_API_KEY=your-key-here  # Required for Veo 3
ELEVENLABS_API_KEY=your-key   # Required for voice
ANTHROPIC_API_KEY=your-key    # Required for Claude
```

## Parallel Work Opportunities

These tasks can be done independently:
- **Terminal 1**: Fix veoClient.ts (Veo 3 API)
- **Terminal 2**: UI improvements to video viewport
- **Terminal 3**: Pre-generation caching system
- **Terminal 4**: Character intro videos
- **Terminal 5**: Testing and QA

## Success Criteria

1. Ask a question in interrogation modal
2. Voice plays within 1-3 seconds
3. Video generation indicator shows
4. Video appears within 15-30 seconds
5. Video plays with subtitles
6. "Replay" works after completion
