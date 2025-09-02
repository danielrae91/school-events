import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents, storeEvent } from '@/lib/db'
import { EventSchema } from '@/lib/types'

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
