import { NextResponse } from 'next/server'
import { redisGet, redisSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// Tromsøysundet default bounds (will be replaced with user's custom bounds if available)
const DEFAULT_BOUNDS = {
  latMin: 69.62,
  latMax: 69.68,
  lonMin: 18.90,
  lonMax: 19.02,
}

interface BarentswatchVessel {
  mmsi: number
  name: string
  latitude: number
  longitude: number
  speedOverGround: number
  courseOverGround: number
  trueHeading: number
  msgtime: string
  shipType?: string
  destination?: string
}

interface VesselPassage {
  mmsi: number
  vesselName: string
  timestamp: number
  type: 'enter' | 'exit'
}

interface GeofenceBounds {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

// Token cache (in-memory for edge runtime)
let cachedToken: { token: string; expires: number } | null = null

async function getBarentswatchToken(): Promise<string | null> {
  const clientId = process.env.BARENTSWATCH_CLIENT_ID?.trim()
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET?.trim()

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
      console.error('Token request failed:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    cachedToken = {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting token:', error)
    return null
  }
}

async function fetchAISData(bounds: GeofenceBounds): Promise<BarentswatchVessel[]> {
  const token = await getBarentswatchToken()

  if (!token) {
    console.log('No Barentswatch token available')
    return []
  }

  try {
    // Fetch vessels within the geofenced area
    const params = new URLSearchParams({
      Xmin: bounds.lonMin.toString(),
      Xmax: bounds.lonMax.toString(),
      Ymin: bounds.latMin.toString(),
      Ymax: bounds.latMax.toString(),
    })

    const response = await fetch(
      `https://live.ais.barentswatch.no/v1/latest/combined?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error('AIS data fetch failed:', response.status, await response.text())
      return []
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('Error fetching AIS data:', error)
    return []
  }
}

export async function GET() {
  try {
    // Get current geofence bounds from Redis or use defaults
    let bounds: GeofenceBounds
    try {
      const savedBounds = await redisGet<GeofenceBounds>('geofence:bounds')
      bounds = savedBounds || DEFAULT_BOUNDS
    } catch (error) {
      console.log('Using default bounds, Redis not available yet:', error)
      bounds = DEFAULT_BOUNDS
    }

    // Fetch current vessels in the area
    const vessels = await fetchAISData(bounds)

    if (vessels.length === 0) {
      console.log('No vessels found in area')
      return NextResponse.json({
        success: true,
        message: 'No vessels in area',
        vesselsChecked: 0
      })
    }

    // Get vessel names for all vessels (to preserve names for exit events)
    const vesselNames: Record<number, string> = {}
    vessels.forEach(v => {
      vesselNames[v.mmsi] = v.name
    })

    // Get previous vessel state from Redis
    let previousMMSIs: number[] = []
    try {
      const stored = await redisGet<number[]>('tracking:current_vessels')
      previousMMSIs = stored || []
    } catch (error) {
      console.error('Error reading previous vessels from Redis:', error)
    }

    const previousSet = new Set(previousMMSIs)
    const currentMMSIs = vessels.map(v => v.mmsi)
    const currentSet = new Set(currentMMSIs)

    // Find vessels that entered (new MMSIs)
    const entered = currentMMSIs.filter(mmsi => !previousSet.has(mmsi))

    // Find vessels that left (old MMSIs not in current)
    const left = previousMMSIs.filter(mmsi => !currentSet.has(mmsi))

    // Create passage records
    const newPassages: VesselPassage[] = []

    // Get vessel names from Redis for vessels that left
    let storedVesselNames: Record<number, string> = {}
    try {
      const stored = await redisGet<Record<number, string>>('tracking:vessel_names')
      storedVesselNames = stored || {}
    } catch (error) {
      console.error('Error reading vessel names from Redis:', error)
    }

    // Log entering vessels
    entered.forEach(mmsi => {
      const vessel = vessels.find(v => v.mmsi === mmsi)
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
      const vesselName = storedVesselNames[mmsi] || `MMSI ${mmsi}`
      newPassages.push({
        mmsi,
        vesselName,
        timestamp: Date.now(),
        type: 'exit',
      })
    })

    // Save passages to Redis
    if (newPassages.length > 0) {
      try {
        // Append to existing passages list
        const existingPassages = await redisGet<VesselPassage[]>('passages:all') || []
        const updatedPassages = [...existingPassages, ...newPassages]

        // Keep only last 10,000 passages to avoid growing too large
        const trimmedPassages = updatedPassages.slice(-10000)

        await redisSet('passages:all', trimmedPassages)

        console.log(`Logged ${newPassages.length} passages:`, newPassages)
      } catch (error) {
        console.error('Error saving passages to Redis:', error)
      }
    }

    // Update current vessel state
    try {
      await redisSet('tracking:current_vessels', currentMMSIs)

      // Update vessel names map (merge with existing)
      const updatedNames = { ...storedVesselNames, ...vesselNames }
      await redisSet('tracking:vessel_names', updatedNames)
    } catch (error) {
      console.error('Error updating vessel state in Redis:', error)
    }

    return NextResponse.json({
      success: true,
      vesselsChecked: vessels.length,
      entered: entered.length,
      left: left.length,
      passagesLogged: newPassages.length,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
