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

// Tromsøysundet bounds
const TROMSO_BOUNDS = {
  latMin: 69.62,
  latMax: 69.68,
  lonMin: 18.90,
  lonMax: 19.02,
}

// Cache token to avoid fetching on every request (tokens are valid for 1 hour)
let cachedToken: { token: string; expires: number } | null = null

async function getBarentswatchToken(): Promise<string | null> {
  const clientId = process.env.BARENTSWATCH_CLIENT_ID
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expires > Date.now() + 300000) {
    return cachedToken.token
  }

  try {
    const response = await fetch('https://id.barentswatch.no/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'ais',
      }),
    })

    if (!response.ok) {
      console.error('Barentswatch token error:', response.status)
      return null
    }

    const data = await response.json()

    // Cache the token
    cachedToken = {
      token: data.access_token,
      expires: Date.now() + (data.expires_in * 1000),
    }

    return data.access_token
  } catch (error) {
    console.error('Error fetching Barentswatch token:', error)
    return null
  }
}

function isInBounds(lat: number, lon: number): boolean {
  return (
    lat >= TROMSO_BOUNDS.latMin &&
    lat <= TROMSO_BOUNDS.latMax &&
    lon >= TROMSO_BOUNDS.lonMin &&
    lon <= TROMSO_BOUNDS.lonMax
  )
}

async function fetchLiveAIS(): Promise<AISVessel[] | null> {
  const token = await getBarentswatchToken()

  if (!token) {
    return null
  }

  try {
    const response = await fetch(
      'https://live.ais.barentswatch.no/v1/latest/combined',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Barentswatch AIS API error:', response.status)
      return null
    }

    const data = await response.json()

    // Filter and transform vessels in Tromsøysundet area
    const vessels: AISVessel[] = []

    for (const vessel of data) {
      // Extract position from geometry
      const lat = vessel.geometry?.coordinates?.[1]
      const lon = vessel.geometry?.coordinates?.[0]

      if (!lat || !lon || !isInBounds(lat, lon)) {
        continue
      }

      // Map Barentswatch data to our format
      vessels.push({
        mmsi: vessel.mmsi || 0,
        name: vessel.name || 'Unknown',
        latitude: lat,
        longitude: lon,
        speed: vessel.speedOverGround || 0,
        course: vessel.courseOverGround || 0,
        heading: vessel.trueHeading || vessel.courseOverGround || 0,
        timestamp: vessel.msgtime || new Date().toISOString(),
        shipType: vessel.shipType || undefined,
        destination: vessel.destination || undefined,
        eta: vessel.eta || undefined,
      })
    }

    return vessels.length > 0 ? vessels : null
  } catch (error) {
    console.error('Error fetching live AIS data from Barentswatch:', error)
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
