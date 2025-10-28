'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import type { AISResponse } from '@/types/ais'

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

  return <AISMap vessels={data.vessels} source={data.source} />
}
