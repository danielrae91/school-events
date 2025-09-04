import { redis } from './db'
import { sendPushNotification } from './pushNotifications'

interface PendingNotification {
  eventId: string
  eventTitle: string
  eventDate: string
  addedAt: number
}

const BATCH_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const BATCH_KEY = 'pending_notifications_batch'

// Add event to pending notifications batch
export async function addEventToBatch(eventId: string, eventTitle: string, eventDate: string) {
  const notification: PendingNotification = {
    eventId,
    eventTitle,
    eventDate,
    addedAt: Date.now()
  }

  // Add to Redis set with score as timestamp
  await redis.zadd(BATCH_KEY, { score: notification.addedAt, member: JSON.stringify(notification) })
  
  console.log(`Added event ${eventId} to notification batch`)

  // Schedule batch processing if not already scheduled
  await scheduleBatchProcessing()
}

// Schedule batch processing
async function scheduleBatchProcessing() {
  const lockKey = 'batch_processing_lock'
  const lockValue = Date.now().toString()
  
  // Try to acquire lock (expires in 15 minutes)
  const acquired = await redis.set(lockKey, lockValue, { px: 15 * 60 * 1000, nx: true })
  
  if (acquired) {
    console.log('Acquired batch processing lock, scheduling processing...')
    
    // Schedule processing after batch window
    setTimeout(async () => {
      try {
        await processBatch()
      } catch (error) {
        console.error('Error processing notification batch:', error)
      } finally {
        // Release lock
        const currentLock = await redis.get(lockKey)
        if (currentLock === lockValue) {
          await redis.del(lockKey)
        }
      }
    }, BATCH_WINDOW_MS)
  } else {
    console.log('Batch processing already scheduled')
  }
}

// Process the current batch of notifications
export async function processBatch() {
  const now = Date.now()
  const cutoffTime = now - BATCH_WINDOW_MS

  // Get all notifications older than the batch window
  const notifications = await redis.zrange(BATCH_KEY, 0, cutoffTime, { byScore: true })
  
  if (!notifications || notifications.length === 0) {
    console.log('No notifications to process in batch')
    return
  }

  console.log(`Processing batch of ${notifications.length} notifications`)

  // Parse notifications
  const parsedNotifications: PendingNotification[] = notifications
    .map((n: any) => {
      try {
        return JSON.parse(n as string)
      } catch (e) {
        console.error('Failed to parse notification:', n)
        return null
      }
    })
    .filter(Boolean) as PendingNotification[]

  if (parsedNotifications.length === 0) {
    // Clean up invalid notifications
    await redis.zremrangebyscore(BATCH_KEY, 0, cutoffTime)
    return
  }

  // Group notifications and create message
  const eventTitles = parsedNotifications.map(n => n.eventTitle)
  const uniqueTitles = Array.from(new Set(eventTitles))
  
  let title: string
  let body: string

  if (uniqueTitles.length === 1) {
    title = 'New Event Added'
    body = `${uniqueTitles[0]} has been added to the calendar`
  } else if (uniqueTitles.length <= 3) {
    title = 'New Events Added'
    body = `${uniqueTitles.join(', ')} have been added to the calendar`
  } else {
    title = 'New Events Added'
    body = `${uniqueTitles.slice(0, 2).join(', ')} and ${uniqueTitles.length - 2} other events have been added to the calendar`
  }

  // Send the batched notification
  try {
    const result = await sendPushNotification({
      title,
      body,
      eventId: parsedNotifications[0].eventId, // Use first event for deep linking
      eventTitle: parsedNotifications[0].eventTitle,
      eventDate: parsedNotifications[0].eventDate
    })

    console.log(`Batched notification sent successfully:`, result)

    // Remove processed notifications from batch
    await redis.zremrangebyscore(BATCH_KEY, 0, cutoffTime)

    // Log the batch processing
    await redis.hset(`batch_log:${now}`, {
      processedAt: new Date().toISOString(),
      eventCount: parsedNotifications.length,
      title,
      body,
      successCount: result.successCount,
      failureCount: result.failureCount
    })

  } catch (error) {
    console.error('Failed to send batched notification:', error)
    
    // Don't remove notifications on failure - they'll be retried in next batch
    // But mark them as failed attempts
    for (const notification of parsedNotifications) {
      await redis.hset(`failed_notification:${notification.eventId}:${now}`, {
        ...notification,
        failedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Force process current batch (for admin testing)
export async function forceProcessBatch() {
  const notifications = await redis.zrange(BATCH_KEY, 0, -1)
  
  if (notifications.length === 0) {
    return { success: false, message: 'No pending notifications to process' }
  }

  await processBatch()
  return { success: true, message: `Processed ${notifications.length} notifications` }
}

// Get current batch status
export async function getBatchStatus() {
  const notifications = await redis.zrange(BATCH_KEY, 0, -1, { withScores: true })
  const now = Date.now()
  
  const pending = (notifications as any[]).map((item: any) => {
    try {
      const notification = JSON.parse(item.value as string)
      const waitTime = BATCH_WINDOW_MS - (now - item.score)
      return {
        ...notification,
        waitTimeMs: Math.max(0, waitTime),
        willProcessAt: new Date(item.score + BATCH_WINDOW_MS).toISOString()
      }
    } catch (e) {
      return null
    }
  }).filter(Boolean)

  return {
    pendingCount: pending.length,
    pending,
    batchWindowMs: BATCH_WINDOW_MS
  }
}
