/**
 * TestimonyVideo Component
 *
 * Displays a generated video based on character testimony.
 * Shows loading state during generation and handles playback.
 */

import { useState, useRef, useEffect } from 'react'
import {
  generateTestimonyVideo,
  generateTestimonyImage,
  checkVideoStatus,
  type VideoGenerationResponse,
} from '../../api/client'

interface TestimonyVideoProps {
  characterId: string
  characterName: string
  testimony: string
  question?: string
  testimonyId?: string
  autoPlay?: boolean
  fallbackToImage?: boolean
  onVideoReady?: (url: string) => void
  onError?: (error: string) => void
}

type GenerationState =
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'ready'
  | 'error'
  | 'fallback'

export function TestimonyVideo({
  characterId,
  characterName,
  testimony,
  question,
  testimonyId,
  autoPlay = true,
  fallbackToImage = true,
  onVideoReady,
  onError,
}: TestimonyVideoProps) {
  const [state, setState] = useState<GenerationState>('idle')
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<VideoGenerationResponse['analysis'] | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollInterval = useRef<NodeJS.Timeout | null>(null)

  // Generate video on mount or when testimony changes
  useEffect(() => {
    generateVideo()

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [characterId, testimony])

  async function generateVideo() {
    setState('analyzing')
    setProgress(10)
    setError(null)

    try {
      const result = await generateTestimonyVideo(
        characterId,
        testimony,
        question,
        testimonyId
      )

      if (result.success && result.videoUrl) {
        // Video generated successfully
        setVideoUrl(result.videoUrl)
        setAnalysis(result.analysis || null)
        setState('ready')
        setProgress(100)
        onVideoReady?.(result.videoUrl)
      } else if (result.success && result.videoData) {
        // Got a text description fallback (Veo not available)
        setAnalysis(result.analysis || null)
        setDescription(result.videoData)
        setState('fallback')
        setProgress(100)
      } else if (result.generationId && !result.success) {
        // Video is still generating, poll for status
        setState('generating')
        setProgress(20)
        pollForCompletion(result.generationId)
      } else if (result.error) {
        throw new Error(result.error)
      } else {
        // No video, no error - just show fallback
        setAnalysis(result.analysis || null)
        setState('fallback')
        setProgress(100)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Video generation failed'
      console.error('Video generation error:', err)

      // Try image fallback
      if (fallbackToImage) {
        await generateImageFallback()
      } else {
        setState('error')
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }
  }

  async function pollForCompletion(generationId: string) {
    pollInterval.current = setInterval(async () => {
      try {
        const status = await checkVideoStatus(generationId)

        if (status.progress) {
          setProgress(Math.min(95, 20 + status.progress * 0.75))
        }

        if (status.status === 'completed' && status.videoUrl) {
          clearInterval(pollInterval.current!)
          setVideoUrl(status.videoUrl)
          setState('ready')
          setProgress(100)
          onVideoReady?.(status.videoUrl)
        } else if (status.status === 'failed') {
          clearInterval(pollInterval.current!)

          if (fallbackToImage) {
            await generateImageFallback()
          } else {
            setState('error')
            setError(status.error || 'Video generation failed')
            onError?.(status.error || 'Video generation failed')
          }
        }
      } catch (err) {
        console.error('Error polling video status:', err)
        clearInterval(pollInterval.current!)

        if (fallbackToImage) {
          await generateImageFallback()
        } else {
          setState('error')
          setError('Failed to check video status')
        }
      }
    }, 3000) // Poll every 3 seconds
  }

  async function generateImageFallback() {
    setState('analyzing')
    setProgress(50)

    try {
      const result = await generateTestimonyImage(characterId, testimony, question)

      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl)
        setAnalysis(result.analysis || null)
        setState('fallback')
        setProgress(100)
      } else {
        throw new Error(result.error || 'Image generation failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image generation failed'
      setState('error')
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  // Render loading state
  if (state === 'idle' || state === 'analyzing' || state === 'generating') {
    return (
      <div className="relative aspect-video bg-noir-charcoal rounded-lg overflow-hidden border border-noir-slate">
        {/* Noir-style loading animation */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-4">
            {/* Film reel animation */}
            <div className="absolute inset-0 border-4 border-noir-gold/30 rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-t-noir-gold border-transparent rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            <div className="absolute inset-4 bg-noir-gold/20 rounded-full" />
          </div>

          <p className="text-noir-cream/80 text-sm font-serif">
            {state === 'analyzing' && 'Analyzing testimony...'}
            {state === 'generating' && 'Generating memory...'}
          </p>

          {/* Progress bar */}
          <div className="w-48 h-1 bg-noir-slate/50 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-noir-gold transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-noir-cream/50 text-xs mt-2">
            "{characterName} recalls..."
          </p>
        </div>
      </div>
    )
  }

  // Render error state
  if (state === 'error') {
    return (
      <div className="relative aspect-video bg-noir-charcoal rounded-lg overflow-hidden border border-noir-blood/50">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="text-noir-blood text-4xl mb-3">!</div>
          <p className="text-noir-cream/80 text-sm text-center">
            Memory visualization failed
          </p>
          <p className="text-noir-cream/50 text-xs text-center mt-1">
            {error}
          </p>
          <button
            onClick={generateVideo}
            className="mt-4 px-4 py-2 bg-noir-gold/20 text-noir-gold text-sm rounded hover:bg-noir-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render text/image fallback
  if (state === 'fallback') {
    return (
      <div className="bg-noir-charcoal rounded-lg overflow-hidden border border-noir-slate">
        {imageUrl ? (
          <div className="relative aspect-video">
            <img
              src={imageUrl}
              alt={`${characterName}'s memory`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-noir-black/60 to-transparent" />
          </div>
        ) : (
          <div className="p-4">
            {/* Visual description header */}
            <div className="flex items-center gap-2 mb-3 text-noir-gold">
              <span className="text-lg">🎬</span>
              <span className="text-sm font-serif">{characterName}'s Memory</span>
            </div>

            {/* Scene analysis badges */}
            {analysis && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-0.5 bg-noir-slate/50 text-noir-cream/70 text-xs rounded">
                  📍 {analysis.location}
                </span>
                <span className="px-2 py-0.5 bg-noir-slate/50 text-noir-cream/70 text-xs rounded">
                  🕐 {analysis.timeOfDay}
                </span>
                {analysis.mood && (
                  <span className="px-2 py-0.5 bg-noir-slate/50 text-noir-cream/70 text-xs rounded">
                    {analysis.mood}
                  </span>
                )}
              </div>
            )}

            {/* Visual description text */}
            {description && (
              <div className="text-noir-cream/80 text-sm leading-relaxed max-h-48 overflow-y-auto prose-sm">
                {description.split('\n').slice(0, 8).map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            )}

            {/* Key visual elements */}
            {analysis?.keyVisualElements && analysis.keyVisualElements.length > 0 && (
              <div className="mt-3 pt-3 border-t border-noir-slate/30">
                <p className="text-xs text-noir-smoke mb-2">Key Details:</p>
                <ul className="text-xs text-noir-cream/60 space-y-1">
                  {analysis.keyVisualElements.slice(0, 3).map((element, i) => (
                    <li key={i}>• {element}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render video player
  if (state === 'ready' && videoUrl) {
    return (
      <div className="relative aspect-video bg-noir-black rounded-lg overflow-hidden border border-noir-slate group">
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay={autoPlay}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => {
            if (fallbackToImage) {
              generateImageFallback()
            } else {
              setState('error')
              setError('Video playback failed')
            }
          }}
        />

        {/* Sepia/noir overlay for atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-t from-noir-black/40 to-transparent pointer-events-none" />

        {/* Controls overlay (visible on hover) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-noir-black/30">
          <button
            onClick={() => {
              if (videoRef.current?.paused) {
                videoRef.current.play()
              } else {
                videoRef.current?.pause()
              }
            }}
            className="p-4 bg-noir-black/50 rounded-full text-noir-cream hover:bg-noir-black/70 transition-colors"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>

        {/* Character label */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
          <p className="text-noir-cream/80 text-xs font-serif italic">
            {characterName}'s memory
          </p>
          {analysis && (
            <p className="text-noir-cream/50 text-xs">
              {analysis.location} - {analysis.timeOfDay}
            </p>
          )}
        </div>

        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none animate-pulse" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      </div>
    )
  }

  return null
}
