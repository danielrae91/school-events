import { NextRequest, NextResponse } from 'next/server'
import { redis, getAllEvents, deleteEvent } from '@/lib/db'

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

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('Starting event deduplication process...')
    
    // Get all events
    const allEvents = await getAllEvents()
    console.log(`Found ${allEvents.length} total events`)
    
    const duplicatesFound = []
    const eventsToDelete = new Set<string>()
    
    // Group events by date for efficiency
    const eventsByDate = new Map<string, typeof allEvents>()
    
    for (const event of allEvents) {
      const dateKey = event.start_date.split('T')[0] // Get just the date part
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, [])
      }
      eventsByDate.get(dateKey)!.push(event)
    }
    
    console.log(`Events grouped into ${eventsByDate.size} unique dates`)
    
    // Check for duplicates within each date group
    for (const [date, events] of Array.from(eventsByDate.entries())) {
      if (events.length < 2) continue // Skip if only one event on this date
      
      console.log(`Checking ${events.length} events on ${date}`)
      
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i]
          const event2 = events[j]
          
          // Skip if either event is already marked for deletion
          if (eventsToDelete.has(event1.id) || eventsToDelete.has(event2.id)) {
            continue
          }
          
          const titleSimilarity = calculateSimilarity(event1.title, event2.title)
          
          // Consider duplicates if title similarity > 80%
          if (titleSimilarity > 0.8) {
            console.log(`Duplicate found: "${event1.title}" vs "${event2.title}" (${(titleSimilarity * 100).toFixed(1)}% similar)`)
            
            duplicatesFound.push({
              kept: {
                id: event1.id,
                title: event1.title,
                date: event1.start_date,
                created_at: event1.created_at
              },
              removed: {
                id: event2.id,
                title: event2.title,
                date: event2.start_date,
                created_at: event2.created_at
              },
              similarity: titleSimilarity
            })
            
            // Keep the older event (created first), delete the newer one
            const event1Created = new Date(event1.created_at).getTime()
            const event2Created = new Date(event2.created_at).getTime()
            
            if (event1Created <= event2Created) {
              eventsToDelete.add(event2.id)
            } else {
              eventsToDelete.add(event1.id)
              // Update the duplicate record to reflect which was actually kept
              const lastDuplicate = duplicatesFound[duplicatesFound.length - 1]
              lastDuplicate.kept = {
                id: event2.id,
                title: event2.title,
                date: event2.start_date,
                created_at: event2.created_at
              }
              lastDuplicate.removed = {
                id: event1.id,
                title: event1.title,
                date: event1.start_date,
                created_at: event1.created_at
              }
            }
          }
        }
      }
    }
    
    console.log(`Found ${duplicatesFound.length} duplicate pairs, deleting ${eventsToDelete.size} events`)
    
    // Delete the duplicate events
    let deletedCount = 0
    for (const eventId of Array.from(eventsToDelete)) {
      try {
        const success = await deleteEvent(eventId)
        if (success) {
          deletedCount++
          console.log(`Deleted duplicate event: ${eventId}`)
        }
      } catch (error) {
        console.error(`Failed to delete event ${eventId}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Deduplication complete: ${deletedCount} duplicate events removed`,
      duplicatesFound: duplicatesFound.length,
      eventsDeleted: deletedCount,
      duplicates: duplicatesFound
    })
    
  } catch (error) {
    console.error('Error during event deduplication:', error)
    return NextResponse.json(
      { error: 'Failed to deduplicate events' },
      { status: 500 }
    )
  }
}
