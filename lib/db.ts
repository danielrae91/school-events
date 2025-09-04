import { Redis } from '@upstash/redis'
import { Event, StoredEvent } from './types'
import { createHash } from 'crypto'

// For local development, use placeholder values if env vars are missing
const redisUrl = process.env.KV_REST_API_URL || 'https://placeholder-redis-url.upstash.io'
const redisToken = process.env.KV_REST_API_TOKEN || 'placeholder-token'

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

// Generate unique event ID based on title and date
export function generateEventId(title: string, startDate: string): string {
  const hash = createHash('md5').update(`${title}:${startDate}`).digest('hex')
  return hash.substring(0, 12)
}

// Store event in Redis (with duplicate prevention)
export async function storeEvent(event: Event): Promise<StoredEvent> {
  const id = generateEventId(event.title, event.start_date)
  
  // Check if event already exists
  const existing = await getEvent(id)
  if (existing) {
    console.log(`Duplicate event prevented: ${event.title} on ${event.start_date}`)
    return existing // Return existing event instead of creating duplicate
  }
  
  const now = new Date().toISOString()
  const storedEvent: StoredEvent = {
    id,
    title: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start_date: event.start_date,
    start_time: event.start_time || undefined,
    end_date: event.end_date || undefined,
    end_time: event.end_time || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    needs_enrichment: event.needs_enrichment || false,
    source: 'email'
  }

  // Filter out null/undefined values for Redis storage
  const cleanedEvent: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(storedEvent)) {
    if (value !== null && value !== undefined) {
      cleanedEvent[key] = value
    }
  }

  await redis.hset(`tk:event:${id}`, cleanedEvent)
  
  // Add to sorted set for chronological retrieval (score = timestamp of start_date)
  const startTimestamp = new Date(event.start_date).getTime()
  await redis.zadd('tk:events:by_date', { score: startTimestamp, member: id })

  // Update last successful email timestamp when new events are created
  await setLastEmailUpdate()

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
    title: updates.title || existing.title,
    description: updates.description !== undefined ? updates.description : existing.description,
    location: updates.location !== undefined ? (updates.location || undefined) : existing.location,
    start_date: updates.start_date || existing.start_date,
    start_time: updates.start_time !== undefined ? (updates.start_time || undefined) : existing.start_time,
    end_date: updates.end_date !== undefined ? (updates.end_date || undefined) : existing.end_date,
    end_time: updates.end_time !== undefined ? (updates.end_time || undefined) : existing.end_time,
    needs_enrichment: updates.needs_enrichment !== undefined ? updates.needs_enrichment : existing.needs_enrichment,
    updated_at: new Date().toISOString()
  }

  // Filter out null/undefined values for Redis storage
  const cleanedEvent: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updated)) {
    if (value !== null && value !== undefined) {
      cleanedEvent[key] = value
    }
  }

  await redis.hset(`tk:event:${id}`, cleanedEvent)
  
  // Update sorted set if start_date changed
  if (updates.start_date && updates.start_date !== existing.start_date) {
    await redis.zrem('tk:events:by_date', id)
    const newTimestamp = new Date(updates.start_date).getTime()
    await redis.zadd('tk:events:by_date', { score: newTimestamp, member: id })
  }

  return updated
}

// Get last successful email processing timestamp
export async function getLastEmailUpdate(): Promise<string | null> {
  try {
    const timestamp = await redis.get('tk:last_successful_email')
    return timestamp as string | null
  } catch (error) {
    console.error('Error getting last email update:', error)
    return null
  }
}

// Set last successful email processing timestamp
export async function setLastEmailUpdate(): Promise<void> {
  try {
    await redis.set('tk:last_successful_email', new Date().toISOString())
  } catch (error) {
    console.error('Error setting last email update:', error)
  }
}

// Delete event
export async function deleteEvent(id: string): Promise<boolean> {
  const exists = await redis.exists(`tk:event:${id}`)
  if (!exists) return false

  await redis.del(`tk:event:${id}`)
  await redis.zrem('tk:events:by_date', id)
  
  return true
}

// Enhanced event similarity check for better deduplication
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1.0
  
  // Calculate Jaccard similarity using word sets
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  
  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)))
  const union = new Set([...Array.from(words1), ...Array.from(words2)])
  
  return intersection.size / union.size
}

// Check if similar event exists (enhanced deduplication)
export async function eventExists(title: string, startDate: string): Promise<boolean> {
  const id = generateEventId(title, startDate)
  const exists = await redis.exists(`tk:event:${id}`)
  if (exists === 1) return true
  
  // Enhanced similarity check - get all events for the same date
  const targetDate = new Date(startDate)
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime()
  const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1
  
  try {
    // Get events for the same day
    const eventIds = await redis.zrange('tk:events:by_date', startOfDay, endOfDay, { byScore: true })
    
    for (const eventId of eventIds) {
      const existingEvent = await getEvent(eventId as string)
      if (existingEvent) {
        const titleSimilarity = calculateSimilarity(title, existingEvent.title)
        
        // Consider it a duplicate if:
        // 1. Title similarity > 80%
        // 2. Same date
        if (titleSimilarity > 0.8) {
          console.log(`Similar event found: "${title}" vs "${existingEvent.title}" (similarity: ${(titleSimilarity * 100).toFixed(1)}%)`)
          return true
        }
      }
    }
  } catch (error) {
    console.error('Error checking for similar events:', error)
    // Fall back to basic check
    return exists === 1
  }
  
  return false
}
