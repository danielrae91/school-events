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

    // Get all push subscriptions
    const subscriptionKeys = await redis.keys('push_subscription:*')
    const subscriptions = []
    
    for (const key of subscriptionKeys) {
      const data = await redis.hgetall(key)
      if (data && data.endpoint) {
        const subscriptionId = key.replace('push_subscription:', '')
        
        // Get last notification status for this subscriber
        const lastNotificationKey = `last_notification:${subscriptionId}`
        const lastNotification = await redis.hgetall(lastNotificationKey)
        
        subscriptions.push({
          id: subscriptionId,
          endpoint: data.endpoint as string,
          userAgent: (data.userAgent as string) || 'Unknown',
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          lastNotificationStatus: (lastNotification && lastNotification.status as string) || 'never',
          lastNotificationTime: (lastNotification && lastNotification.timestamp as string) || null,
          lastNotificationTitle: (lastNotification && lastNotification.title as string) || null
        })
      }
    }

    // Sort by creation date descending
    subscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ subscriptions })

  } catch (error) {
    console.error('Error fetching push subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Clear all push subscriptions
    const subscriptionKeys = await redis.keys('push_subscription:*')
    const lastNotificationKeys = await redis.keys('last_notification:*')
    
    if (subscriptionKeys.length > 0) {
      await redis.del(...subscriptionKeys)
    }
    
    if (lastNotificationKeys.length > 0) {
      await redis.del(...lastNotificationKeys)
    }

    return NextResponse.json({ 
      message: 'All subscriptions cleared',
      deletedCount: subscriptionKeys.length
    })

  } catch (error) {
    console.error('Error clearing subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
