/**
 * VideoInterrogationView Component
 *
 * Main video viewport component for video-first interrogations.
 * Handles the full flow: voice-first playback, video transition, and subtitles.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { VoiceWaveform } from './VoiceWaveform'
import { CinematicLoader } from './CinematicLoader'
import { Subtitles } from './Subtitles'
import { checkVideoStatus } from '../../api/client'

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'voice-only'
  | 'transitioning'
  | 'video'
  | 'complete'
  | 'error'

export interface VideoInterrogationViewProps {
  characterId: string
  characterName: string
  responseText: string
  voiceAudioBase64?: string | null
  videoGenerationId?: string | null
  videoUrl?: string | null
  onPlaybackComplete?: () => void
  onVideoReady?: (url: string) => void
  autoPlay?: boolean
}

export function VideoInterrogationView({
  characterId,
  characterName,
  responseText,
  voiceAudioBase64,
  videoGenerationId,
  videoUrl: initialVideoUrl,
  onPlaybackComplete,
  onVideoReady,
  autoPlay = true,
}: VideoInterrogationViewProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null)
  const [progress, setProgress] = useState(0)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use refs to track current state for polling callback (avoid stale closures)
  const isVoicePlayingRef = useRef(isVoicePlaying)
  const playbackStateRef = useRef(playbackState)

  // Keep refs in sync with state
  useEffect(() => {
    isVoicePlayingRef.current = isVoicePlaying
  }, [isVoicePlaying])

  useEffect(() => {
    playbackStateRef.current = playbackState
  }, [playbackState])

  // Transition to video playback
  const transitionToVideo = useCallback(() => {
    setPlaybackState('transitioning')
    setTimeout(() => {
      setPlaybackState('video')
    }, 500)
  }, [])

  // Play voice audio
  const playVoice = useCallback((base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const audioData = atob(base64Audio)
        const arrayBuffer = new Uint8Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          arrayBuffer[i] = audioData.charCodeAt(i)
        }
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' })
        const audioUrl = URL.createObjectURL(blob)

        const audio = new Audio(audioUrl)
        audioRef.current = audio

        // Set up audio context for waveform analysis
        try {
          audioContextRef.current = new AudioContext()
          analyserRef.current = audioContextRef.current.createAnalyser()
          const source = audioContextRef.current.createMediaElementSource(audio)
          source.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
        } catch (e) {
          console.warn('Could not set up audio analyzer:', e)
        }

        audio.onplay = () => setIsVoicePlaying(true)

        audio.onended = () => {
          setIsVoicePlaying(false)
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = () => {
          setIsVoicePlaying(false)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Audio playback failed'))
        }

        audio.play().catch(reject)
      } catch (err) {
        reject(err)
      }
    })
  }, [])

  // Start playback sequence
  const startPlayback = useCallback(async () => {
    setPlaybackState('loading')
    setProgress(10)
    setError(null)

    // If we already have video URL, go straight to video
    if (initialVideoUrl) {
      setVideoUrl(initialVideoUrl)
      setPlaybackState('video')
      setProgress(100)
      return
    }

    // Start voice playback if available
    if (voiceAudioBase64) {
      setPlaybackState('voice-only')
      setProgress(30)
      try {
        await playVoice(voiceAudioBase64)
        // Voice finished - check if video is ready now
        // The polling effect will handle transition if video completed
        if (!videoGenerationId) {
          setPlaybackState('complete')
          onPlaybackComplete?.()
        }
      } catch (err) {
        console.warn('Voice playback interrupted:', err)
        // Continue without voice
      }
    } else if (videoGenerationId) {
      setPlaybackState('loading')
      setProgress(20)
    } else {
      // No voice, no video - just show complete
      setPlaybackState('complete')
      setProgress(100)
    }
  }, [initialVideoUrl, voiceAudioBase64, videoGenerationId, playVoice, onPlaybackComplete])

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
  }, [])

  // Start playback when props change
  useEffect(() => {
    if (autoPlay && (voiceAudioBase64 || videoGenerationId || initialVideoUrl)) {
      startPlayback()
    }

    return cleanup
  }, [autoPlay, voiceAudioBase64, videoGenerationId, initialVideoUrl, startPlayback, cleanup])

  // Poll for video completion
  useEffect(() => {
    if (!videoGenerationId || videoUrl) return

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkVideoStatus(videoGenerationId)

        if (status.progress) {
          setProgress(Math.min(95, 20 + status.progress * 0.75))
        }

        if (status.status === 'completed' && status.videoUrl) {
          // Use refs for current state to avoid stale closures
          const currentIsVoicePlaying = isVoicePlayingRef.current
          const currentPlaybackState = playbackStateRef.current

          clearInterval(pollIntervalRef.current!)
          setVideoUrl(status.videoUrl)
          setProgress(100)
          onVideoReady?.(status.videoUrl)

          // If voice is done, transition to video immediately
          if (!currentIsVoicePlaying && currentPlaybackState === 'voice-only') {
            transitionToVideo()
          }
        } else if (status.status === 'failed') {
          clearInterval(pollIntervalRef.current!)
          console.warn('Video generation failed:', status.error || 'Unknown error')
        }
      } catch (err) {
        console.error('Error polling video status:', err)
      }
    }, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [videoGenerationId, videoUrl, onVideoReady, transitionToVideo])

  // Handle voice finished - transition to video if ready
  useEffect(() => {
    if (!isVoicePlaying && playbackState === 'voice-only' && videoUrl) {
      transitionToVideo()
    }
  }, [isVoicePlaying, playbackState, videoUrl, transitionToVideo])

  // Ensure video plays when entering 'video' state (backup for autoPlay)
  useEffect(() => {
    if (playbackState === 'video' && videoRef.current && videoUrl) {
      const video = videoRef.current
      // Only attempt play if paused (autoPlay might have already started it)
      if (video.paused) {
        video.play().catch((err) => {
          console.warn('Auto-play blocked:', err)
        })
      }
    }
  }, [playbackState, videoUrl])

  const handleVideoEnded = useCallback(() => {
    setPlaybackState('complete')
    onPlaybackComplete?.()
  }, [onPlaybackComplete])

  const handleRetry = useCallback(() => {
    setError(null)
    startPlayback()
  }, [startPlayback])

  const handleReplay = useCallback(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
      setPlaybackState('video')
    } else if (voiceAudioBase64) {
      startPlayback()
    }
  }, [videoUrl, voiceAudioBase64, startPlayback])

  // Render based on playback state
  const renderContent = () => {
    switch (playbackState) {
      case 'idle':
        return (
          <div className="w-full h-full flex items-center justify-center bg-noir-black">
            <p className="text-noir-smoke text-sm font-serif italic">
              Awaiting testimony...
            </p>
          </div>
        )

      case 'loading':
        return (
          <CinematicLoader
            characterName={characterName}
            stage={voiceAudioBase64 ? 'generating-voice' : 'analyzing'}
            progress={progress}
          />
        )

      case 'voice-only':
        return (
          <>
            <VoiceWaveform
              characterId={characterId}
              characterName={characterName}
              isPlaying={isVoicePlaying}
              analyserNode={analyserRef.current || undefined}
            />
            <Subtitles
              text={responseText}
              isPlaying={isVoicePlaying}
              typewriterMode={true}
              wordsPerSecond={3}
            />
            {videoGenerationId && !videoUrl && (
              <div className="absolute top-4 right-4 flex items-center gap-2 text-noir-smoke text-xs">
                <div className="w-2 h-2 rounded-full bg-noir-gold/50 animate-pulse" />
                <span>Video generating...</span>
              </div>
            )}
          </>
        )

      case 'transitioning':
        return (
          <div className="w-full h-full flex items-center justify-center bg-noir-black">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-noir-gold/30 border-t-noir-gold rounded-full animate-spin mx-auto mb-4" />
              <p className="text-noir-cream/60 text-sm font-serif">
                Memory materializing...
              </p>
            </div>
          </div>
        )

      case 'video':
        return (
          <>
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              autoPlay
              loop={false}
              muted={false}
              playsInline
              className="w-full h-full object-cover"
              onEnded={handleVideoEnded}
              onError={() => {
                setError('Video playback failed')
                setPlaybackState('voice-only')
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-noir-black/40 to-transparent pointer-events-none" />
            <Subtitles
              text={responseText}
              isPlaying={true}
              typewriterMode={false}
            />
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </>
        )

      case 'complete':
        return (
          <>
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                playsInline
              />
            ) : (
              <VoiceWaveform
                characterId={characterId}
                characterName={characterName}
                isPlaying={false}
              />
            )}
            <Subtitles
              text={responseText}
              isPlaying={false}
              typewriterMode={false}
            />
            <div className="absolute bottom-20 left-0 right-0 flex justify-center">
              <button
                onClick={handleReplay}
                className="px-4 py-2 bg-noir-black/70 text-noir-cream/80 text-sm rounded-full border border-noir-gold/30 hover:bg-noir-gold/20 transition-colors"
              >
                Replay
              </button>
            </div>
          </>
        )

      case 'error':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-noir-black">
            <div className="text-noir-blood text-4xl mb-3">!</div>
            <p className="text-noir-cream/80 text-sm text-center">
              Playback failed
            </p>
            <p className="text-noir-cream/50 text-xs text-center mt-1">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-noir-gold/20 text-noir-gold text-sm rounded hover:bg-noir-gold/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )
    }
  }

  return (
    <div className="relative w-full aspect-video bg-noir-black rounded-lg overflow-hidden border border-noir-slate/50">
      {renderContent()}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  )
}
