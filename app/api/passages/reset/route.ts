import { NextResponse } from 'next/server'
import { redisSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Clear all passages from Redis
    await redisSet('passages:all', [])

    // Also clear tracking state (forces cron job to do fresh first-run)
    await redisSet('tracking:current_vessels', [])
    await redisSet('tracking:vessel_names', {})
    await redisSet('tracking:vessel_positions', {})

    console.log('🗑️ Redis passages and tracking state cleared - next cron run will be treated as first run')

    return NextResponse.json({ success: true, message: 'Highscore reset successfully' })
  } catch (error) {
    console.error('Error resetting passages in Redis:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
