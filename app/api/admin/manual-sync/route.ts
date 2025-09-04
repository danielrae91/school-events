import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'
import { syncEventsToGoogleCalendar } from '@/lib/googleCalendarSync'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Google Calendar is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      return NextResponse.json({ 
        error: 'Google Calendar not configured. Please set up Google OAuth credentials.' 
      }, { status: 400 })
    }

    // Get all events from Redis using the correct storage format
    const eventIds = await redis.zrange('tk:events:by_date', 0, -1)
    
    if (eventIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No events found to sync.',
        syncedCount: 0
      })
    }

    // Fetch all events
    const events = []
    for (const eventId of eventIds) {
      try {
        const eventData = await redis.hgetall(`tk:event:${eventId}`)
        if (eventData && Object.keys(eventData).length > 0) {
          events.push(eventData)
        }
      } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error)
      }
    }

    if (events.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No valid events found to sync.',
        syncedCount: 0
      })
    }

    // Sync events to Google Calendar with deduplication
    try {
      const result = await syncEventsToGoogleCalendar(events)
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully synced ${events.length} events to Google Calendar. ${result?.message || ''}`,
        syncedCount: events.length,
        totalEvents: events.length
      })
    } catch (syncError) {
      console.error('Google Calendar sync error:', syncError)
      
      // Return more specific error message
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error'
      
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('refresh token')) {
        return NextResponse.json({ 
          error: 'Google Calendar authentication expired. Please refresh your OAuth tokens.' 
        }, { status: 401 })
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'Google Calendar API quota exceeded. Please try again later.' 
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: `Failed to sync to Google Calendar: ${errorMessage}` 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in manual calendar sync:', error)
    return NextResponse.json({ 
      error: 'Failed to perform manual calendar sync' 
    }, { status: 500 })
  }
}
