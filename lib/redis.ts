import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable not set')
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null // Stop retrying
        }
        return Math.min(times * 200, 1000) // Exponential backoff
      },
    })
  }

  return redis
}

// Helper functions for common operations
export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  const data = await redis.get(key)
  if (!data) return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export async function redisSet(key: string, value: any): Promise<void> {
  const redis = getRedis()
  await redis.set(key, JSON.stringify(value))
}
