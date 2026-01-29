/**
 * IntroVideo Component
 *
 * Displays a cinematic character introduction video
 * when the player first approaches a suspect,
 * followed by a voiced character intro line.
 */

import { useState, useEffect, useRef } from 'react'
import { generateIntroductionVideo } from '../../api/client'

// Character intro lines — spoken via ElevenLabs after video plays
const CHARACTER_INTROS: Record<string, string> = {
  victoria: "Detective. I trust this won't take long. I've just lost my husband, and I have a household to manage. What is it you need?",
  thomas: "Look, I know what people say about me. But I loved my father — despite everything. Just... ask your questions and let me be.",
  eleanor: "I've organized Mr. Ashford's affairs for seven years. I know more about this family than they know about themselves. Where shall we begin?",
  marcus: "I was Edmund's physician and, I dare say, his closest confidant. A terrible loss. I'll help however I can, detective.",
  lillian: "Edmund and I go way back, darling. Before Victoria, before the money, before... all of this. I suppose you want to know about tonight?",
  james: "I have served the Ashford family for thirty-two years, sir. I know every corner of this manor. I am at your disposal.",
}

interface IntroVideoProps {
  characterId: string
  characterName: string
  characterRole: string
  onComplete?: () => void
  onSkip?: () => void
}

type IntroState = 'loading' | 'playing' | 'speaking' | 'complete' | 'error' | 'skipped'

