/**
 * Daily Challenge Leaderboard
 *
 * Shows top 20 scores for today's mystery.
 * Highlights the current player's position if they've submitted.
 */

import { useState, useEffect } from 'react'
import { getTodayUTC, getDayNumber } from '../../game/dailyChallenge'

const API_BASE = import.meta.env.VITE_API_URL || 'https://all-suspects-production.up.railway.app'

interface LeaderboardEntry {
  position: number
  nickname: string
  score: number
  rank: string
  solveTime: string
  dayNumber: number
}

interface LeaderboardData {
  date: string
  entries: LeaderboardEntry[]
  totalEntries: number
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  highlightNickname?: string  // Player's own nickname to highlight their row
}

const RANK_COLORS: Record<string, string> = {
  S: 'text-yellow-300',
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-gray-300',
  D: 'text-orange-400',
  F: 'text-red-400',
}

const MEDAL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export function Leaderboard({ isOpen, onClose, highlightNickname }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = getTodayUTC()
  const dayNumber = getDayNumber(today)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/daily/leaderboard?date=${today}`)
      .then(r => r.json())
      .then((d: LeaderboardData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load leaderboard.')
        setLoading(false)
      })
  }, [isOpen, today])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-noir-dark border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-noir-dark border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide">
                🏆 Daily Leaderboard
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Mystery #{dayNumber} — {today}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-2xl mb-2">🔍</div>
              <p>Loading scores...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-400">
              <div className="text-2xl mb-2">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && data && data.entries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-3">🕵️</div>
              <p className="text-white font-medium mb-1">No scores yet today.</p>
              <p className="text-sm">Be the first to solve the daily mystery!</p>
            </div>
          )}

          {!loading && !error && data && data.entries.length > 0 && (
            <div className="space-y-1">
              {data.entries.map(entry => {
                const isMe = highlightNickname &&
                  entry.nickname.toLowerCase() === highlightNickname.toLowerCase()
                return (
                  <div
                    key={`${entry.position}-${entry.nickname}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      isMe
                        ? 'bg-amber-900/40 border border-amber-600/50'
                        : 'bg-gray-900/50 hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Position */}
                    <div className="w-8 text-center flex-shrink-0">
                      {MEDAL[entry.position] ? (
                        <span className="text-lg">{MEDAL[entry.position]}</span>
                      ) : (
                        <span className="text-gray-500 text-sm font-mono">
                          #{entry.position}
                        </span>
                      )}
                    </div>

                    {/* Nickname */}
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium truncate block ${isMe ? 'text-amber-300' : 'text-white'}`}>
                        {entry.nickname}
                        {isMe && <span className="text-amber-500 text-xs ml-1.5">(you)</span>}
                      </span>
                    </div>

                    {/* Rank badge */}
                    <div className={`text-sm font-bold w-5 text-center ${RANK_COLORS[entry.rank] || 'text-gray-300'}`}>
                      {entry.rank}
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-mono text-sm">{entry.score}</div>
                      <div className="text-gray-500 text-xs">{entry.solveTime}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && data.totalEntries > 20 && (
          <div className="border-t border-gray-700 px-6 py-3 text-center text-gray-500 text-xs">
            Showing top 20 of {data.totalEntries} detectives
          </div>
        )}

        {/* Close */}
        <div className="border-t border-gray-700 px-6 py-3">
          <button
            onClick={onClose}
            className="w-full text-gray-400 hover:text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
