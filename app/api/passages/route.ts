import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface VesselPassage {
  mmsi: number
  vesselName: string
  timestamp: number
  type: 'enter' | 'exit'
}

export async function GET() {
  try {
    const passages = await kv.get<VesselPassage[]>('passages:all')

    return NextResponse.json({
      passages: passages || [],
      source: passages && passages.length > 0 ? 'kv' : 'empty',
    })
  } catch (error) {
    console.error('Error fetching passages from KV:', error)

    // Return empty array if KV is not set up yet
    return NextResponse.json({
      passages: [],
      source: 'error',
      error: String(error),
    })
  }
}

// Endpoint to update geofence bounds
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bounds } = body

    if (!bounds || typeof bounds !== 'object') {
      return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 })
    }

    // Validate bounds structure
    const { latMin, latMax, lonMin, lonMax } = bounds
    if (
      typeof latMin !== 'number' ||
      typeof latMax !== 'number' ||
      typeof lonMin !== 'number' ||
      typeof lonMax !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid bounds format' }, { status: 400 })
    }

    // Save bounds to KV
    await kv.set('geofence:bounds', bounds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving bounds to KV:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
