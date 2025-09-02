import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all Redis keys related to events
    const eventKeys = await redis.keys('tk:event:*')
    const eventsList = await redis.zrange('tk:events:by_date', 0, -1, { withScores: true })
    
    // Get sample event data
    const sampleEvents = []
    for (const key of eventKeys.slice(0, 3)) {
      const eventData = await redis.hgetall(key)
      sampleEvents.push({ key, data: eventData })
    }

    return NextResponse.json({
      totalEventKeys: eventKeys.length,
      eventKeysPreview: eventKeys.slice(0, 10),
      eventsListCount: eventsList.length,
      eventsListPreview: eventsList.slice(0, 10),
      sampleEvents
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
