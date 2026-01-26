/**
 * TimelineView Component
 * Visual timeline of events pieced together from statements
 */

import { useState } from 'react'

interface TimelineEvent {
  time: string
  location: string
  description: string
  sources: string[]
  confirmed: boolean
  disputed: boolean
}

interface TimelineViewProps {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
}

export function TimelineView({ events, onEventClick }: TimelineViewProps) {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'disputed'>('all')

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true
    if (filter === 'confirmed') return event.confirmed
    if (filter === 'disputed') return event.disputed
    return true
  })

  // Sort events by time
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return compareTimeStrings(a.time, b.time)
  })

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2">
        {(['all', 'confirmed', 'disputed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-noir-gold text-noir-black'
                : 'bg-noir-slate/50 text-noir-smoke hover:text-noir-cream'
            }`}
          >
            {f === 'all' ? 'All' : f === 'confirmed' ? 'Confirmed' : 'Disputed'}
            {f === 'disputed' && events.filter((e) => e.disputed).length > 0 && (
              <span className="ml-1 text-red-400">
                ({events.filter((e) => e.disputed).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {sortedEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-noir-smoke text-sm italic">
            No timeline events recorded yet.
          </p>
          <p className="text-noir-smoke/60 text-xs mt-1">
            Events are extracted from suspect testimonies.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[60px] top-0 bottom-0 w-0.5 bg-noir-slate/50" />

          {/* Events */}
          <div className="space-y-4">
            {sortedEvents.map((event, index) => (
              <div
                key={`${event.time}-${event.location}-${index}`}
                className={`flex items-start gap-3 cursor-pointer group ${
                  event.disputed ? 'opacity-90' : ''
                }`}
                onClick={() => onEventClick?.(event)}
              >
                {/* Time */}
                <div
                  className={`w-[50px] text-right shrink-0 text-xs ${
                    event.confirmed
                      ? 'text-green-400 font-medium'
                      : event.disputed
                        ? 'text-red-400 font-medium'
                        : 'text-noir-smoke'
                  }`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {formatTime(event.time)}
                </div>

                {/* Dot */}
                <div
                  className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${
                    event.confirmed
                      ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                      : event.disputed
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'bg-noir-slate'
                  }`}
                />

                {/* Content */}
                <div
                  className={`flex-1 p-2 rounded transition-colors ${
                    event.disputed
                      ? 'bg-red-900/10 border border-red-600/30'
                      : event.confirmed
                        ? 'bg-green-900/10 border border-green-600/30'
                        : 'bg-noir-black/30 group-hover:bg-noir-black/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-noir-gold uppercase tracking-wider">
                      {event.location}
                    </span>
                    {event.disputed && (
                      <span className="text-[10px] text-red-400 px-1 bg-red-900/30 rounded">
                        DISPUTED
                      </span>
                    )}
                    {event.confirmed && (
                      <span className="text-[10px] text-green-400 px-1 bg-green-900/30 rounded">
                        CONFIRMED
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm text-noir-cream"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {event.description}
                  </p>
                  <p className="text-[10px] text-noir-smoke mt-1">
                    Sources: {event.sources.length} statement{event.sources.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="pt-4 border-t border-noir-slate/30">
        <p className="text-[10px] text-noir-smoke uppercase tracking-wider mb-2">Legend</p>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-noir-smoke">Confirmed (multiple sources)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-noir-smoke">Disputed (conflicting accounts)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-noir-slate" />
            <span className="text-noir-smoke">Single source</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compare time strings for sorting
 */
function compareTimeStrings(a: string, b: string): number {
  const parseTime = (t: string): number => {
    const lower = t.toLowerCase()

    if (lower.includes('midnight')) return 2400
    if (lower.includes('evening')) return 2000
    if (lower.includes('night')) return 2200

    const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (match) {
      let hour = parseInt(match[1])
      const minute = parseInt(match[2] || '0')
      const period = match[3]?.toLowerCase()

      if (period === 'pm' && hour !== 12) hour += 12
      if (period === 'am' && hour === 12) hour = 0

      return hour * 100 + minute
    }

    return 0
  }

  return parseTime(a) - parseTime(b)
}

/**
 * Format time for display
 */
function formatTime(time: string): string {
  // Already formatted nicely
  if (time.toLowerCase().includes('midnight') ||
      time.toLowerCase().includes('evening') ||
      time.toLowerCase().includes('night')) {
    return time
  }

  // Try to parse and format consistently
  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (match) {
    const hour = parseInt(match[1])
    const minute = match[2] || '00'
    const period = match[3]?.toUpperCase() || (hour >= 12 ? 'PM' : 'AM')
    return `${hour}:${minute} ${period}`
  }

  return time
}
