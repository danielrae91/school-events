import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { action, visitorId } = await request.json()

    if (!action || !visitorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    switch (action) {
      case 'page_view':
        // Increment total page views
        await redis.incr('stats:page_views')
        
        // Add visitor to unique visitors set
        await redis.sadd('stats:unique_visitors', visitorId)
        break

      case 'subscribe_click':
        await redis.incr('stats:subscribe_clicks')
        break

      case 'add_to_calendar_click':
        await redis.incr('stats:add_to_calendar_clicks')
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
