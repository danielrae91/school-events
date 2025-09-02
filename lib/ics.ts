import ical, { ICalCalendar, ICalEvent } from 'ical-generator'
import { StoredEvent } from './types'

export function generateICalFeed(events: StoredEvent[]): string {
  const calendar = ical({
    name: 'School Events Calendar',
    description: 'Automated school newsletter events feed',
    timezone: 'Pacific/Auckland',
    url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/calendar.ics` : 'http://localhost:3000/calendar.ics',
    prodId: '-//TK Newsletter//School Events//EN'
  })

  for (const event of events) {
    try {
      const calEvent: any = {
        uid: event.id,
        start: parseEventDateTime(event.start_date, event.start_time),
        end: parseEventDateTime(event.end_date || event.start_date, event.end_time || event.start_time),
        summary: event.title,
        description: event.description || '',
        ...(event.location && event.location.trim() ? { location: event.location.trim() } : {}),
        created: new Date(event.created_at),
        lastModified: new Date(event.updated_at)
      }

      // Mark as all-day if no time specified
      if (!event.start_time) {
        calEvent.allDay = true
      }

      // Add enrichment note if needed
      if (event.needs_enrichment) {
        calEvent.description += '\n\n⚠️ This event may need additional details.'
      }

      // Add last modified timestamp and sequence to force calendar refresh
      calEvent.lastModified = new Date(event.updated_at)
      calEvent.sequence = Math.floor(new Date(event.updated_at).getTime() / 1000)
      
      // Add revision number to UID to force update recognition
      calEvent.uid = `${event.id}-rev${calEvent.sequence}@school-events`

      calendar.createEvent(calEvent)
    } catch (error) {
      console.error('Error adding event to calendar:', event.id, error)
    }
  }

  return calendar.toString()
}

function parseEventDateTime(date: string, time?: string | null): Date {
  if (!time) {
    // All-day event - use date at midnight
    return new Date(`${date}T00:00:00`)
  }

  // Parse time and combine with date
  const [hours, minutes] = time.split(':').map(Number)
  const dateTime = new Date(`${date}T00:00:00`)
  dateTime.setHours(hours, minutes, 0, 0)
  
  return dateTime
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
