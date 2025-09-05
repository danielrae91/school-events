import { NextRequest, NextResponse } from 'next/server'
import { getActivePushSubscriptions } from '@/lib/pushNotifications'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check VAPID key configuration
    const vapidPublic = process.env.VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const nextPublicVapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    
    // Get active subscriptions
    const subscriptions = await getActivePushSubscriptions()
    
    // Get subscription IDs from Redis
    const subscriptionIds = await redis.smembers('active_push_subscriptions')
    
    // Get detailed info for each subscription
    const subscriptionDetails = []
    for (const id of subscriptionIds) {
      const data = await redis.hgetall(id)
      subscriptionDetails.push({ id, data })
    }
    
    return NextResponse.json({
      vapidKeysConfigured: {
        public: !!vapidPublic,
        private: !!vapidPrivate,
        nextPublic: !!nextPublicVapid,
        publicKeyLength: vapidPublic?.length || 0,
        privateKeyLength: vapidPrivate?.length || 0
      },
      subscriptions: {
        activeCount: subscriptions.length,
        totalIdsInRedis: subscriptionIds.length,
        details: subscriptionDetails
      },
      redisConnection: await redis.ping() === 'PONG'
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
