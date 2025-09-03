import ical from 'ical-generator'
import { StoredEvent } from './types'

export function generateICalFeed(events: StoredEvent[]): string {
  const calendar = ical({
    name: 'School Events Calendar',
    description: 'Automated school newsletter events feed',
    url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tkdates.nz'}/calendar.ics`,
    prodId: '-//TK Newsletter//School Events//EN',
    timezone: 'Pacific/Auckland'
  })

  for (const event of events) {
    try {
      const startDate = parseEventDateTime(event.start_date, event.start_time)
      const endDate = parseEventDateTime(event.end_date || event.start_date, event.end_time || event.start_time)
      
      const calEvent: any = {
        uid: `${event.id}@${process.env.VERCEL_URL || 'tkdates.nz'}`,
        start: startDate,
        end: endDate,
        summary: event.title,
        description: event.description || '',
        ...(event.location && event.location.trim() ? { location: event.location.trim() } : {}),
        created: new Date(event.created_at),
        lastModified: new Date(event.updated_at),
        stamp: new Date() // Force UTC timestamp
      }

      // Mark as all-day if no time specified
      if (!event.start_time) {
        calEvent.allDay = true
      }

      // Add enrichment note if needed
      if (event.needs_enrichment) {
        calEvent.description += '\n\n⚠️ This event may need additional details.'
      }

      calendar.createEvent(calEvent)
    } catch (error) {
      console.error('Error adding event to calendar:', event.id, error)
    }
  }

  // Get the ICS string and ensure UTC timestamps
  let icsString = calendar.toString()
  
  // Force UTC timestamps by adding Z to DTSTAMP, DTSTART, DTEND if they don't have timezone info
  icsString = icsString.replace(/DTSTAMP:(\d{8}T\d{6})(?![Z\+\-])/g, 'DTSTAMP:$1Z')
  icsString = icsString.replace(/DTSTART:(\d{8}T\d{6})(?![Z\+\-])/g, 'DTSTART:$1Z')
  icsString = icsString.replace(/DTEND:(\d{8}T\d{6})(?![Z\+\-])/g, 'DTEND:$1Z')
  
  // Ensure CRLF line endings for better compatibility
  icsString = icsString.replace(/\r?\n/g, '\r\n')
  
  return icsString
}

function parseEventDateTime(date: string, time?: string | null): Date {
  if (!time) {
    // All-day event - use date at midnight in NZ timezone
    return new Date(`${date}T00:00:00+12:00`)
  }

  // Parse time and combine with date in NZ timezone
  return new Date(`${date}T${time}:00+12:00`)
}

export function validateICalFeed(icsContent: string): boolean {
  try {
    // Basic validation - check for required iCal components
    const requiredComponents = [
      'BEGIN:VCALENDAR',
      'END:VCALENDAR',
      'VERSION:2.0',
      'PRODID:'
    ]

    return requiredComponents.every(component => 
      icsContent.includes(component)
    )
  } catch (error) {
    console.error('iCal validation error:', error)
    return false
  }
}
