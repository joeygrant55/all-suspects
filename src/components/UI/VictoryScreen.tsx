import { useState, useEffect } from 'react'
import { useGameStore } from '../../game/state'
import { useScoreStore } from '../../game/scoreState'
import { EVIDENCE_DATABASE } from '../../data/evidence'
import {
  getDailyChallengeState,
  markDailyChallengeComplete,
  buildShareText,
  getTodayUTC,
} from '../../game/dailyChallenge'
import { submitDailyScore } from '../../api/client'
import { Leaderboard } from './Leaderboard'

interface VictoryScreenProps {
  isOpen: boolean
  onClose: () => void
  onPlayAgain: () => void
}

type ScreenPhase = 'reveal' | 'evidence' | 'score' | 'solution' | 'credits'

export function VictoryScreen({ isOpen, onClose, onPlayAgain }: VictoryScreenProps) {
  const [phase, setPhase] = useState<ScreenPhase>('reveal')
  const [showContent, setShowContent] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [isDailyRun, setIsDailyRun] = useState(false)
  const [dailyDayNumber, setDailyDayNumber] = useState(1)
  const [dailyStreak, setDailyStreak] = useState(0)
  // Leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardNickname, setLeaderboardNickname] = useState('')
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
  const [leaderboardPosition, setLeaderboardPosition] = useState<number | null>(null)
  const [leaderboardSubmitting, setLeaderboardSubmitting] = useState(false)
  const collectedEvidence = useGameStore((state) => state.collectedEvidence)
  const contradictions = useGameStore((state) => state.contradictions)
  const accusationAttempts = useGameStore((state) => state.accusationAttempts)
  const calculateScore = useScoreStore((state) => state.calculateScore)
  const gameScore = calculateScore()

  // Animation sequence + daily challenge completion
  useEffect(() => {
    if (isOpen) {
      setPhase('reveal')
      setShowContent(false)
      const timer = setTimeout(() => setShowContent(true), 500)

      // Check if this was today's daily challenge
      const dailyState = getDailyChallengeState()
      if (dailyState.attempted && !dailyState.completed) {
        markDailyChallengeComplete(gameScore.totalScore, gameScore.rank, gameScore.solveTimeFormatted)
        setIsDailyRun(true)
        setDailyDayNumber(dailyState.dayNumber)
        // After marking complete, streak is updated — re-read
        const updated = getDailyChallengeState()
        setDailyStreak(updated.streak)
      } else if (dailyState.completed) {
        // Already completed (re-opened screen) — still show daily badge
        setIsDailyRun(true)
        setDailyDayNumber(dailyState.dayNumber)
        setDailyStreak(dailyState.streak)
      }

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Get evidence that points to Thomas
  const keyEvidence = collectedEvidence.filter((e) => {
    const data = EVIDENCE_DATABASE[e.source]
    return data?.pointsTo === 'thomas' || data?.relatedCharacter === 'thomas'
  })

  // Convert rank to stars (for backwards compatibility with existing UI)
  const getStarsFromRank = (rank: string): number => {
    const starMap: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }
    return starMap[rank] || 0
  }

  const stars = getStarsFromRank(gameScore.rank)

  // Handle leaderboard submit
  const handleLeaderboardSubmit = async () => {
    if (!isDailyRun || leaderboardSubmitted || leaderboardSubmitting) return
    setLeaderboardSubmitting(true)
    try {
      const result = await submitDailyScore({
        date: getTodayUTC(),
        dayNumber: dailyDayNumber,
        nickname: leaderboardNickname.trim() || 'Anonymous',
        score: gameScore.totalScore,
        rank: gameScore.rank,
        solveTime: gameScore.solveTimeFormatted,
      })
      setLeaderboardPosition(result.position)
      setLeaderboardSubmitted(true)
    } catch (err) {
      console.error('Failed to submit to leaderboard:', err)
    } finally {
      setLeaderboardSubmitting(false)
    }
  }

  // Handle share
  const handleShare = async () => {
    const shareText = isDailyRun
      ? buildShareText(dailyDayNumber, gameScore.totalScore, gameScore.rank, gameScore.solveTimeFormatted, dailyStreak)
      : `🔍 All Suspects — The Ashford Affair
Rank: ${gameScore.rank} (${gameScore.detective_title})
Score: ${gameScore.totalScore}/1000
Time: ${gameScore.solveTimeFormatted}
Evidence: ${collectedEvidence.length}/9 | Contradictions: ${contradictions.length}
allsuspects.slateworks.io`

    try {
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        await navigator.share({ text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-noir-black">
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201, 162, 39, 0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      {/* Golden particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-noir-gold rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
        {/* Phase: Reveal */}
        {phase === 'reveal' && (
          <div
            className={`text-center transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Star */}
            <div
              className="text-8xl mb-8"
              style={{
                textShadow: '0 0 60px rgba(201, 162, 39, 0.8)',
                animation: 'glow 2s ease-in-out infinite',
              }}
            >
              ⭐
            </div>

            {/* Title */}
            {isDailyRun && (
              <div className="mb-4 flex flex-col items-center gap-1">
                <span className="text-xs font-bold tracking-[0.3em] px-3 py-1 bg-lime-400/20 text-lime-400 border border-lime-400/40">
                  DAILY MYSTERY #{dailyDayNumber}
                </span>
                {dailyStreak >= 2 && (
                  <span className="text-xs text-orange-400 font-bold tracking-wide">
                    🔥 {dailyStreak}-day streak!
                  </span>
                )}
              </div>
            )}
            <h1
              className="text-5xl text-noir-gold mb-4 tracking-widest"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: '0 0 40px rgba(201, 162, 39, 0.5)',
              }}
            >
              CASE SOLVED
            </h1>

            <p
              className="text-2xl text-noir-cream mb-8"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              The Ashford Affair
            </p>

            {/* Rating */}
            <div className="mb-12">
              <div className="flex justify-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-3xl transition-all duration-500`}
                    style={{
                      opacity: i < stars ? 1 : 0.3,
                      transform: i < stars ? 'scale(1)' : 'scale(0.8)',
                      transitionDelay: `${i * 200}ms`,
                    }}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <p
                className="text-noir-gold text-lg tracking-widest"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {gameScore.detective_title}
              </p>
            </div>

            {/* Continue button */}
            <button
              onClick={() => {
                setShowContent(false)
                setTimeout(() => {
                  setPhase('score')
                  setTimeout(() => setShowContent(true), 100)
                }, 500)
              }}
              className="px-8 py-4 bg-noir-gold text-noir-black text-lg tracking-widest hover:bg-noir-gold/90 transition-colors"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              VIEW SCORE BREAKDOWN
            </button>
          </div>
        )}

        {/* Phase: Score Breakdown */}
        {phase === 'score' && (
          <div
            className={`w-full max-w-3xl transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2
              className="text-3xl text-noir-gold text-center mb-8 tracking-widest"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              FINAL SCORE
            </h2>

            {/* Big rank display */}
            <div className="text-center mb-8">
              <div
                className="inline-block px-12 py-8 border-4 rounded-sm mb-4"
                style={{
                  borderColor: gameScore.rank === 'S' || gameScore.rank === 'A' ? '#c9a227' : '#6b6b6b',
                  background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
                  boxShadow: '0 0 40px rgba(201, 162, 39, 0.2)',
                }}
              >
                <div
                  className="text-8xl font-bold mb-2"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: gameScore.rank === 'S' || gameScore.rank === 'A' ? '#c9a227' : '#d4af37',
                    textShadow: '0 0 30px rgba(201, 162, 39, 0.5)',
                  }}
                >
                  {gameScore.rank}
                </div>
                <p className="text-noir-cream text-xl" style={{ fontFamily: 'Georgia, serif' }}>
                  {gameScore.detective_title}
                </p>
              </div>
              <p className="text-noir-gold text-4xl mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                {gameScore.totalScore}
                <span className="text-noir-smoke text-2xl">/1000</span>
              </p>
              <p className="text-noir-smoke">Solve Time: {gameScore.solveTimeFormatted}</p>
            </div>

            {/* Score breakdown */}
            <div className="bg-noir-charcoal/50 border border-noir-slate/50 rounded-sm p-6 mb-8">
              <h4 className="text-noir-gold mb-4 text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                Score Breakdown
              </h4>
              <div className="space-y-3">
                {/* Time bonus */}
                <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                  <span className="text-noir-cream flex items-center gap-2">
                    <span className="text-lg">⏱</span>
                    Time Bonus
                    <span className="text-noir-smoke text-xs">
                      ({gameScore.solveTimeFormatted})
                    </span>
                  </span>
                  <span className="text-noir-gold font-mono">+{gameScore.timeBonus}</span>
                </div>

                {/* Evidence bonus */}
                <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                  <span className="text-noir-cream flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    Evidence Bonus
                    <span className="text-noir-smoke text-xs">
                      ({collectedEvidence.length}/9 found)
                    </span>
                  </span>
                  <span className="text-noir-gold font-mono">+{gameScore.evidenceBonus}</span>
                </div>

                {/* Efficiency bonus */}
                <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                  <span className="text-noir-cream flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    Efficiency Bonus
                    <span className="text-noir-smoke text-xs">
                      (questions asked)
                    </span>
                  </span>
                  <span className="text-noir-gold font-mono">+{gameScore.efficiencyBonus}</span>
                </div>

                {/* Contradiction bonus */}
                <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                  <span className="text-noir-cream flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    Contradiction Bonus
                    <span className="text-noir-smoke text-xs">
                      ({contradictions.length} found)
                    </span>
                  </span>
                  <span className="text-noir-gold font-mono">+{gameScore.contradictionBonus}</span>
                </div>

                {/* Accuracy penalty */}
                {gameScore.accuracyPenalty < 0 && (
                  <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                    <span className="text-noir-cream flex items-center gap-2">
                      <span className="text-lg">❌</span>
                      Wrong Accusations
                    </span>
                    <span className="text-noir-blood font-mono">{gameScore.accuracyPenalty}</span>
                  </div>
                )}

                {/* Hint penalty */}
                {gameScore.hintPenalty < 0 && (
                  <div className="flex items-center justify-between text-sm border-b border-noir-slate/30 pb-2">
                    <span className="text-noir-cream flex items-center gap-2">
                      <span className="text-lg">💭</span>
                      Hints Used
                    </span>
                    <span className="text-noir-blood font-mono">{gameScore.hintPenalty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Share + Leaderboard buttons */}
            <div className="text-center mb-6 flex flex-col items-center gap-3">
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={handleShare}
                  className="px-6 py-3 bg-noir-slate/50 border border-noir-gold/50 text-noir-cream hover:bg-noir-slate hover:border-noir-gold transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {shareSuccess ? '✓ Copied to Clipboard!' : '📋 Share Results'}
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="px-6 py-3 bg-noir-slate/50 border border-gray-600 text-gray-300 hover:bg-noir-slate hover:border-gray-400 transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  🏆 Leaderboard
                </button>
              </div>

              {/* Daily leaderboard submission */}
              {isDailyRun && !leaderboardSubmitted && (
                <div className="w-full max-w-sm mt-2 p-4 bg-lime-900/20 border border-lime-600/30 rounded-sm">
                  <p className="text-lime-400 text-sm font-medium mb-3 text-center">
                    Post your score to today's leaderboard
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={leaderboardNickname}
                      onChange={e => setLeaderboardNickname(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLeaderboardSubmit()}
                      placeholder="Your nickname"
                      maxLength={20}
                      className="flex-1 bg-noir-charcoal border border-gray-600 text-white px-3 py-2 text-sm rounded-sm placeholder-gray-500 focus:outline-none focus:border-lime-500"
                    />
                    <button
                      onClick={handleLeaderboardSubmit}
                      disabled={leaderboardSubmitting}
                      className="px-4 py-2 bg-lime-600 text-white text-sm hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
                    >
                      {leaderboardSubmitting ? '...' : 'Post'}
                    </button>
                  </div>
                </div>
              )}

              {/* Submitted confirmation */}
              {isDailyRun && leaderboardSubmitted && leaderboardPosition !== null && (
                <div className="w-full max-w-sm mt-2 p-4 bg-lime-900/20 border border-lime-600/30 rounded-sm text-center">
                  <p className="text-lime-400 text-sm font-medium">
                    ✓ Score posted! You ranked #{leaderboardPosition} today
                  </p>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="text-lime-300/70 text-xs mt-1 hover:text-lime-300 transition-colors underline"
                  >
                    View full leaderboard
                  </button>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowContent(false)
                  setTimeout(() => {
                    setPhase('evidence')
                    setTimeout(() => setShowContent(true), 100)
                  }, 500)
                }}
                className="px-8 py-4 bg-noir-gold text-noir-black text-lg tracking-widest hover:bg-noir-gold/90 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                VIEW EVIDENCE SUMMARY
              </button>
            </div>
          </div>
        )}

        {/* Phase: Evidence Summary */}
        {phase === 'evidence' && (
          <div
            className={`w-full max-w-3xl transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2
              className="text-3xl text-noir-gold text-center mb-8 tracking-widest"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              KEY EVIDENCE
            </h2>

            {/* Evidence grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {keyEvidence.map((evidence, index) => {
                const data = EVIDENCE_DATABASE[evidence.source]
                return (
                  <div
                    key={evidence.id}
                    className="bg-noir-charcoal/50 border border-noir-gold/30 p-4 rounded"
                    style={{
                      animation: `fadeInUp 0.5s ease-out forwards`,
                      animationDelay: `${index * 150}ms`,
                      opacity: 0,
                    }}
                  >
                    <h4 className="text-noir-gold font-medium mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                      {data?.name || evidence.description}
                    </h4>
                    <p className="text-noir-cream/80 text-sm">
                      {data?.hint || evidence.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 mb-8 text-center">
              <div>
                <p className="text-3xl text-noir-gold" style={{ fontFamily: 'Georgia, serif' }}>
                  {collectedEvidence.length}
                </p>
                <p className="text-noir-smoke text-sm">Evidence Found</p>
              </div>
              <div className="w-px bg-noir-slate/50" />
              <div>
                <p className="text-3xl text-noir-blood" style={{ fontFamily: 'Georgia, serif' }}>
                  {contradictions.length}
                </p>
                <p className="text-noir-smoke text-sm">Contradictions</p>
              </div>
              <div className="w-px bg-noir-slate/50" />
              <div>
                <p className="text-3xl text-noir-cream" style={{ fontFamily: 'Georgia, serif' }}>
                  {accusationAttempts}
                </p>
                <p className="text-noir-smoke text-sm">Accusation{accusationAttempts !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowContent(false)
                  setTimeout(() => {
                    setPhase('solution')
                    setTimeout(() => setShowContent(true), 100)
                  }, 500)
                }}
                className="px-8 py-4 bg-noir-gold text-noir-black text-lg tracking-widest hover:bg-noir-gold/90 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                THE TRUTH REVEALED
              </button>
            </div>
          </div>
        )}

        {/* Phase: Solution */}
        {phase === 'solution' && (
          <div
            className={`w-full max-w-3xl transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2
              className="text-3xl text-noir-gold text-center mb-8 tracking-widest"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              THE SOLUTION
            </h2>

            {/* Murderer reveal */}
            <div className="text-center mb-8">
              <div
                className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center text-5xl"
                style={{
                  background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
                  border: '3px solid #c9a227',
                  boxShadow: '0 0 30px rgba(201, 162, 39, 0.3)',
                }}
              >
                T
              </div>
              <h3
                className="text-2xl text-noir-cream mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Thomas Ashford
              </h3>
              <p className="text-noir-blood italic">The Murderer</p>
            </div>

            {/* Full story */}
            <div
              className="bg-noir-charcoal/50 border border-noir-slate/50 p-6 rounded mb-8"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <h4 className="text-noir-gold mb-4 text-lg">What Really Happened</h4>
              <div className="space-y-4 text-noir-cream/90 leading-relaxed">
                <p>
                  <span className="text-noir-gold">The Motive:</span> Thomas Ashford had accumulated
                  massive gambling debts. When he discovered his father Edmund planned to disinherit
                  him on New Year's Day, he saw no way out but murder.
                </p>
                <p>
                  <span className="text-noir-gold">The Method:</span> Thomas stole rat poison from the
                  kitchen (arsenic) and dissolved it in his father's champagne glass. He wore leather
                  gloves to handle the poison, later discarding them in the garden fountain.
                </p>
                <p>
                  <span className="text-noir-gold">The Timeline:</span> At 11:15 PM, Thomas argued with
                  his father in the study—a last attempt to change Edmund's mind. When that failed, he
                  prepared the poisoned champagne. At 11:32 PM, he rushed through the hallway, bumping
                  the grandfather clock and stopping it.
                </p>
                <p>
                  <span className="text-noir-gold">The Cover-up:</span> After his father collapsed,
                  Thomas burned the new will in the parlor fireplace, hoping to destroy evidence of his
                  disinheritance. But fragments survived in the ashes.
                </p>
                <p>
                  <span className="text-noir-gold">Justice:</span> Thanks to your investigation, Thomas
                  Ashford will face trial for the murder of his father. The Ashford name will never
                  recover from this scandal.
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowContent(false)
                  setTimeout(() => {
                    setPhase('credits')
                    setTimeout(() => setShowContent(true), 100)
                  }, 500)
                }}
                className="px-8 py-4 bg-noir-gold text-noir-black text-lg tracking-widest hover:bg-noir-gold/90 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

        {/* Phase: Credits */}
        {phase === 'credits' && (
          <div
            className={`text-center transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h2
              className="text-4xl text-noir-gold mb-8 tracking-widest"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: '0 0 30px rgba(201, 162, 39, 0.5)',
              }}
            >
              THE END
            </h2>

            <p
              className="text-noir-cream text-xl mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Thank you for playing
            </p>

            <h1
              className="text-5xl text-noir-gold mb-12 tracking-widest"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: '0 0 40px rgba(201, 162, 39, 0.4)',
              }}
            >
              ALL SUSPECTS
            </h1>

            <div className="space-y-2 text-noir-smoke mb-12" style={{ fontFamily: 'Georgia, serif' }}>
              <p>A Mystery Game</p>
              <p className="text-sm">New Year's Eve, 1929</p>
            </div>

            {/* Final rating */}
            <div className="mb-8">
              <div className="flex justify-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="text-2xl"
                    style={{ opacity: i < stars ? 1 : 0.3 }}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-noir-gold">{gameScore.detective_title}</p>
              <p className="text-noir-cream text-sm mt-2">{gameScore.totalScore}/1000 pts</p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={onPlayAgain}
                className="px-6 py-3 bg-noir-slate text-noir-cream hover:bg-noir-slate/80 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                PLAY AGAIN
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-noir-gold text-noir-black hover:bg-noir-gold/90 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                RETURN TO MANOR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS animations */}
      {/* Leaderboard modal */}
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        highlightNickname={leaderboardSubmitted ? (leaderboardNickname.trim() || 'Anonymous') : undefined}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(201, 162, 39, 0.6)); }
          50% { filter: drop-shadow(0 0 40px rgba(201, 162, 39, 0.9)); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
