import { NextResponse } from 'next/server'
import type { AISResponse, AISVessel } from '@/types/ais'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Mock data for Tromsøysundet area
const MOCK_VESSELS: AISVessel[] = [
  {
    mmsi: 259016950,
    name: 'BASTO VII',
    latitude: 69.6508,
    longitude: 18.9610,
    speed: 0.3,
    course: 245,
    heading: 245,
    timestamp: new Date().toISOString(),
    shipType: 'Passenger',
    destination: 'TROMSO',
    eta: new Date(Date.now() + 1800000).toISOString(),
  },
  {
    mmsi: 257007270,
    name: 'HERJULF',
    latitude: 69.6489,
    longitude: 18.9702,
    speed: 2.1,
    course: 180,
    heading: 178,
    timestamp: new Date().toISOString(),
    shipType: 'Cargo',
    destination: 'TROMSO HAVN',
  },
  {
    mmsi: 257293000,
    name: 'NORDNORGE',
    latitude: 69.6545,
    longitude: 18.9455,
    speed: 0.1,
    course: 90,
    heading: 92,
    timestamp: new Date().toISOString(),
    shipType: 'Passenger',
    destination: 'TROMSO-KIRKENES',
    eta: new Date(Date.now() + 3600000).toISOString(),
  },
  {
    mmsi: 257004300,
    name: 'TROLLFJORD',
    latitude: 69.6520,
    longitude: 18.9580,
    speed: 0.0,
    course: 0,
    heading: 315,
    timestamp: new Date().toISOString(),
    shipType: 'Passenger',
    destination: 'BERGEN',
  },
  {
    mmsi: 257123000,
    name: 'KRONPRINS HAAKON',
    latitude: 69.6475,
    longitude: 18.9825,
    speed: 0.5,
    course: 45,
    heading: 48,
    timestamp: new Date().toISOString(),
    shipType: 'Research',
    destination: 'TROMSO HAVN',
  },
]

async function fetchLiveAIS(): Promise<AISVessel[] | null> {
  const apiKey = process.env.AIS_API_KEY

  if (!apiKey) {
    return null
  }

  try {
    // Example for AISHub or similar service
    // Adjust based on your actual AIS data provider
    const bounds = {
      latMin: 69.62,
      latMax: 69.68,
      lonMin: 18.90,
      lonMax: 19.02,
    }

    const url = `https://data.aishub.net/ws.php?username=${apiKey}&format=1&output=json&compress=0&latmin=${bounds.latMin}&latmax=${bounds.latMax}&lonmin=${bounds.lonMin}&lonmax=${bounds.lonMax}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'kaheitebaaten-app',
      },
    })

    if (!response.ok) {
      console.error('AIS API error:', response.status)
      return null
    }

    const data = await response.json()

    // Transform the response based on your API provider's format
    // This is a generic example - adjust field names as needed
    return data.map((vessel: any) => ({
      mmsi: vessel.MMSI,
      name: vessel.NAME || 'Unknown',
      latitude: parseFloat(vessel.LATITUDE),
      longitude: parseFloat(vessel.LONGITUDE),
      speed: parseFloat(vessel.SPEED) || 0,
      course: parseFloat(vessel.COURSE) || 0,
      heading: parseFloat(vessel.HEADING) || 0,
      timestamp: vessel.TIME || new Date().toISOString(),
      shipType: vessel.TYPE,
      destination: vessel.DESTINATION,
      eta: vessel.ETA,
    }))
  } catch (error) {
    console.error('Error fetching live AIS data:', error)
    return null
  }
}

export async function GET() {
  const liveData = await fetchLiveAIS()

  const response: AISResponse = {
    vessels: liveData || MOCK_VESSELS,
    source: liveData ? 'live' : 'mock',
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
