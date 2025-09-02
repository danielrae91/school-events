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

    // Get all event keys
    const eventKeys = await redis.keys('tk:event:*')
    const duplicateGroups: Record<string, string[]> = {}
    
    // Group events by title+date combination
    for (const key of eventKeys) {
      const eventData = await redis.hgetall(key)
      if (eventData.title && eventData.start_date) {
        const signature = `${eventData.title}:${eventData.start_date}`
        if (!duplicateGroups[signature]) {
          duplicateGroups[signature] = []
        }
        duplicateGroups[signature].push(key)
      }
    }

    // Find actual duplicates (groups with more than 1 event)
    const duplicates = Object.entries(duplicateGroups)
      .filter(([_, keys]) => keys.length > 1)
      .map(([signature, keys]) => ({ signature, keys, count: keys.length }))

    // Remove duplicates (keep the first one, remove others)
    let removedCount = 0
    for (const { keys } of duplicates) {
      // Keep first event, remove the rest
      for (let i = 1; i < keys.length; i++) {
        const eventId = keys[i].replace('tk:event:', '')
        await redis.del(keys[i])
        await redis.zrem('tk:events:by_date', eventId)
        removedCount++
      }
    }

    return NextResponse.json({
      success: true,
      duplicateGroups: duplicates.length,
      duplicatesRemoved: removedCount,
      totalEvents: eventKeys.length - removedCount
    })
  } catch (error) {
    console.error('Deduplication error:', error)
    return NextResponse.json(
      { error: 'Deduplication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
