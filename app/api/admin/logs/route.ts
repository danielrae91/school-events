import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get email processing logs from Redis
    const logKeys = await redis.keys('email_log:*')
    const logs = []

    for (const key of logKeys) {
      const logData = await redis.hgetall(key)
      if (logData && Object.keys(logData).length > 0) {
        const timestampValue = typeof logData.timestamp === 'string' ? logData.timestamp : new Date().toISOString()
        logs.push({
          id: key.replace('email_log:', ''),
          ...logData,
          timestamp: new Date(timestampValue)
        })
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
