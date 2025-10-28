'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { AISVessel } from '@/types/ais'
import 'leaflet/dist/leaflet.css'

// Tromsøysundet geofence bounds
const GEOFENCE_BOUNDS: [[number, number], [number, number]] = [
  [69.62, 18.90], // Southwest corner
  [69.68, 19.02], // Northeast corner
]

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom vessel icon
const vesselIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTlWMTZIMjBWMTlDMjAgMTkuNTUgMTkuNTUgMjAgMTkgMjBINUM0LjQ1IDIwIDQgMTkuNTUgNCAxOVoiIGZpbGw9IiMyMTk2RjMiLz4KPHBhdGggZD0iTTYgMTVWMTBMMTIgNEwxOCAxMFYxNUg2WiIgZmlsbD0iIzIxOTZGMyIvPgo8L3N2Zz4=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

function formatSpeed(speed: number): string {
  return `${speed.toFixed(1)} knop`
}

function formatCourse(course: number): string {
  const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV']
  const index = Math.round(course / 45) % 8
  return `${course.toFixed(0)}° (${directions[index]})`
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface AISMapProps {
  vessels: AISVessel[]
  source: 'live' | 'mock'
}

function MapUpdater({ vessels }: { vessels: AISVessel[] }) {
  const map = useMap()

  useEffect(() => {
    if (vessels.length > 0) {
      const bounds = L.latLngBounds(
        vessels.map((v) => [v.latitude, v.longitude])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [vessels, map])

  return null
}

export default function AISMap({ vessels, source }: AISMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
        }}
      >
        Laster kart...
      </div>
    )
  }

  const centerLat = parseFloat(
    process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '69.65'
  )
  const centerLng = parseFloat(
    process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '18.96'
  )
  const zoom = parseInt(process.env.NEXT_PUBLIC_MAP_ZOOM || '12')

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {source === 'mock' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 50,
            zIndex: 1000,
            background: 'rgba(255, 193, 7, 0.9)',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          ⚠️ Viser testdata (AIS_API_KEY ikke satt)
        </div>
      )}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        id="map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Geofence area visualization */}
        <Rectangle
          bounds={GEOFENCE_BOUNDS}
          pathOptions={{
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.1,
            dashArray: '10, 10',
          }}
        />
        <MapUpdater vessels={vessels} />
        {vessels.map((vessel) => (
          <Marker
            key={vessel.mmsi}
            position={[vessel.latitude, vessel.longitude]}
            icon={vesselIcon}
          >
            <Popup>
              <div className="vessel-popup">
                <h3>{vessel.name}</h3>
                <p>
                  <strong>MMSI:</strong> {vessel.mmsi}
                </p>
                {vessel.shipType && (
                  <p>
                    <strong>Type:</strong> {vessel.shipType}
                  </p>
                )}
                <p>
                  <strong>Fart:</strong> {formatSpeed(vessel.speed)}
                </p>
                <p>
                  <strong>Kurs:</strong> {formatCourse(vessel.course)}
                </p>
                <p>
                  <strong>Heading:</strong> {vessel.heading}°
                </p>
                {vessel.destination && (
                  <p>
                    <strong>Destinasjon:</strong> {vessel.destination}
                  </p>
                )}
                <p>
                  <strong>Oppdatert:</strong> {formatTimestamp(vessel.timestamp)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
