'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import type { AISResponse } from '@/types/ais'
import GeofenceNotification, { type VesselNotification } from '@/components/GeofenceNotification'
import GeofenceSettings from '@/components/GeofenceSettings'
import HighScorePanel from '@/components/HighScorePanel'
import CurrentVesselsList from '@/components/CurrentVesselsList'
import type { GeofenceBounds } from '@/components/AISMap'
import type { VesselPassage } from '@/types/passage'

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
    console.log('🗑️ Resetting highscore...')

    // Clear localStorage
    localStorage.removeItem('vesselPassages')

    // Clear state
    setPassages([])

    // Try to clear Redis (optional - will clear on next cron run anyway)
    try {
      await fetch('/api/passages/reset', { method: 'POST' })
      console.log('✅ Redis cleared')
    } catch (error) {
      console.error('Error clearing Redis:', error)
    }

    console.log('✅ Highscore reset complete')
  }

  // Geofence bounds state with localStorage persistence
  const [geofenceBounds, setGeofenceBounds] = useState<GeofenceBounds>(DEFAULT_BOUNDS)

  // Vessel passage history from API + localStorage
  const [passages, setPassages] = useState<VesselPassage[]>([])

  // Fetch passages from backend API
  const { data: passagesData } = useSWR<{ passages: VesselPassage[]; source: string }>(
    '/api/passages',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  )

  // Load bounds and passages on mount
  useEffect(() => {
    const savedBounds = localStorage.getItem('geofenceBounds')
    if (savedBounds) {
      try {
        setGeofenceBounds(JSON.parse(savedBounds))
      } catch (e) {
        console.error('Failed to parse saved bounds:', e)
      }
    }

    // Load localStorage passages for backward compatibility
    const savedPassages = localStorage.getItem('vesselPassages')
    if (savedPassages) {
      try {
        const localPassages = JSON.parse(savedPassages)
        setPassages(localPassages)
      } catch (e) {
        console.error('Failed to parse saved passages:', e)
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

  // Track vessels entering/leaving the geofenced area
  useEffect(() => {
    if (!data?.vessels) return

    // Filter vessels within current geofence bounds
    const vesselsInBounds = data.vessels.filter(v =>
      v.latitude >= geofenceBounds.latMin &&
      v.latitude <= geofenceBounds.latMax &&
      v.longitude >= geofenceBounds.lonMin &&
      v.longitude <= geofenceBounds.lonMax
    )

    const currentMMSIs = new Set(vesselsInBounds.map(v => v.mmsi))

    // Skip notifications on first load
    if (isFirstLoadRef.current) {
      previousVesselsRef.current = currentMMSIs
      isFirstLoadRef.current = false
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

  // Filter vessels that are currently within geofence bounds
  const vesselsInBounds = data.vessels.filter(v =>
    v.latitude >= geofenceBounds.latMin &&
    v.latitude <= geofenceBounds.latMax &&
    v.longitude >= geofenceBounds.lonMin &&
    v.longitude <= geofenceBounds.lonMax
  )

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
        vessels={vesselsInBounds}
        onVesselClick={handleVesselClick}
      />
    </>
  )
}
