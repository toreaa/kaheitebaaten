'use client'

import { useState } from 'react'
import type { AISVessel } from '@/types/ais'

interface CurrentVesselsListProps {
  vessels: AISVessel[]
  onVesselClick?: (mmsi: number) => void
}

export default function CurrentVesselsList({ vessels, onVesselClick }: CurrentVesselsListProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          transformOrigin: 'right center',
          zIndex: 1000,
          background: '#0ea5e9',
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
        🚢 Båter ({vessels.length})
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '300px',
        zIndex: 1000,
        background: 'white',
        boxShadow: '-2px 0 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          color: 'white',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚢 Båter på kartet
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              {vessels.length} {vessels.length === 1 ? 'båt' : 'båter'} live
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
      </div>

      {/* Vessel list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {vessels.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            Ingen båter på kartet akkurat nå
          </div>
        ) : (
          vessels
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((vessel) => (
              <div
                key={vessel.mmsi}
                onClick={() => {
                  console.log('🔍 Clicked vessel:', vessel.name, 'MMSI:', vessel.mmsi)
                  onVesselClick?.(vessel.mmsi)
                }}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(-4px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  e.currentTarget.style.borderColor = '#0ea5e9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Vessel name */}
                <div
                  style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1e293b',
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {vessel.name}
                </div>

                {/* Vessel info */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div>MMSI: {vessel.mmsi}</div>
                  {vessel.shipType && <div>Type: {vessel.shipType}</div>}
                  <div>
                    Fart: {vessel.speed.toFixed(1)} knop • Kurs: {vessel.course.toFixed(0)}°
                  </div>
                  {vessel.destination && (
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      → {vessel.destination}
                    </div>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
