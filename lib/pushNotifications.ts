import { redis } from './db'

// VAPID keys - these should be in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  eventId?: string
  eventTitle?: string
  eventDate?: string
}

// Store push subscription
export async function storePushSubscription(subscription: PushSubscription, userId?: string) {
  const subscriptionId = `push_sub:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  await redis.hset(subscriptionId, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userId: userId || 'anonymous',
    createdAt: new Date().toISOString(),
    active: 'true'
  })

  // Add to active subscriptions list
  await redis.sadd('active_push_subscriptions', subscriptionId)
  
  console.log(`Stored push subscription: ${subscriptionId}`)
  return subscriptionId
}

// Get all active push subscriptions
export async function getActivePushSubscriptions(): Promise<Array<{id: string, subscription: PushSubscription}>> {
  const subscriptionIds = await redis.smembers('active_push_subscriptions')
  console.log('Found subscription IDs:', subscriptionIds)
  const subscriptions = []

  for (const id of subscriptionIds) {
    const data = await redis.hgetall(id)
    console.log(`Subscription ${id} data:`, data)
    
    // Check if subscription data exists and has required fields
    if (data && data.endpoint && data.p256dh && data.auth && data.active === 'true') {
      subscriptions.push({
        id,
        subscription: {
          endpoint: data.endpoint as string,
          keys: {
            p256dh: data.p256dh as string,
            auth: data.auth as string
          }
        }
      })
      console.log(`Added active subscription: ${id}`)
    } else {
      console.log(`Skipping invalid/inactive subscription: ${id}`, data)
      // Clean up invalid subscription from the set
      if (!data || !data.endpoint) {
        await redis.srem('active_push_subscriptions', id)
        console.log(`Removed invalid subscription ${id} from active set`)
      }
    }
  }

  console.log(`Total active subscriptions: ${subscriptions.length}`)
  return subscriptions
}

// Send push notification to all subscribers
export async function sendPushNotification(payload: NotificationPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('VAPID keys not configured')
    return { success: false, error: 'VAPID keys not configured' }
  }

  const subscriptions = await getActivePushSubscriptions()
  const results = []
  let successCount = 0
  let failureCount = 0

  // Log the notification attempt
  const notificationId = `notification:${Date.now()}`
  await redis.hset(notificationId, {
    title: payload.title,
    body: payload.body,
    eventId: payload.eventId || '',
    eventTitle: payload.eventTitle || '',
    eventDate: payload.eventDate || '',
    sentAt: new Date().toISOString(),
    recipientCount: subscriptions.length,
    status: 'sending'
  })

  for (const { id, subscription } of subscriptions) {
    try {
      const webpush = await import('web-push')
      
      webpush.default.setVapidDetails(
        'mailto:your-email@example.com', // Replace with your email
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      )

      await webpush.default.sendNotification(subscription, JSON.stringify(payload))
      
      results.push({ subscriptionId: id, success: true })
      successCount++
      
    } catch (error) {
      console.error(`Failed to send push notification to ${id}:`, error)
      results.push({ subscriptionId: id, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      failureCount++
      
      // If subscription is invalid, remove it
      if (error instanceof Error && (error.message.includes('410') || error.message.includes('invalid'))) {
        await redis.srem('active_push_subscriptions', id)
        await redis.hset(id, { active: false })
      }
    }
  }

  // Update notification log with results
  await redis.hset(notificationId, {
    status: 'completed',
    successCount,
    failureCount,
    completedAt: new Date().toISOString()
  })

  // Add to notification history
  await redis.zadd('notification_history', { score: Date.now(), member: notificationId })

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalSent: subscriptions.length,
    results
  }
}

// Get notification history for admin panel
export async function getNotificationHistory(limit: number = 50) {
  const notificationIds = await redis.zrange('notification_history', 0, limit - 1, { rev: true })
  const notifications = []

  for (const id of notificationIds) {
    const data = await redis.hgetall(id as string)
    if (data) {
      notifications.push({
        id,
        ...data,
        sentAt: data.sentAt as string,
        completedAt: data.completedAt as string || null
      })
    }
  }

  return notifications
}

// Generate VAPID keys (run this once to generate keys for your app)
export async function generateVapidKeys() {
  const webpush = await import('web-push')
  return webpush.default.generateVAPIDKeys()
}
