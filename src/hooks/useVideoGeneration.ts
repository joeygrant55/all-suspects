/**
 * useVideoGeneration Hook
 *
 * Manages the video generation workflow for interrogations.
 * Handles voice-first playback, video generation, and fallback tiers.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useVideoState, GENERATION_PRIORITY } from '../game/videoState'
import type { VideoEntry } from '../game/videoState'
import { sendChatVideo, type ChatVideoResponse } from '../api/client'

export type GenerationStage =
  | 'idle'
  | 'sending'
  | 'voice-ready'
  | 'video-generating'
  | 'video-ready'
  | 'complete'
  | 'error'

export interface VideoGenerationState {
  stage: GenerationStage
  responseText: string
  voiceAudioBase64: string | null
  videoGenerationId: string | null
  videoUrl: string | null
  analysis: ChatVideoResponse['analysis'] | null
  contradictions: ChatVideoResponse['contradictions']
  pressure: ChatVideoResponse['pressure'] | null
  error: string | null
}

export interface UseVideoGenerationOptions {
  characterId: string
  onContradiction?: (contradictions: NonNullable<ChatVideoResponse['contradictions']>) => void
  onPressureUpdate?: (pressure: NonNullable<ChatVideoResponse['pressure']>) => void
  onError?: (error: string) => void
}

export function useVideoGeneration({
  characterId,
  onContradiction,
  onPressureUpdate,
  onError,
}: UseVideoGenerationOptions) {
  const [state, setState] = useState<VideoGenerationState>({
    stage: 'idle',
    responseText: '',
    voiceAudioBase64: null,
    videoGenerationId: null,
    videoUrl: null,
    analysis: null,
    contradictions: undefined,
    pressure: null,
    error: null,
  })

  const { addToCache, getFromCache, getCacheKey, hasCached, queueGeneration } = useVideoState()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Send a question and get a video-first response
   */
  const askQuestion = useCallback(async (question: string): Promise<VideoGenerationState | null> => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Check cache first
    const cacheKey = getCacheKey(characterId, question)
    const cached = getFromCache(cacheKey)
    if (cached && cached.status === 'ready') {
      const cachedState: VideoGenerationState = {
        stage: 'complete',
        responseText: cached.responseText,
        voiceAudioBase64: cached.voiceAudioBase64 || null,
        videoGenerationId: cached.videoGenerationId || null,
        videoUrl: cached.videoUrl || null,
        analysis: null,
        contradictions: undefined,
        pressure: null,
        error: null,
      }
      setState(cachedState)
      return cachedState
    }

    // Start fresh
    setState({
      stage: 'sending',
      responseText: '',
      voiceAudioBase64: null,
      videoGenerationId: null,
      videoUrl: null,
      analysis: null,
      contradictions: undefined,
      pressure: null,
      error: null,
    })

    try {
      const response = await sendChatVideo(characterId, question)

      // Handle contradictions
      if (response.contradictions && response.contradictions.length > 0) {
        onContradiction?.(response.contradictions)
      }

      // Handle pressure update
      if (response.pressure) {
        onPressureUpdate?.(response.pressure)
      }

      // Update state with response
      const newState: VideoGenerationState = {
        stage: response.voiceAudioBase64 ? 'voice-ready' : 'video-generating',
        responseText: response.message,
        voiceAudioBase64: response.voiceAudioBase64 || null,
        videoGenerationId: response.videoGenerationId || null,
        videoUrl: null,
        analysis: response.analysis || null,
        contradictions: response.contradictions,
        pressure: response.pressure || null,
        error: null,
      }
      setState(newState)

      // Cache the entry
      const entry: VideoEntry = {
        id: cacheKey,
        characterId,
        question,
        responseText: response.message,
        voiceAudioBase64: response.voiceAudioBase64,
        videoGenerationId: response.videoGenerationId,
        status: 'generating-video',
        createdAt: Date.now(),
      }
      addToCache(entry)

      return newState
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      const errorState: VideoGenerationState = {
        stage: 'error',
        responseText: '',
        voiceAudioBase64: null,
        videoGenerationId: null,
        videoUrl: null,
        analysis: null,
        contradictions: undefined,
        pressure: null,
        error: errorMessage,
      }
      setState(errorState)
      onError?.(errorMessage)
      return errorState
    }
  }, [characterId, getCacheKey, getFromCache, addToCache, onContradiction, onPressureUpdate, onError])

  /**
   * Update when video is ready
   */
  const setVideoReady = useCallback((videoUrl: string) => {
    setState((prev) => ({
      ...prev,
      stage: 'video-ready',
      videoUrl,
    }))

    // Update cache
    const cacheKey = getCacheKey(characterId, state.responseText)
    const cached = getFromCache(cacheKey)
    if (cached) {
      addToCache({
        ...cached,
        videoUrl,
        status: 'ready',
      })
    }
  }, [characterId, getCacheKey, getFromCache, addToCache, state.responseText])

  /**
   * Mark playback as complete
   */
  const setComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: 'complete',
    }))
  }, [])

  /**
   * Reset state for new question
   */
  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      responseText: '',
      voiceAudioBase64: null,
      videoGenerationId: null,
      videoUrl: null,
      analysis: null,
      contradictions: undefined,
      pressure: null,
      error: null,
    })
  }, [])

  /**
   * Pre-generate video for anticipated questions
   */
  const pregenerate = useCallback((questions: string[], priority: number = GENERATION_PRIORITY.LOW) => {
    for (const question of questions) {
      if (!hasCached(characterId, question)) {
        queueGeneration({
          characterId,
          question,
          priority,
        })
      }
    }
  }, [characterId, hasCached, queueGeneration])

  return {
    state,
    askQuestion,
    setVideoReady,
    setComplete,
    reset,
    pregenerate,
    isLoading: state.stage === 'sending' || state.stage === 'video-generating',
    hasVoice: state.voiceAudioBase64 !== null,
    hasVideo: state.videoUrl !== null,
  }
}
