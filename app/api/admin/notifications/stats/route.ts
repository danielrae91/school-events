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

    // Get notification history
    const historyKeys = await redis.keys('notification_log:*')
    const history = []
    
    for (const key of historyKeys.slice(-10)) { // Last 10 notifications
      const data = await redis.hgetall(key)
      if (data && data.timestamp) {
        history.push({
          id: key.replace('notification_log:', ''),
          timestamp: data.timestamp as string,
          title: (data.title as string) || 'Unknown',
          recipientCount: parseInt((data.recipientCount as string) || '0') || 0,
          successCount: parseInt((data.successCount as string) || '0') || 0,
          failureCount: parseInt((data.failureCount as string) || '0') || 0
        })
      }
    }

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Get current subscribers
    const subscriptionKeys = await redis.keys('push_subscription:*')
    const subscriberCount = subscriptionKeys.length

    // Calculate total notifications sent
    const totalSent = history.reduce((sum, notif) => sum + notif.recipientCount, 0)
    const totalSuccessful = history.reduce((sum, notif) => sum + notif.successCount, 0)

    return NextResponse.json({
      history: history.slice(0, 10), // Last 10 notifications
      subscriberCount,
      totalSent,
      totalSuccessful,
      recentHistory: history.slice(0, 2) // Last 2 for overview
    })

  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
