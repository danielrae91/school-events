import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset all statistics
    await redis.del('stats:page_views')
    await redis.del('stats:unique_visitors')
    await redis.del('stats:subscribe_clicks')
    await redis.del('stats:add_to_calendar_clicks')
    await redis.del('stats:feedback_submissions')
    await redis.del('stats:event_suggestions')
    await redis.del('stats:pwa_installs')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting stats:', error)
    return NextResponse.json({ error: 'Failed to reset stats' }, { status: 500 })
  }
}
