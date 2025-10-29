'use client'

import { useState, useMemo } from 'react'
import type { VesselPassage, VesselStats } from '@/types/passage'

type TimeFilter = '24h' | '30d' | '1y'

interface HighScorePanelProps {
  passages: VesselPassage[]
  onVesselClick?: (mmsi: number) => void
  onReset?: () => void
}

export default function HighScorePanel({ passages, onVesselClick, onReset }: HighScorePanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h')

  const filteredStats = useMemo(() => {
    const now = Date.now()
    let cutoffTime: number

    switch (timeFilter) {
      case '24h':
        cutoffTime = now - 24 * 60 * 60 * 1000
        break
      case '30d':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000
        break
      case '1y':
        cutoffTime = now - 365 * 24 * 60 * 60 * 1000
        break
    }

    // Filter passages by time
    const recentPassages = passages.filter(p => p.timestamp >= cutoffTime)

    // Only count EXIT events (means vessel has completed a passage through the area)
    const exitPassages = recentPassages.filter(p => p.type === 'exit')

    // Count passages per vessel
    const statsMap = new Map<number, VesselStats>()

    exitPassages.forEach(passage => {
      const existing = statsMap.get(passage.mmsi)
      if (existing) {
        existing.passageCount++
        existing.lastSeen = Math.max(existing.lastSeen, passage.timestamp)
      } else {
        statsMap.set(passage.mmsi, {
          mmsi: passage.mmsi,
          vesselName: passage.vesselName,
          passageCount: 1,
          lastSeen: passage.timestamp,
        })
      }
    })

    // Convert to array and sort by passage count
    return Array.from(statsMap.values())
      .sort((a, b) => b.passageCount - a.passageCount)
      .slice(0, 5) // Top 5
  }, [passages, timeFilter])

  const getTimeLabel = () => {
    switch (timeFilter) {
      case '24h':
        return 'Siste 24 timer'
      case '30d':
        return 'Siste 30 dager'
      case '1y':
        return 'Siste år'
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m siden`
    if (hours < 24) return `${hours}t siden`
    return `${days}d siden`
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'left center',
          zIndex: 1000,
          background: '#1e293b',
          color: 'white',
          border: 'none',
          borderRadius: '8px 8px 0 0',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        🏆 Topp 5
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '320px',
        zIndex: 1000,
        background: 'white',
        boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Topp 5 Passeringer
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
              {passages.filter(p => p.type === 'exit').length} komplette passeringer
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Skjul
          </button>
        </div>
        {passages.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Er du sikker på at du vil nullstille alle passeringer?')) {
                onReset?.()
              }
            }}
            style={{
              background: '#dc2626',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              width: '100%',
            }}
          >
            🗑️ Nullstill highscore
          </button>
        )}
      </div>

      {/* Time filters */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {(['24h', '30d', '1y'] as TimeFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: timeFilter === filter ? '#3b82f6' : '#f1f5f9',
              color: timeFilter === filter ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {filter === '24h' ? '24t' : filter === '30d' ? '30d' : '1år'}
          </button>
        ))}
      </div>

      {/* List header */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f8fafc',
        }}
      >
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {getTimeLabel()}
        </div>
        <div style={{
          fontSize: '10px',
          color: '#94a3b8',
          marginTop: '2px',
        }}>
          Kun båter som har forlatt geofencet
        </div>
        {passages.length > 0 && passages.filter(p => p.type === 'exit').length === 0 && (
          <div style={{
            fontSize: '9px',
            color: '#f59e0b',
            marginTop: '4px',
            fontStyle: 'italic',
          }}>
            Tips: Bruk reset-knappen hvis lista ikke stemmer
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {filteredStats.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            Ingen passeringer i denne perioden
          </div>
        ) : (
          filteredStats.map((stat, index) => (
            <div
              key={stat.mmsi}
              onClick={() => {
                console.log('🔍 Clicking vessel:', stat.vesselName, 'MMSI:', stat.mmsi)
                onVesselClick?.(stat.mmsi)
              }}
              style={{
                background: index < 3 ? '#fef3c7' : 'white',
                border: '1px solid ' + (index < 3 ? '#fcd34d' : '#e2e8f0'),
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background:
                    index === 0
                      ? '#fbbf24'
                      : index === 1
                      ? '#94a3b8'
                      : index === 2
                      ? '#d97706'
                      : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: index < 3 ? 'white' : '#64748b',
                }}
              >
                {index + 1}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stat.vesselName}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '2px',
                  }}
                >
                  MMSI: {stat.mmsi} • {formatLastSeen(stat.lastSeen)}
                </div>
              </div>

              {/* Count */}
              <div
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '4px 12px',
                  fontSize: '14px',
                  fontWeight: '700',
                }}
                title={`${stat.passageCount} ${stat.passageCount === 1 ? 'passering' : 'passeringer'}`}
              >
                {stat.passageCount}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