export function IntroVideo({
  characterId,
  characterName,
  characterRole,
  onComplete,
  onSkip,
}: IntroVideoProps) {
  const [state, setState] = useState<IntroState>('loading')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [_error, setError] = useState<string | null>(null)
  const [_introText, setIntroText] = useState<string>('')
  const [displayedText, setDisplayedText] = useState<string>('')
  const [voiceReady, setVoiceReady] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [voiceEnded, setVoiceEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const API_URL = 'http://localhost:3001'

  useEffect(() => {
    // Fetch video and voice in parallel
    loadIntroVideo()
    prefetchVoice()
  }, [characterId])

  async function loadIntroVideo() {
    setState('loading')
    setError(null)

    let retries = 0
    const maxRetries = 12 // ~60 seconds of waiting for pre-gen

    const tryLoad = async () => {
      try {
        const result = await generateIntroductionVideo(characterId)

        if (result.success && result.videoUrl) {
          setVideoUrl(result.videoUrl)
          setState('playing')
          return
        }

        // If pending (still generating), retry after a delay
        if ((result as any).pending && retries < maxRetries) {
          retries++
          setTimeout(tryLoad, 5000)
          return
        }

        throw new Error(result.error || 'Failed to generate introduction')
      } catch (err) {
        console.error('Intro video error:', err)
        // On error, skip to voice-only intro
        setState('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
        // Mark video as "ended" so we go to speaking mode
        setVideoEnded(true)
        setTimeout(() => {
          setState('speaking')
          startVoicePlayback()
          // If voice also fails/not ready, auto-complete
          setTimeout(() => {
            setVoiceEnded(true)
          }, 5000)
        }, 1500)
      }
    }

    tryLoad()
  }

  // Pre-fetch voice audio so it's ready when video starts
  async function prefetchVoice() {
    const text = CHARACTER_INTROS[characterId]
    if (!text) {
      setVoiceReady(true)
      setVoiceEnded(true)
      return
    }
    
    setIntroText(text)
    
    try {
      const response = await fetch(`${API_URL}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, text }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        )
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        audio.volume = 0.85
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          setVoiceEnded(true)
          if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
          setDisplayedText(text)
        }
        
        audio.onerror = () => {
          setVoiceEnded(true)
          if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
          setDisplayedText(text)
        }
        
        setVoiceReady(true)
      } else {
        setVoiceReady(true)
        setVoiceEnded(true)
      }
    } catch {
      setVoiceReady(true)
      setVoiceEnded(true)
    }
  }

  // Start voice playback + typewriter (called when video starts or as standalone)
  function startVoicePlayback() {
    const text = CHARACTER_INTROS[characterId]
    if (!text) return
    
    // Start typewriter
    let i = 0
    typeIntervalRef.current = setInterval(() => {
      i++
      setDisplayedText(text.slice(0, i))
      if (i >= text.length) {
        if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
      }
    }, 30)
    
    // Play audio if ready
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        setVoiceEnded(true)
      })
    }
  }

  // When both video and voice finish, complete the intro
  useEffect(() => {
    if (videoEnded && voiceEnded) {
      setTimeout(() => onComplete?.(), 800)
    }
  }, [videoEnded, voiceEnded])

  function handleVideoEnd() {
    setVideoEnded(true)
  }
  
  // Handle video play start — trigger voice simultaneously
  function handleVideoPlay() {
    if (voiceReady) {
      startVoicePlayback()
    }
  }
  
  // If voice becomes ready while video is already playing
  useEffect(() => {
    if (voiceReady && state === 'playing' && videoRef.current && !videoRef.current.paused) {
      startVoicePlayback()
    }
  }, [voiceReady, state])

  function handleSkip() {
    setState('skipped')
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    onSkip?.()
    onComplete?.()
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center">
        {/* Dramatic opening curtain effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-noir-charcoal animate-slide-left" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-noir-charcoal animate-slide-right" />
        </div>

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-noir-gold/30 border-t-noir-gold rounded-full animate-spin mx-auto mb-6" />
          <p className="text-noir-gold font-serif text-xl tracking-widest">
            {characterName.toUpperCase()}
          </p>
          <p className="text-noir-cream/60 text-sm mt-2">
            {characterRole}
          </p>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 text-noir-cream/40 hover:text-noir-cream transition-colors text-sm"
        >
          Skip intro
        </button>
      </div>
    )
  }

  // Error state (brief display before auto-continuing)
  if (state === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center">
        <p className="text-noir-gold font-serif text-2xl mb-2">
          {characterName}
        </p>
        <p className="text-noir-cream/60 text-sm">
          {characterRole}
        </p>
      </div>
    )
  }

  // Speaking state — character intro voiceover
  if (state === 'speaking') {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black flex flex-col items-center justify-center">
        {/* Character portrait area */}
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full border-2 border-noir-gold/60 overflow-hidden mx-auto mb-4">
            <img 
              src={`/portraits/${characterId}.png`} 
              alt={characterName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <p className="text-noir-gold font-serif text-2xl tracking-widest text-center">
            {characterName.toUpperCase()}
          </p>
          <p className="text-noir-cream/50 text-sm text-center mt-1">
            {characterRole}
          </p>
        </div>

        {/* Speech bubble / dialogue area */}
        <div className="max-w-2xl mx-auto px-8">
          <div className="relative bg-noir-charcoal/60 border border-noir-gold/20 rounded-lg p-6">
            {/* Decorative quote marks */}
            <span className="absolute -top-4 left-4 text-noir-gold/40 text-5xl font-serif">&ldquo;</span>
            <p className="text-noir-cream/90 font-serif text-lg leading-relaxed italic pl-6">
              {displayedText}
              <span className="inline-block w-0.5 h-5 bg-noir-gold/60 ml-1 animate-pulse" />
            </p>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 text-noir-cream/40 hover:text-noir-cream transition-colors text-sm"
        >
          Skip
        </button>
      </div>
    )
  }

  // Playing/complete state
  if ((state === 'playing' || state === 'complete') && videoUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-noir-black">
        {/* Full-screen video */}
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onPlay={handleVideoPlay}
          onEnded={handleVideoEnd}
          onError={() => {
            setState('error')
            setError('Video playback failed')
            setVideoEnded(true)
            setState('speaking')
            startVoicePlayback()
          }}
        />

        {/* Noir overlay effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-noir-black/60" />

          {/* Letterbox bars for cinematic feel */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-noir-black" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-noir-black" />
        </div>

        {/* Character name + subtitle dialogue */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 pointer-events-none">
          {!displayedText && (
            <div className="text-center animate-fade-in-up mb-4">
              <p className="text-noir-gold font-serif text-4xl tracking-widest mb-2">
                {characterName.toUpperCase()}
              </p>
              <p className="text-noir-cream/70 text-lg tracking-wide">
                {characterRole}
              </p>
            </div>
          )}
          {displayedText && (
            <div className="max-w-3xl mx-auto px-8 mb-4">
              <p className="text-center text-noir-gold/80 font-serif text-sm tracking-wider mb-2">
                {characterName}
              </p>
              <div className="bg-noir-black/70 backdrop-blur-sm rounded px-6 py-3 border border-noir-gold/10">
                <p className="text-noir-cream/95 font-serif text-lg leading-relaxed italic text-center">
                  &ldquo;{displayedText}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute bottom-20 right-8 text-noir-cream/40 hover:text-noir-cream transition-colors text-sm z-10"
        >
          Skip
        </button>

        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
      </div>
    )
  }

  return null
}

// Add these animations to your CSS/Tailwind config
export const animationStyles = `
@keyframes slide-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes slide-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-left {
  animation: slide-left 1.5s ease-out forwards;
}

.animate-slide-right {
  animation: slide-right 1.5s ease-out forwards;
}

.animate-fade-in-up {
  animation: fade-in-up 1s ease-out 0.5s forwards;
  opacity: 0;
}
`
