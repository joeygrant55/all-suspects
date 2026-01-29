import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CinematicMomentProps {
  videoUrl: string
  characterName: string
  responseText: string
  onDismiss: () => void
}

export function CinematicMoment({
  videoUrl,
  characterName,
  responseText,
  onDismiss,
}: CinematicMomentProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Auto-play when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.error('Video autoplay failed:', err)
        setHasError(true)
      })
    }
  }, [videoUrl])

  const handleVideoError = () => {
    console.error('Video failed to load')
    setHasError(true)
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    // Auto-dismiss after video ends (optional - can also wait for user to close)
    setTimeout(onDismiss, 1000)
  }

  // Clean text for subtitles (remove stage directions)
  const cleanText = responseText
    .replace(/\*[^*]+\*/g, '') // Remove *action*
    .replace(/\([^)]+\)/g, '') // Remove (parentheticals)
    .trim()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-noir-black/95 backdrop-blur-sm"
        onClick={onDismiss}
      >
        {/* Film grain overlay */}
        <div className="absolute inset-0 film-grain pointer-events-none opacity-40" />

        {/* Video container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-[70%] max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cinematic frame - gold border with noir styling */}
          <div className="relative border-4 border-noir-gold/70 shadow-2xl bg-noir-black">
            {/* Top decorative bar */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-noir-gold/90 border-2 border-noir-gold text-noir-black font-serif text-sm tracking-wider">
              🎬 CINEMATIC MOMENT
            </div>

            {/* Close button */}
            <motion.button
              onClick={onDismiss}
              className="absolute -top-4 -right-4 z-10 w-10 h-10 flex items-center justify-center bg-noir-charcoal border-2 border-noir-gold hover:bg-noir-gold hover:text-noir-black text-noir-cream transition-colors shadow-lg"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>

            {/* Video player */}
            {hasError ? (
              <div className="aspect-video bg-noir-charcoal flex items-center justify-center">
                <div className="text-center">
                  <p className="text-noir-smoke text-lg mb-2">⚠️ Video unavailable</p>
                  <p className="text-noir-smoke text-sm">The cinematic moment couldn't be loaded</p>
                  <button
                    onClick={onDismiss}
                    className="mt-4 px-4 py-2 bg-noir-gold/20 border border-noir-gold text-noir-gold hover:bg-noir-gold/30 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video bg-noir-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                  onError={handleVideoError}
                  controls={false}
                  playsInline
                  muted={false}
                />

                {/* Subtitle overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-noir-black via-noir-black/80 to-transparent p-6">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-noir-gold text-xs font-serif mb-2 tracking-widest uppercase">
                      {characterName}
                    </p>
                    <p className="text-noir-cream text-base font-serif leading-relaxed max-w-3xl mx-auto">
                      {cleanText}
                    </p>
                  </motion.div>
                </div>

                {/* Playing indicator */}
                {isPlaying && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-noir-black/70 px-3 py-1 border border-noir-gold/30">
                    <motion.div
                      className="w-2 h-2 bg-red-500 rounded-full"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-noir-cream text-xs font-serif">LIVE</span>
                  </div>
                )}
              </div>
            )}

            {/* Bottom decorative bar */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-noir-gold to-transparent" />
          </div>

          {/* Dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-noir-smoke text-xs mt-8 font-serif"
          >
            Click outside or press ✕ to continue investigation
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface CinematicGeneratingProps {
  characterName: string
  onCancel: () => void
}

/**
 * Loading state while video is generating
 */
export function CinematicGenerating({ characterName, onCancel }: CinematicGeneratingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-8 right-8 z-50 bg-noir-charcoal/95 border-2 border-noir-gold/50 px-6 py-4 rounded shadow-2xl max-w-sm"
    >
      <div className="flex items-start gap-4">
        <motion.div
          className="text-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          🎬
        </motion.div>
        <div className="flex-1">
          <p className="text-noir-gold font-serif font-bold mb-1">
            Generating Cinematic Moment
          </p>
          <p className="text-noir-cream text-sm mb-3">
            Creating dramatic video for {characterName}'s response...
          </p>
          {/* Progress bar */}
          <div className="w-full h-1 bg-noir-slate rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-noir-gold via-amber-400 to-noir-gold"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>
          <p className="text-noir-smoke text-xs mt-2 italic">
            You can continue questioning while this generates
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-noir-smoke hover:text-noir-cream transition-colors text-sm"
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
