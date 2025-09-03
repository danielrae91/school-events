import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    
    // Get the event from Redis
    const eventData = await redis.hgetall(`event:${eventId}`)
    
    if (!eventData || Object.keys(eventData).length === 0) {
      return new NextResponse('Event not found', { status: 404 })
    }

    // Parse event dates with NZ timezone
    const parseEventDateTime = (dateStr: string, timeStr?: string) => {
      if (!dateStr) return new Date()
      
      // Create date in NZ timezone
      const date = new Date(dateStr + 'T' + (timeStr || '00:00:00') + '+12:00')
      return date
    }

    const startDate = parseEventDateTime(eventData.start_date as string, eventData.start_time as string)
    const endDate = eventData.end_date 
      ? parseEventDateTime(eventData.end_date as string, (eventData.end_time || eventData.start_time) as string)
      : parseEventDateTime(eventData.start_date as string, (eventData.end_time || eventData.start_time) as string)

    // Format dates for ICS (UTC format)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z'
    }

    // Generate ICS content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Te Kura o Take Karara//School Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:Pacific/Auckland
BEGIN:DAYLIGHT
TZOFFSETFROM:+1200
TZOFFSETTO:+1300
TZNAME:NZDT
DTSTART:19700927T020000
RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+1300
TZOFFSETTO:+1200
TZNAME:NZST
DTSTART:19700405T030000
RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:${eventId}@school-events.vercel.app
DTSTART;TZID=Pacific/Auckland:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, -1)}
DTEND;TZID=Pacific/Auckland:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, -1)}
SUMMARY:${eventData.title || 'School Event'}
DESCRIPTION:${eventData.description || ''}
LOCATION:${eventData.location || ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${eventData.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'event'}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error generating event ICS:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
