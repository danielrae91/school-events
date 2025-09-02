import { Redis } from '@upstash/redis'
import { Event, StoredEvent } from './types'
import { createHash } from 'crypto'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing required Redis environment variables')
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Generate unique event ID based on title and date
export function generateEventId(title: string, startDate: string): string {
  const hash = createHash('md5').update(`${title}:${startDate}`).digest('hex')
  return hash.substring(0, 12)
}

// Store event in Redis
export async function storeEvent(event: Event): Promise<StoredEvent> {
  const id = generateEventId(event.title, event.start_date)
  const now = new Date().toISOString()
  
  const storedEvent: StoredEvent = {
    ...event,
    id,
    created_at: now,
    updated_at: now
  }

  // Store event as hash
  await redis.hset(`tk:event:${id}`, storedEvent as unknown as Record<string, unknown>)
  
  // Add to sorted set for chronological retrieval (score = timestamp of start_date)
  const startTimestamp = new Date(event.start_date).getTime()
  await redis.zadd('tk:events:by_date', { score: startTimestamp, member: id })

  return storedEvent
}

// Get event by ID
export async function getEvent(id: string): Promise<StoredEvent | null> {
  const event = await redis.hgetall(`tk:event:${id}`)
  if (!event || Object.keys(event).length === 0) return null
  
  return event as unknown as StoredEvent
}

// Get all events sorted by date
export async function getAllEvents(): Promise<StoredEvent[]> {
  const eventIds = await redis.zrange('tk:events:by_date', 0, -1)
  if (!eventIds.length) return []

  const events: StoredEvent[] = []
  for (const id of eventIds) {
    const event = await getEvent(id as string)
    if (event) events.push(event)
  }

  return events
}

// Update existing event
export async function updateEvent(id: string, updates: Partial<Event>): Promise<StoredEvent | null> {
  const existing = await getEvent(id)
  if (!existing) return null

  const updated: StoredEvent = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  }

  await redis.hset(`tk:event:${id}`, updated as unknown as Record<string, unknown>)
  
  // Update sorted set if start_date changed
  if (updates.start_date && updates.start_date !== existing.start_date) {
    await redis.zrem('tk:events:by_date', id)
    const newTimestamp = new Date(updates.start_date).getTime()
    await redis.zadd('tk:events:by_date', { score: newTimestamp, member: id })
  }

  return updated
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  const exists = await redis.exists(`tk:event:${id}`)
  if (!exists) return false

  await redis.del(`tk:event:${id}`)
  await redis.zrem('tk:events:by_date', id)
  
  return true
}

// Check if event exists (for deduplication)
export async function eventExists(title: string, startDate: string): Promise<boolean> {
  const id = generateEventId(title, startDate)
  const exists = await redis.exists(`tk:event:${id}`)
  return exists === 1
}
