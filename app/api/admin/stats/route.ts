import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Allow public access to stats for main page display
    // Admin authorization only required for admin panel access

    // Get stats from Redis
    const [
      pageViews,
      uniqueViews,
      subscribeClicks,
      addToCalendarClicks
    ] = await Promise.all([
      redis.get('stats:page_views') || '0',
      redis.scard('stats:unique_visitors'),
      redis.get('stats:subscribe_clicks') || '0',
      redis.get('stats:add_to_calendar_clicks') || '0'
    ])

    const stats = {
      pageViews: parseInt(pageViews as string),
      uniqueViews: uniqueViews || 0,
      subscribeClicks: parseInt(subscribeClicks as string),
      addToCalendarClicks: parseInt(addToCalendarClicks as string)
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, visitorId } = body

    switch (action) {
      case 'page_view':
        await redis.incr('stats:page_views')
        if (visitorId) {
          await redis.sadd('stats:unique_visitors', visitorId)
        }
        break
      
      case 'calendarSubscription':
        await redis.incr('stats:subscribe_clicks')
        break
      
      case 'addToCalendar':
        await redis.incr('stats:add_to_calendar_clicks')
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
