'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { AISVessel } from '@/types/ais'
import 'leaflet/dist/leaflet.css'

export interface GeofenceBounds {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Minions-style vessel icon
const minionSvg = `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
  <!-- Body (yellow capsule) -->
  <ellipse cx="16" cy="22" rx="12" ry="16" fill="#FFD700"/>

  <!-- Overalls (blue) -->
  <rect x="6" y="22" width="20" height="16" rx="2" fill="#4169E1"/>
  <circle cx="12" cy="27" r="2" fill="#2F4F7F"/>
  <circle cx="20" cy="27" r="2" fill="#2F4F7F"/>
  <line x1="12" y1="24" x2="12" y2="38" stroke="#2F4F7F" stroke-width="2"/>
  <line x1="20" y1="24" x2="20" y2="38" stroke="#2F4F7F" stroke-width="2"/>

  <!-- Goggle strap (black) -->
  <rect x="4" y="10" width="24" height="3" rx="1.5" fill="#333"/>

  <!-- Goggle (silver/grey) -->
  <ellipse cx="16" cy="12" rx="8" ry="6" fill="#C0C0C0" stroke="#666" stroke-width="1"/>

  <!-- Eye (white) -->
  <circle cx="16" cy="12" r="5" fill="#FFF"/>

  <!-- Iris (brown) -->
  <circle cx="16" cy="12" r="3" fill="#8B4513"/>

  <!-- Pupil (black) -->
  <circle cx="16" cy="12" r="1.5" fill="#000"/>

  <!-- Shine in eye -->
  <circle cx="17" cy="11" r="1" fill="#FFF" opacity="0.8"/>

  <!-- Hair (black strands) -->
  <line x1="14" y1="6" x2="14" y2="2" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16" y1="5" x2="16" y2="1" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="18" y1="6" x2="18" y2="2" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Mouth (smile) -->
  <path d="M 12 16 Q 16 19 20 16" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Arms -->
  <ellipse cx="4" cy="24" rx="3" ry="2" fill="#FFD700"/>
  <ellipse cx="28" cy="24" rx="3" ry="2" fill="#FFD700"/>

  <!-- Gloves (black) -->
  <circle cx="3" cy="24" r="2" fill="#333"/>
  <circle cx="29" cy="24" r="2" fill="#333"/>
</svg>
`

// Taxi-style vessel icon (for selected vessel)
const taxiSvg = `
<svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
  <!-- Taxi roof sign -->
  <rect x="12" y="2" width="16" height="6" rx="2" fill="#000"/>
  <text x="20" y="6.5" font-family="Arial" font-size="5" font-weight="bold" fill="#FFD700" text-anchor="middle">TAXI</text>

  <!-- Car body (yellow) -->
  <rect x="4" y="16" width="32" height="18" rx="3" fill="#FFD700" stroke="#000" stroke-width="1.5"/>

  <!-- Windshield -->
  <rect x="8" y="10" width="24" height="8" rx="2" fill="#87CEEB" stroke="#000" stroke-width="1"/>

  <!-- Windows -->
  <rect x="6" y="20" width="8" height="8" rx="1" fill="#87CEEB" stroke="#000" stroke-width="0.5"/>
  <rect x="26" y="20" width="8" height="8" rx="1" fill="#87CEEB" stroke="#000" stroke-width="0.5"/>

  <!-- Door lines -->
  <line x1="20" y1="18" x2="20" y2="34" stroke="#000" stroke-width="1"/>

  <!-- Wheels -->
  <circle cx="10" cy="34" r="4" fill="#333"/>
  <circle cx="10" cy="34" r="2" fill="#555"/>
  <circle cx="30" cy="34" r="4" fill="#333"/>
  <circle cx="30" cy="34" r="2" fill="#555"/>

  <!-- Bumpers -->
  <rect x="2" y="30" width="3" height="3" rx="1" fill="#333"/>
  <rect x="35" y="30" width="3" height="3" rx="1" fill="#333"/>

  <!-- Headlights -->
  <circle cx="4" cy="24" r="1.5" fill="#FFF" opacity="0.8"/>
  <circle cx="36" cy="24" r="1.5" fill="#FFF" opacity="0.8"/>

  <!-- Checkered pattern -->
  <rect x="16" y="26" width="2" height="2" fill="#000"/>
  <rect x="18" y="28" width="2" height="2" fill="#000"/>
  <rect x="20" y="26" width="2" height="2" fill="#000"/>
  <rect x="22" y="28" width="2" height="2" fill="#000"/>
</svg>
`

const vesselIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(minionSvg),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
})

const taxiIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(taxiSvg),
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
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
  geofenceBounds: GeofenceBounds
  selectedVesselMMSI?: number | null
  selectedVesselPosition?: { lat: number; lon: number } | null
}

function MapUpdater({ geofenceBounds }: { geofenceBounds: GeofenceBounds }) {
  const map = useMap()

  useEffect(() => {
    // Center map on geofence bounds
    const bounds = L.latLngBounds(
      [geofenceBounds.latMin, geofenceBounds.lonMin],
      [geofenceBounds.latMax, geofenceBounds.lonMax]
    )
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [geofenceBounds, map])

  return null
}

function VesselSelector({
  selectedMMSI,
  selectedPosition,
  vessels,
}: {
  selectedMMSI: number | null
  selectedPosition: { lat: number; lon: number } | null | undefined
  vessels: AISVessel[]
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedMMSI) return

    // Find the selected vessel in current vessels
    const vessel = vessels.find((v) => v.mmsi === selectedMMSI)

    if (vessel) {
      // Vessel is currently on the map
      console.log(`🚕 Zooming to live vessel: ${vessel.name} (MMSI: ${vessel.mmsi})`)

      // Zoom to vessel location with higher zoom level
      map.flyTo([vessel.latitude, vessel.longitude], 15, {
        duration: 1.2,
      })

      // Open the popup for this vessel after animation completes
      setTimeout(() => {
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            const markerLatLng = layer.getLatLng()
            // Check if this marker is at the vessel's position
            if (
              Math.abs(markerLatLng.lat - vessel.latitude) < 0.00001 &&
              Math.abs(markerLatLng.lng - vessel.longitude) < 0.00001
            ) {
              layer.openPopup()
            }
          }
        })
      }, 1300)
    } else if (selectedPosition) {
      // Vessel is not on map, but we have last known position
      console.log(`🚕 Zooming to last known position for MMSI ${selectedMMSI} at ${selectedPosition.lat.toFixed(4)}, ${selectedPosition.lon.toFixed(4)}`)

      map.flyTo([selectedPosition.lat, selectedPosition.lon], 15, {
        duration: 1.2,
      })

      // Add a temporary marker for the last known position
      const tempMarker = L.marker([selectedPosition.lat, selectedPosition.lon])
        .addTo(map)
        .bindPopup(`<b>MMSI ${selectedMMSI}</b><br/>Siste kjente posisjon<br/>${selectedPosition.lat.toFixed(4)}, ${selectedPosition.lon.toFixed(4)}`)
        .openPopup()

      // Remove the temporary marker after 10 seconds
      setTimeout(() => {
        map.removeLayer(tempMarker)
      }, 10000)
    } else {
      console.log(`🚕 Vessel with MMSI ${selectedMMSI} not currently on map and no position available`)
    }
  }, [selectedMMSI, selectedPosition, vessels, map])

  return null
}

export default function AISMap({ vessels, source, geofenceBounds, selectedVesselMMSI, selectedVesselPosition }: AISMapProps) {
  const [mounted, setMounted] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('🗺️ AISMap received selectedVesselMMSI:', selectedVesselMMSI, 'position:', selectedVesselPosition)
  }, [selectedVesselMMSI, selectedVesselPosition])

  // Convert GeofenceBounds to Leaflet LatLngBounds format
  const leafletBounds: [[number, number], [number, number]] = [
    [geofenceBounds.latMin, geofenceBounds.lonMin], // Southwest corner
    [geofenceBounds.latMax, geofenceBounds.lonMax], // Northeast corner
  ]

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

  // Calculate center of geofence bounds
  const centerLat = (geofenceBounds.latMin + geofenceBounds.latMax) / 2
  const centerLng = (geofenceBounds.lonMin + geofenceBounds.lonMax) / 2
  const zoom = 12

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
          bounds={leafletBounds}
          pathOptions={{
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.1,
            dashArray: '10, 10',
          }}
        />
        <MapUpdater geofenceBounds={geofenceBounds} />
        <VesselSelector selectedMMSI={selectedVesselMMSI || null} selectedPosition={selectedVesselPosition} vessels={vessels} />
        {vessels.map((vessel) => {
          const isSelected = selectedVesselMMSI === vessel.mmsi
          if (isSelected) {
            console.log('🚕 Rendering TAXI for:', vessel.name, vessel.mmsi)
          }
          return (
            <Marker
              key={`${vessel.mmsi}-${isSelected ? 'taxi' : 'minion'}`}
              position={[vessel.latitude, vessel.longitude]}
              icon={isSelected ? taxiIcon : vesselIcon}
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
          )
        })}
      </MapContainer>
    </div>
  )
}
