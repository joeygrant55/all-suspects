import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/state'
import { useScoreStore } from '../game/scoreState'

/**
 * Hook that subscribes to game store events and triggers score tracking.
 * Should be used once at the App level.
 */
export function useScoreTracking() {
  const scoreStore = useScoreStore()
  const gameStore = useGameStore()

  // Track previous values to detect changes
  const prevValues = useRef({
    gameStarted: false,
    evidenceCount: 0,
    contradictionCount: 0,
    messageCount: 0,
    gameComplete: false,
    accusationAttempts: 0,
    currentRoom: '',
    wasGameStarted: false,
  })

  useEffect(() => {
    const prev = prevValues.current

    // Reset score when game is reset (gameStarted goes from true to false)
    if (prev.wasGameStarted && !gameStore.gameStarted) {
      scoreStore.resetScore()
    }

    // Start timer when game starts
    if (gameStore.gameStarted && !prev.gameStarted) {
      scoreStore.startTimer()
      scoreStore.resetScore()
    }

    // Track evidence found
    if (gameStore.collectedEvidence.length > prev.evidenceCount) {
      scoreStore.recordEvidenceFound()
    }

    // Track contradictions discovered
    if (gameStore.contradictions.length > prev.contradictionCount) {
      scoreStore.recordContradiction()
    }

    // Track questions asked (player messages)
    const playerMessages = gameStore.messages.filter((m) => m.role === 'player')
    if (playerMessages.length > prev.messageCount) {
      scoreStore.recordQuestion()
    }

    // Track wrong accusations
    if (
      gameStore.accusationAttempts > prev.accusationAttempts &&
      !gameStore.gameComplete
    ) {
      scoreStore.recordWrongAccusation()
    }

    // End timer when game is completed
    if (gameStore.gameComplete && !prev.gameComplete) {
      scoreStore.endTimer()
    }

    // Track room exploration
    if (gameStore.currentRoom && gameStore.currentRoom !== prev.currentRoom) {
      scoreStore.recordRoomExplored(gameStore.currentRoom)
    }

    // Update prev values
    prevValues.current = {
      gameStarted: gameStore.gameStarted,
      evidenceCount: gameStore.collectedEvidence.length,
      contradictionCount: gameStore.contradictions.length,
      messageCount: playerMessages.length,
      gameComplete: gameStore.gameComplete,
      accusationAttempts: gameStore.accusationAttempts,
      currentRoom: gameStore.currentRoom,
      wasGameStarted: gameStore.gameStarted,
    }
  }, [
    gameStore.gameStarted,
    gameStore.collectedEvidence.length,
    gameStore.contradictions.length,
    gameStore.messages.length,
    gameStore.gameComplete,
    gameStore.accusationAttempts,
    gameStore.currentRoom,
    scoreStore,
    gameStore.messages,
  ])

  // Pause/resume timer based on screen
  useEffect(() => {
    const isActiveScreen =
      gameStore.currentScreen === 'interrogation' ||
      gameStore.currentScreen === 'map' ||
      gameStore.currentScreen === 'room'

    if (scoreStore.gameStartTime) {
      if (isActiveScreen && scoreStore.isPaused) {
        scoreStore.resumeTimer()
      } else if (!isActiveScreen && !scoreStore.isPaused) {
        scoreStore.pauseTimer()
      }
    }
  }, [gameStore.currentScreen, scoreStore])
}
