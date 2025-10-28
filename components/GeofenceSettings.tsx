'use client'

import { useState } from 'react'
import type { GeofenceBounds } from './AISMap'

export type { GeofenceBounds }

interface GeofenceSettingsProps {
  bounds: GeofenceBounds
  onBoundsChange: (bounds: GeofenceBounds) => void
}

export default function GeofenceSettings({ bounds, onBoundsChange }: GeofenceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempBounds, setTempBounds] = useState(bounds)

  const handleSave = () => {
    onBoundsChange(tempBounds)
    setIsOpen(false)
  }

  const handleReset = () => {
    const defaultBounds = {
      latMin: 69.62,
      latMax: 69.68,
      lonMin: 18.90,
      lonMax: 19.02,
    }
    setTempBounds(defaultBounds)
    onBoundsChange(defaultBounds)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        ⚙️ Innstillinger
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        width: '320px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Geofence-innstillinger</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: 0,
            color: '#666',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
        Juster området hvor varsler skal trigges
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#333' }}>
            Latitude Min (Sør)
          </label>
          <input
            type="number"
            step="0.01"
            value={tempBounds.latMin}
            onChange={(e) => setTempBounds({ ...tempBounds, latMin: parseFloat(e.target.value) })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#333' }}>
            Latitude Max (Nord)
          </label>
          <input
            type="number"
            step="0.01"
            value={tempBounds.latMax}
            onChange={(e) => setTempBounds({ ...tempBounds, latMax: parseFloat(e.target.value) })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#333' }}>
            Longitude Min (Vest)
          </label>
          <input
            type="number"
            step="0.01"
            value={tempBounds.lonMin}
            onChange={(e) => setTempBounds({ ...tempBounds, lonMin: parseFloat(e.target.value) })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#333' }}>
            Longitude Max (Øst)
          </label>
          <input
            type="number"
            step="0.01"
            value={tempBounds.lonMax}
            onChange={(e) => setTempBounds({ ...tempBounds, lonMax: parseFloat(e.target.value) })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Lagre
        </button>
        <button
          onClick={handleReset}
          style={{
            flex: 1,
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Tilbakestill
        </button>
      </div>

      <div style={{ fontSize: '11px', color: '#999', marginTop: '12px', textAlign: 'center' }}>
        Standard: Tromsøysundet (69.62-69.68°N, 18.90-19.02°E)
      </div>
    </div>
  )
}
