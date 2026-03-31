import { useEffect, useRef, useState } from 'react'
import { type PortraitMood, getPortraitPath } from '../../utils/portraitMood'

interface CharacterPortraitProps {
  characterId: string
  name: string
  role: string
  size?: 'small' | 'medium' | 'large'
  isActive?: boolean
  mood?: PortraitMood
}

const CHARACTER_COLORS: Record<string, { primary: string; accent: string }> = {
  victoria: { primary: '#722f37', accent: '#c9a227' },
  thomas: { primary: '#1a3a1a', accent: '#8b4513' },
  eleanor: { primary: '#2a2a4a', accent: '#aabbcc' },
  marcus: { primary: '#3d3028', accent: '#f5f0e6' },
  lillian: { primary: '#4a2040', accent: '#d4a5a5' },
  james: { primary: '#1a1a1a', accent: '#4a4a4a' },
}

const CHARACTER_INITIALS: Record<string, string> = {
  victoria: 'VA',
  thomas: 'TA',
  eleanor: 'EC',
  marcus: 'MW',
  lillian: 'LM',
  james: 'JW',
}

export function CharacterPortrait({
  characterId,
  name,
  role,
  size = 'medium',
  isActive = false,
  mood = 'calm',
}: CharacterPortraitProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [displayedMood, setDisplayedMood] = useState<PortraitMood>(mood)
  const [fadingOut, setFadingOut] = useState(false)
  const previousMoodRef = useRef<PortraitMood>(mood)

  useEffect(() => {
    if (mood === previousMoodRef.current) {
      return
    }

    setFadingOut(true)
    const timer = setTimeout(() => {
      setDisplayedMood(mood)
      setImageLoaded(false)
      setImageError(false)
      setFadingOut(false)
      previousMoodRef.current = mood
    }, 250)

    return () => clearTimeout(timer)
  }, [mood])

  const colors = CHARACTER_COLORS[characterId] || { primary: '#2d2d2d', accent: '#c9a227' }
  const initials = CHARACTER_INITIALS[characterId] || name.charAt(0)
  const portraitPath = getPortraitPath(characterId, displayedMood)

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-24 h-24',
    large: 'w-40 h-40',
  }

  const textSizes = {
    small: 'text-lg',
    medium: 'text-3xl',
    large: 'text-5xl',
  }

  const showImage = portraitPath && !imageError

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${sizeClasses[size]} relative overflow-hidden rounded-sm`}
        style={{
          border: `2px solid ${isActive ? '#c9a227' : '#4a4a4a'}`,
          boxShadow: isActive
            ? '0 0 20px rgba(201, 162, 39, 0.4), inset 0 0 30px rgba(0,0,0,0.5)'
            : 'inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}dd 60%, #0a0a0a 100%)`,
          }}
        />

        {showImage && (
          <img
            key={displayedMood}
            src={portraitPath}
            alt={`Portrait of ${name} (${displayedMood})`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: imageLoaded && !fadingOut ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {(!showImage || !imageLoaded) && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${textSizes[size]} font-serif`}
            style={{
              color: colors.accent,
              textShadow: `0 0 10px ${colors.accent}66`,
              fontFamily: 'Georgia, serif',
            }}
          >
            {initials}
          </div>
        )}

        {showImage && imageLoaded && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(30, 20, 10, 0.2) 0%, rgba(10, 10, 10, 0.4) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {size !== 'small' && (
        <div className="mt-2 text-center">
          <div
            className="text-sm text-noir-cream tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {name}
          </div>
          <div className="text-xs italic text-noir-smoke">{role}</div>
        </div>
      )}
    </div>
  )
}
