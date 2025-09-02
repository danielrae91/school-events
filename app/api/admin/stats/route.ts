import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

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
