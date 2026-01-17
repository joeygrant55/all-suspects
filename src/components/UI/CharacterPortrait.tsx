import { useState } from 'react'

interface CharacterPortraitProps {
  characterId: string
  name: string
  role: string
  size?: 'small' | 'medium' | 'large'
  isActive?: boolean
}

// Character-specific colors for their silhouettes
const CHARACTER_COLORS: Record<string, { primary: string; accent: string }> = {
  victoria: { primary: '#722f37', accent: '#c9a227' }, // Blood red, widow
  thomas: { primary: '#1a3a1a', accent: '#8b4513' }, // Dark green, heir
  eleanor: { primary: '#2a2a4a', accent: '#aabbcc' }, // Navy, secretary
  marcus: { primary: '#3d3028', accent: '#f5f0e6' }, // Brown, doctor
  lillian: { primary: '#4a2040', accent: '#d4a5a5' }, // Purple, socialite
  james: { primary: '#1a1a1a', accent: '#4a4a4a' }, // Black, butler
}

// Initials for each character (fallback when no portrait image)
const CHARACTER_INITIALS: Record<string, string> = {
  victoria: 'VA',
  thomas: 'TA',
  eleanor: 'EC',
  marcus: 'MW',
  lillian: 'LM',
  james: 'J',
}

// Portrait image paths (relative to public folder)
const PORTRAIT_PATHS: Record<string, string> = {
  victoria: '/portraits/victoria.webp',
  thomas: '/portraits/thomas.webp',
  eleanor: '/portraits/eleanor.webp',
  marcus: '/portraits/marcus.webp',
  lillian: '/portraits/lillian.webp',
  james: '/portraits/james.webp',
}

export function CharacterPortrait({
  characterId,
  name,
  role,
  size = 'medium',
  isActive = false,
}: CharacterPortraitProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const colors = CHARACTER_COLORS[characterId] || { primary: '#2d2d2d', accent: '#c9a227' }
  const initials = CHARACTER_INITIALS[characterId] || name.charAt(0)
  const portraitPath = PORTRAIT_PATHS[characterId]

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
      {/* Portrait frame */}
      <div
        className={`${sizeClasses[size]} relative rounded-sm overflow-hidden`}
        style={{
          border: `2px solid ${isActive ? '#c9a227' : '#4a4a4a'}`,
          boxShadow: isActive
            ? '0 0 20px rgba(201, 162, 39, 0.4), inset 0 0 30px rgba(0,0,0,0.5)'
            : 'inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Background gradient (always present as base) */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}dd 60%, #0a0a0a 100%)`,
          }}
        />

        {/* AI-generated portrait image */}
        {showImage && (
          <img
            src={portraitPath}
            alt={`Portrait of ${name}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Silhouette placeholder - stylized initials (shown when no image or loading) */}
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

        {/* Sepia/noir color overlay for portraits */}
        {showImage && imageLoaded && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 20, 10, 0.2) 0%, rgba(10, 10, 10, 0.4) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
        )}

        {/* Film grain overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Name plate */}
      {size !== 'small' && (
        <div className="mt-2 text-center">
          <div
            className="text-noir-cream text-sm font-serif tracking-wide"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {name}
          </div>
          <div className="text-noir-smoke text-xs italic">{role}</div>
        </div>
      )}
    </div>
  )
}
