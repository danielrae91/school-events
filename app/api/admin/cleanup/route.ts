import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all event keys and sorted set entries
    const eventKeys = await redis.keys('tk:event:*')
    const eventsList = await redis.zrange('tk:events:by_date', 0, -1)
    
    // Find orphaned entries in sorted set
    const orphanedEntries = []
    for (const eventId of eventsList) {
      const keyExists = eventKeys.includes(`tk:event:${eventId}`)
      if (!keyExists) {
        orphanedEntries.push(eventId)
      }
    }

    // Remove orphaned entries from sorted set
    let cleanedCount = 0
    for (const orphanedId of orphanedEntries) {
      await redis.zrem('tk:events:by_date', orphanedId)
      cleanedCount++
    }

    return NextResponse.json({
      success: true,
      orphanedEntriesRemoved: cleanedCount,
      remainingEventKeys: eventKeys.length,
      remainingSortedSetEntries: eventsList.length - cleanedCount
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
