'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import type { AISResponse } from '@/types/ais'
import GeofenceNotification, { type VesselNotification } from '@/components/GeofenceNotification'

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
  const previousVesselsRef = useRef<Set<number>>(new Set())
  const isFirstLoadRef = useRef(true)

  // Track vessels entering/leaving the geofenced area
  useEffect(() => {
    if (!data?.vessels) return

    const currentMMSIs = new Set(data.vessels.map(v => v.mmsi))

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

    // Show notification for entering vessels
    if (entered.length > 0) {
      const vessel = data.vessels.find(v => v.mmsi === entered[0])
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
    // Show notification for leaving vessels (prioritize entering if both)
    else if (left.length > 0) {
      // Find vessel name from previous data if possible
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
  }, [data])

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
      <AISMap vessels={data.vessels} source={data.source} />
      <GeofenceNotification notification={notification} />
    </>
  )
}
