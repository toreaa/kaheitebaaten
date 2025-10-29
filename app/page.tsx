'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import type { AISResponse } from '@/types/ais'
import GeofenceNotification, { type VesselNotification } from '@/components/GeofenceNotification'
import GeofenceSettings from '@/components/GeofenceSettings'
import HighScorePanel from '@/components/HighScorePanel'
import CurrentVesselsList from '@/components/CurrentVesselsList'
import StationaryVesselsPanel from '@/components/StationaryVesselsPanel'
import type { GeofenceBounds } from '@/components/AISMap'
import type { VesselPassage, StationaryRecord } from '@/types/passage'

// Default Tromsøysundet bounds
const DEFAULT_BOUNDS: GeofenceBounds = {
  latMin: 69.62,
  latMax: 69.68,
  lonMin: 18.90,
  lonMax: 19.02,
}

// Dynamically import the map component (no SSR due to Leaflet)
const AISMap = dynamic(() => import('@/components/AISMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
        fontSize: '18px',
        color: '#555',
      }}
    >
      Laster kart...
    </div>
  ),
})

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Home() {
  const { data, error, isLoading } = useSWR<AISResponse>(
    '/api/ais',
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const [notification, setNotification] = useState<VesselNotification | null>(null)
  const [selectedVesselMMSI, setSelectedVesselMMSI] = useState<number | null>(null)
  const previousVesselsRef = useRef<Set<number>>(new Set())
  const isFirstLoadRef = useRef(true)

  // Handler for vessel selection from highscore
  const handleVesselClick = (mmsi: number) => {
    console.log('📍 Selected vessel MMSI:', mmsi)
    setSelectedVesselMMSI(mmsi)
  }

  // Handler for resetting highscore
  const handleReset = async () => {
    console.log('🗑️ Resetting all data...')

    // Clear localStorage
    localStorage.removeItem('vesselPassages')
    localStorage.removeItem('stationaryRecords')
    localStorage.setItem('dataVersion', '2') // Keep version

    // Clear state
    setPassages([])
    setStationaryRecords([])

    // Reset tracking refs
    previousVesselsRef.current = new Set()
    isFirstLoadRef.current = true
    lastStationaryUpdateRef.current = Date.now()

    // Try to clear Redis (optional - will clear on next cron run anyway)
    try {
      await fetch('/api/passages/reset', { method: 'POST' })
      console.log('✅ Redis cleared')
    } catch (error) {
      console.error('Error clearing Redis:', error)
    }

    console.log('✅ All data reset - starting fresh!')
  }

  // Geofence bounds state with localStorage persistence
  const [geofenceBounds, setGeofenceBounds] = useState<GeofenceBounds>(DEFAULT_BOUNDS)

  // Vessel passage history from API + localStorage
  const [passages, setPassages] = useState<VesselPassage[]>([])

  // Stationary vessel tracking (boats staying still in geofence)
  const [stationaryRecords, setStationaryRecords] = useState<StationaryRecord[]>([])
  const lastStationaryUpdateRef = useRef<number>(Date.now())

  // Fetch passages from backend API
  const { data: passagesData } = useSWR<{ passages: VesselPassage[]; source: string }>(
    '/api/passages',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  )

  // Load bounds, passages, and stationary records on mount
  useEffect(() => {
    console.log('🔧 Loading saved data from localStorage...')

    const savedBounds = localStorage.getItem('geofenceBounds')
    if (savedBounds) {
      try {
        setGeofenceBounds(JSON.parse(savedBounds))
      } catch (e) {
        console.error('Failed to parse saved bounds:', e)
      }
    }

    // Check for data version - if old format, clear it
    const dataVersion = localStorage.getItem('dataVersion')
    const currentVersion = '2' // Increment this when we change data structure

    if (dataVersion !== currentVersion) {
      console.log('🔄 Old data format detected, clearing localStorage...')
      localStorage.removeItem('vesselPassages')
      localStorage.removeItem('stationaryRecords')
      localStorage.setItem('dataVersion', currentVersion)
      console.log('✅ localStorage cleared - starting fresh')
      return // Don't load old data
    }

    // Load localStorage passages for backward compatibility
    const savedPassages = localStorage.getItem('vesselPassages')
    if (savedPassages) {
      try {
        const localPassages = JSON.parse(savedPassages)
        console.log('📦 Loaded', localPassages.length, 'passages from localStorage')
        setPassages(localPassages)
      } catch (e) {
        console.error('Failed to parse saved passages:', e)
      }
    }

    // Load stationary records
    const savedStationary = localStorage.getItem('stationaryRecords')
    if (savedStationary) {
      try {
        const records = JSON.parse(savedStationary)
        // Filter out records older than 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        const recentRecords = records.filter((r: StationaryRecord) => r.lastSeen >= thirtyDaysAgo)
        console.log('⚓ Loaded', recentRecords.length, 'stationary records from localStorage')
        setStationaryRecords(recentRecords)
      } catch (e) {
        console.error('Failed to parse stationary records:', e)
      }
    }
  }, [])

  // Merge API passages with localStorage passages
  useEffect(() => {
    if (passagesData?.passages) {
      setPassages(prev => {
        // Merge API passages with localStorage passages
        const apiPassages = passagesData.passages
        const allPassages = [...prev, ...apiPassages]

        // Remove duplicates based on mmsi + timestamp + type
        const uniquePassages = allPassages.filter((passage, index, self) =>
          index === self.findIndex(p =>
            p.mmsi === passage.mmsi &&
            p.timestamp === passage.timestamp &&
            p.type === passage.type
          )
        )

        // Sort by timestamp (newest first)
        uniquePassages.sort((a, b) => b.timestamp - a.timestamp)

        return uniquePassages
      })
    }
  }, [passagesData])

  // Save bounds to localStorage and API when changed
  const handleBoundsChange = async (newBounds: GeofenceBounds) => {
    setGeofenceBounds(newBounds)
    localStorage.setItem('geofenceBounds', JSON.stringify(newBounds))

    // Sync bounds to API for cron job
    try {
      await fetch('/api/passages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds: newBounds }),
      })
    } catch (error) {
      console.error('Failed to sync bounds to API:', error)
    }

    // Reset tracking when bounds change
    previousVesselsRef.current = new Set()
    isFirstLoadRef.current = true
  }

  // Track vessels entering/leaving the geofenced area AND stationary vessels
  useEffect(() => {
    if (!data?.vessels) return

    // Filter vessels within current geofence bounds
    const vesselsInBounds = data.vessels.filter(v =>
      v.latitude >= geofenceBounds.latMin &&
      v.latitude <= geofenceBounds.latMax &&
      v.longitude >= geofenceBounds.lonMin &&
      v.longitude <= geofenceBounds.lonMax
    )

    // Track stationary vessels (speed < 0.5 knots and in bounds)
    // Only update once per 30 seconds to avoid rapid counting
    const now = Date.now()
    const timeSinceLastUpdate = now - lastStationaryUpdateRef.current
    const shouldUpdateStationary = timeSinceLastUpdate >= 30000 // 30 seconds

    if (shouldUpdateStationary) {
      console.log('⏱️ Updating stationary vessels - elapsed:', (timeSinceLastUpdate / 1000).toFixed(1), 'seconds')

      const stationaryThreshold = 0.5 // knots
      const actualMinutesElapsed = timeSinceLastUpdate / 60000 // Convert ms to minutes

      // Use functional update to avoid dependency issues
      setStationaryRecords(prevRecords => {
        const updatedStationary = [...prevRecords]

        vesselsInBounds.forEach(vessel => {
          if (vessel.speed < stationaryThreshold) {
            // Vessel is stationary
            const existingIndex = updatedStationary.findIndex(r => r.mmsi === vessel.mmsi)

            if (existingIndex >= 0) {
              // Update existing record
              const existing = updatedStationary[existingIndex]
              const distance = Math.sqrt(
                Math.pow(existing.lastPosition.lat - vessel.latitude, 2) +
                Math.pow(existing.lastPosition.lon - vessel.longitude, 2)
              )

              // If barely moved (< 0.0001 degrees ~10m), add time
              if (distance < 0.0001) {
                console.log('⚓ Adding', actualMinutesElapsed.toFixed(2), 'min to', vessel.name)
                updatedStationary[existingIndex] = {
                  ...existing,
                  totalMinutesStationary: existing.totalMinutesStationary + actualMinutesElapsed,
                  lastSeen: now,
                  lastPosition: { lat: vessel.latitude, lon: vessel.longitude },
                }
              } else {
                // Moved, reset
                console.log('🔄 Vessel moved, resetting:', vessel.name)
                updatedStationary[existingIndex] = {
                  ...existing,
                  totalMinutesStationary: 0,
                  lastSeen: now,
                  lastPosition: { lat: vessel.latitude, lon: vessel.longitude },
                }
              }
            } else {
              // New stationary vessel
              console.log('🆕 New stationary vessel:', vessel.name)
              updatedStationary.push({
                mmsi: vessel.mmsi,
                vesselName: vessel.name,
                totalMinutesStationary: 0, // Start at 0, will accumulate on next update
                lastSeen: now,
                lastPosition: { lat: vessel.latitude, lon: vessel.longitude },
              })
            }
          }
        })

        // Clean up old records (older than 30 days)
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
        const cleanedStationary = updatedStationary.filter(r => r.lastSeen >= thirtyDaysAgo)

        localStorage.setItem('stationaryRecords', JSON.stringify(cleanedStationary))
        return cleanedStationary
      })

      lastStationaryUpdateRef.current = now
    }

    const currentMMSIs = new Set(vesselsInBounds.map(v => v.mmsi))

    // Skip notifications and tracking on first load
    // This ensures we only count vessels that ENTER after page load
    if (isFirstLoadRef.current) {
      previousVesselsRef.current = currentMMSIs
      isFirstLoadRef.current = false
      console.log('🔵 Initial load - skipping passage tracking for', currentMMSIs.size, 'vessels already in bounds')
      return
    }

    // Find vessels that entered (new MMSIs)
    const entered = Array.from(currentMMSIs).filter(
      mmsi => !previousVesselsRef.current.has(mmsi)
    )

    // Find vessels that left (old MMSIs not in current)
    const left = Array.from(previousVesselsRef.current).filter(
      mmsi => !currentMMSIs.has(mmsi)
    )

    // Track all passages (both entering and leaving)
    const newPassages: VesselPassage[] = []

    // Log entering vessels
    entered.forEach(mmsi => {
      const vessel = vesselsInBounds.find(v => v.mmsi === mmsi)
      if (vessel) {
        console.log('✅ ENTER geofence:', vessel.name, 'MMSI:', vessel.mmsi)
        newPassages.push({
          mmsi: vessel.mmsi,
          vesselName: vessel.name,
          timestamp: Date.now(),
          type: 'enter',
        })
      }
    })

    // Log leaving vessels
    left.forEach(mmsi => {
      console.log('❌ EXIT geofence: MMSI', mmsi)
      newPassages.push({
        mmsi,
        vesselName: `MMSI ${mmsi}`, // We don't have the name for vessels that left
        timestamp: Date.now(),
        type: 'exit',
      })
    })

    // Update passages state and localStorage
    if (newPassages.length > 0) {
      setPassages(prev => {
        const updated = [...prev, ...newPassages]
        localStorage.setItem('vesselPassages', JSON.stringify(updated))
        return updated
      })
    }

    // Show notification for first entering vessel
    if (entered.length > 0) {
      const vessel = vesselsInBounds.find(v => v.mmsi === entered[0])
      if (vessel) {
        setNotification({
          id: `enter-${vessel.mmsi}-${Date.now()}`,
          type: 'enter',
          vesselName: vessel.name,
          mmsi: vessel.mmsi,
          timestamp: Date.now(),
        })
      }
    }
    // Show notification for first leaving vessel (prioritize entering if both)
    else if (left.length > 0) {
      setNotification({
        id: `exit-${left[0]}-${Date.now()}`,
        type: 'exit',
        vesselName: `MMSI ${left[0]}`,
        mmsi: left[0],
        timestamp: Date.now(),
      })
    }

    // Update previous vessels
    previousVesselsRef.current = currentMMSIs
  }, [data, geofenceBounds])

  if (error) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff5f5',
          color: '#c53030',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '10px' }}>Feil ved lasting av AIS-data</h2>
        <p>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#c53030',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Prøv igjen
        </button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
          fontSize: '18px',
          color: '#555',
        }}
      >
        Henter AIS-data...
      </div>
    )
  }

  return (
    <>
      <AISMap
        vessels={data.vessels}
        source={data.source}
        geofenceBounds={geofenceBounds}
        selectedVesselMMSI={selectedVesselMMSI}
      />
      <GeofenceNotification notification={notification} />
      <GeofenceSettings bounds={geofenceBounds} onBoundsChange={handleBoundsChange} />
      <HighScorePanel
        passages={passages}
        onVesselClick={handleVesselClick}
        onReset={handleReset}
      />
      <CurrentVesselsList
        vessels={data.vessels}
        onVesselClick={handleVesselClick}
      />
      <StationaryVesselsPanel
        records={stationaryRecords}
        onVesselClick={handleVesselClick}
      />
    </>
  )
}
