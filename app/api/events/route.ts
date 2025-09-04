import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents, storeEvent } from '@/lib/db'
import { EventSchema } from '@/lib/types'
import { addEventToBatch } from '@/lib/batchedNotifications'

// Get all events
export async function GET() {
  try {
    const events = await getAllEvents()
    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' }, 
      { status: 500 }
    )
  }
}

// Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate event data
    const event = EventSchema.parse(body)
    
    // Store event
    const storedEvent = await storeEvent(event)
    
    // Add to notification batch for push notifications
    try {
      await addEventToBatch(
        storedEvent.id, 
        storedEvent.title, 
        storedEvent.start_date
      )
      console.log(`Added event ${storedEvent.id} to notification batch`)
    } catch (notificationError) {
      console.error('Failed to add event to notification batch:', notificationError)
      // Don't fail the event creation if notification fails
    }
    
    return NextResponse.json({ 
      success: true, 
      event: storedEvent 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 400 }
    )
  }
}
