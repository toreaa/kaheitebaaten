import { NextResponse } from 'next/server'
import { redisSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Clear all passages from Redis
    await redisSet('passages:all', [])

    // Also clear tracking state
    await redisSet('tracking:current_vessels', [])
    await redisSet('tracking:vessel_names', {})

    console.log('🗑️ Redis passages cleared')

    return NextResponse.json({ success: true, message: 'Highscore reset successfully' })
  } catch (error) {
    console.error('Error resetting passages in Redis:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
