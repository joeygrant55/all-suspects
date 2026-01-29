import { useState, useEffect } from 'react'
import { useScoreStore } from '../../game/scoreState'

export function GameTimer() {
  const { gameStartTime, isPaused, getElapsedTimeMs } = useScoreStore()
  const [displayTime, setDisplayTime] = useState('0:00')

  useEffect(() => {
    if (!gameStartTime) {
      setDisplayTime('0:00')
      return
    }

    const updateTimer = () => {
      const elapsed = getElapsedTimeMs()
      const totalSeconds = Math.floor(elapsed / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setDisplayTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    // Update immediately
    updateTimer()

    // Update every second if not paused
    if (!isPaused) {
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [gameStartTime, isPaused, getElapsedTimeMs])

  if (!gameStartTime) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-noir-charcoal/50 border border-noir-slate/50">
      <span className="text-noir-gold text-xs">⏱</span>
      <span
        className="text-noir-cream text-xs md:text-sm font-mono tabular-nums"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {displayTime}
      </span>
    </div>
  )
}
