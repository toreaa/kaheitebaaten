'use client'

import type { StationaryRecord } from '@/types/passage'

interface StationaryVesselsPanelProps {
  records: StationaryRecord[]
  onVesselClick?: (mmsi: number, position?: { lat: number; lon: number }) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) {
    return `${hours}t ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}t`
}

export default function StationaryVesselsPanel({ records, onVesselClick }: StationaryVesselsPanelProps) {
  // Get top 3 by total minutes stationary
  const top3 = records
    .filter(r => r.totalMinutesStationary > 1) // At least 1 minute (lowered from 5)
    .sort((a, b) => b.totalMinutesStationary - a.totalMinutesStationary)
    .slice(0, 3)

  // Always show debug panel in bottom corner
  const showDebugPanel = records.length === 0 || top3.length === 0

  if (showDebugPanel) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: '#fef3c7',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '12px',
          fontSize: '11px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          border: '2px solid #f59e0b',
        }}
      >
        <div style={{ fontWeight: '700', color: '#92400e' }}>
          ⚓ Stille båter: {records.length} tracked
        </div>
        <div style={{ color: '#78716c', marginTop: '4px' }}>
          {records.length === 0
            ? 'Venter på båter som ligger stille...'
            : `${top3.length} med >1 min stille tid`
          }
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: '16px',
        minWidth: '280px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        border: '2px solid #f59e0b',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '700',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ⚓ Topp 3 Stille Båter
        </h3>
        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#78716c' }}>
          Lengst stillestående i geofence (30d)
        </p>
      </div>

      {/* Top 3 list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {top3.map((record, index) => {
          const medals = ['🥇', '🥈', '🥉']
          return (
            <div
              key={record.mmsi}
              onClick={() => {
                console.log('🔍 Clicked stationary vessel:', record.vesselName, 'MMSI:', record.mmsi)
                onVesselClick?.(record.mmsi, record.lastPosition)
              }}
              style={{
                background: index === 0 ? '#fef3c7' : index === 1 ? '#f3f4f6' : '#fef2f2',
                border: `1px solid ${index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Medal */}
              <div style={{ fontSize: '20px' }}>{medals[index]}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {record.vesselName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Stille: {formatDuration(record.totalMinutesStationary)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
