import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/db'
import ical from 'ical-generator'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEvent(params.id)
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Create single event iCal
    const calendar = ical({
      name: 'School Event',
      description: 'Individual school event',
      timezone: 'Pacific/Auckland'
    })

    const calEvent: any = {
      uid: `tk-event-${event.id}@tknewsletter.com`,
      start: parseEventDateTime(event.start_date, event.start_time),
      end: parseEventDateTime(event.end_date || event.start_date, event.end_time || event.start_time),
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      created: new Date(event.created_at),
      lastModified: new Date(event.updated_at)
    }

    // Mark as all-day if no time specified
    if (!event.start_time) {
      calEvent.allDay = true
    }

    calendar.createEvent(calEvent)

    const icsContent = calendar.toString()
    const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error generating event iCal:', error)
    return NextResponse.json(
      { error: 'Failed to generate event calendar file' }, 
      { status: 500 }
    )
  }
}

function parseEventDateTime(date: string, time?: string | null): Date {
  if (!time) {
    return new Date(`${date}T00:00:00`)
  }

  const [hours, minutes] = time.split(':').map(Number)
  const dateTime = new Date(`${date}T00:00:00`)
  dateTime.setHours(hours, minutes, 0, 0)
  
  return dateTime
}
