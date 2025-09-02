import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get all email log keys
    const keys = await redis.keys('email_log:*')
    const logs = []

    for (const key of keys) {
      const logData = await redis.hgetall(key)
      if (logData && Object.keys(logData).length > 0) {
        // Parse JSON fields safely
        try {
          if (logData.createdEvents) {
            logData.createdEventsArray = JSON.parse(logData.createdEvents as string)
          }
          if (logData.createdEventTitles) {
            logData.createdEventTitlesArray = JSON.parse(logData.createdEventTitles as string)
          }
        } catch (e) {
          // Keep original string if parsing fails
        }
        logs.push(logData)
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a: any, b: any) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    )
  }
}
