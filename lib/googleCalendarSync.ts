import { google } from 'googleapis'
import ical from 'ical'

interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  end: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  iCalUID?: string
}

export async function syncFromIcsToGoogle(): Promise<{ success: boolean; message: string; synced: number; errors: string[] }> {
  const errors: string[] = []
  let syncedCount = 0

  try {
    // Initialize Google Calendar API
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID environment variable not set')
    }

    // Fetch ICS feed
    const icsUrl = 'https://tkevents.nz/calendar.ics'
    const response = await fetch(icsUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS feed: ${response.status} ${response.statusText}`)
    }

    const icsData = await response.text()
    const parsedCalendar = ical.parseICS(icsData)

    // Delete ALL existing events from Google Calendar first for clean sync
    console.log('Attempting to access Google Calendar with ID:', calendarId)
    
    let existingEventsResponse
    try {
      existingEventsResponse = await calendar.events.list({
        calendarId,
        maxResults: 2500, // Adjust as needed
        singleEvents: true,
        orderBy: 'startTime'
      })
    } catch (calendarError: any) {
      console.error('Google Calendar access error:', calendarError)
      if (calendarError.code === 404) {
        throw new Error(`Google Calendar not found. Please check that the calendar ID '${calendarId}' is correct and that the service account has access to it.`)
      }
      throw new Error(`Google Calendar API error: ${calendarError.message}`)
    }

    const existingEvents = existingEventsResponse.data.items || []
    
    // Delete all existing events for clean sync
    let deletedCount = 0
    console.log(`Deleting ${existingEvents.length} existing events for clean sync...`)
    for (const event of existingEvents) {
      try {
        await calendar.events.delete({
          calendarId,
          eventId: event.id!
        })
        deletedCount++
        console.log(`Deleted event: ${event.summary}`)
      } catch (deleteError) {
        console.error(`Failed to delete event ${event.summary}:`, deleteError)
        errors.push(`Failed to delete event ${event.summary}`)
      }
    }
    console.log(`Deleted ${deletedCount} existing events`)

    // Process each event from ICS
    for (const [key, event] of Object.entries(parsedCalendar)) {
      if (event.type !== 'VEVENT') continue

      try {
        const icalUID = event.uid
        if (!icalUID) {
          errors.push(`Event missing UID: ${event.summary}`)
          continue
        }

        // No need to track UIDs since we're doing clean sync

        // Convert ICS event to Google Calendar format
        const googleEvent: any = {
          summary: event.summary || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
          iCalUID: icalUID
        }

        // Handle dates - check if it's an all-day event
        const startDate = event.start
        const endDate = event.end

        if (!startDate) {
          errors.push(`Event missing start date: ${event.summary}`)
          continue
        }

        // Check if it's an all-day event (no time component)
        const isAllDay = typeof startDate === 'string' && !(startDate as string).includes('T')
        
        if (isAllDay) {
          // All-day event
          const startDateStr = formatDateForGoogle(startDate)
          let endDateStr = endDate ? formatDateForGoogle(endDate) : startDateStr
          
          // For all-day events, end date should be the day after
          if (endDateStr === startDateStr) {
            const nextDay = new Date(startDateStr)
            nextDay.setDate(nextDay.getDate() + 1)
            endDateStr = nextDay.toISOString().split('T')[0]
          }

          googleEvent.start = { date: startDateStr }
          googleEvent.end = { date: endDateStr }
        } else {
          // Timed event
          const startDateTime = new Date(startDate).toISOString()
          const endDateTime = endDate ? new Date(endDate).toISOString() : startDateTime
          
          googleEvent.start = {
            dateTime: startDateTime,
            timeZone: 'Pacific/Auckland'
          }
          googleEvent.end = {
            dateTime: endDateTime,
            timeZone: 'Pacific/Auckland'
          }
        }

        // Create new event (since we deleted all existing ones)
        // Handle potential 409 conflicts by retrying without iCalUID if needed
        try {
          await calendar.events.insert({
            calendarId,
            requestBody: googleEvent
          })
          syncedCount++
        } catch (insertError: any) {
          if (insertError.code === 409 && insertError.message?.includes('iCalUID')) {
            // Retry without iCalUID to avoid conflicts
            console.log(`Retrying event ${event.summary} without iCalUID due to conflict`)
            const eventWithoutUID = { ...googleEvent }
            delete eventWithoutUID.iCalUID
            
            await calendar.events.insert({
              calendarId,
              requestBody: eventWithoutUID
            })
            syncedCount++
          } else {
            throw insertError
          }
        }
      } catch (eventError) {
        const errorMsg = `Failed to sync event ${event.summary}: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg, eventError)
      }
    }

    return {
      success: true,
      message: `Successfully synced ${syncedCount} events`,
      synced: syncedCount,
      errors
    }

  } catch (error) {
    const errorMsg = `Google Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMsg, error)
    
    return {
      success: false,
      message: errorMsg,
      synced: syncedCount,
      errors: [...errors, errorMsg]
    }
  }
}

export async function syncEventsToGoogleCalendar(events: any[]): Promise<{ success: boolean; message: string; synced: number; errors: string[] }> {
  const errors: string[] = []
  let syncedCount = 0

  try {
    // Initialize Google Calendar API
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID environment variable not set')
    }

    // Get existing events from Google Calendar to check for duplicates
    const existingEventsResponse = await calendar.events.list({
      calendarId,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime'
    })

    const existingEvents = existingEventsResponse.data.items || []
    const existingEventsByUID = new Map<string, any>()
    
    existingEvents.forEach(event => {
      if (event.iCalUID) {
        existingEventsByUID.set(event.iCalUID, event)
      }
    })

    // Process each event
    for (const event of events) {
      try {
        const icalUID = `${event.id}@tkevents.nz`

        // Convert event to Google Calendar format
        const googleEvent: any = {
          summary: event.title || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
          iCalUID: icalUID
        }

        // Handle dates - parse as NZ time with proper timezone offset
        if (event.start_time) {
          // Timed event - create dates with NZ timezone offset
          const startDateTime = `${event.start_date}T${event.start_time}:00+12:00`
          const endDateTime = `${event.end_date || event.start_date}T${event.end_time || event.start_time}:00+12:00`
          
          googleEvent.start = {
            dateTime: startDateTime,
            timeZone: 'Pacific/Auckland'
          }
          googleEvent.end = {
            dateTime: endDateTime,
            timeZone: 'Pacific/Auckland'
          }
        } else {
          // All-day event
          googleEvent.start = { date: event.start_date }
          googleEvent.end = { date: event.end_date || event.start_date }
        }

        // Create new event (since we deleted all existing ones)
        // Handle potential 409 conflicts by retrying without iCalUID if needed
        try {
          await calendar.events.insert({
            calendarId,
            requestBody: googleEvent
          })
          syncedCount++
        } catch (insertError: any) {
          if (insertError.code === 409 && insertError.message?.includes('iCalUID')) {
            // Retry without iCalUID to avoid conflicts
            console.log(`Retrying event ${event.title} without iCalUID due to conflict`)
            const eventWithoutUID = { ...googleEvent }
            delete eventWithoutUID.iCalUID
            
            await calendar.events.insert({
              calendarId,
              requestBody: eventWithoutUID
            })
            syncedCount++
          } else {
            throw insertError
          }
        }
      } catch (eventError) {
        const errorMsg = `Failed to sync event ${event.title}: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg, eventError)
      }
    }

    return {
      success: true,
      message: `Successfully synced ${syncedCount} events`,
      synced: syncedCount,
      errors
    }

  } catch (error) {
    const errorMsg = `Google Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMsg, error)
    
    return {
      success: false,
      message: errorMsg,
      synced: syncedCount,
      errors: [...errors, errorMsg]
    }
  }
}

// Sync single event to Google Calendar (for real-time updates)
export async function syncSingleEventToGoogle(event: any, action: 'create' | 'update' | 'delete'): Promise<{ success: boolean; message: string }> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error('GOOGLE_CALENDAR_ID environment variable not set')
    }

    const icalUID = `${event.id}@tkevents.nz`

    if (action === 'delete') {
      // Find and delete the event
      const existingEventsResponse = await calendar.events.list({
        calendarId,
        iCalUID: icalUID,
        maxResults: 1
      })

      const existingEvents = existingEventsResponse.data.items || []
      if (existingEvents.length > 0) {
        await calendar.events.delete({
          calendarId,
          eventId: existingEvents[0].id!
        })
        return { success: true, message: 'Event deleted from Google Calendar' }
      }
      return { success: true, message: 'Event not found in Google Calendar' }
    }

    // Convert event to Google Calendar format
    const googleEvent: any = {
      summary: event.title || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      iCalUID: icalUID
    }

    // Handle dates
    const startDate = new Date(event.start_date + (event.start_time ? `T${event.start_time}` : 'T00:00'))
    const endDate = new Date((event.end_date || event.start_date) + (event.end_time ? `T${event.end_time}` : event.start_time ? `T${event.start_time}` : 'T23:59'))

    if (event.start_time) {
      // Timed event
      googleEvent.start = {
        dateTime: startDate.toISOString(),
        timeZone: 'Pacific/Auckland'
      }
      googleEvent.end = {
        dateTime: endDate.toISOString(),
        timeZone: 'Pacific/Auckland'
      }
    } else {
      // All-day event
      googleEvent.start = { date: formatDateForGoogle(event.start_date) }
      googleEvent.end = { date: formatDateForGoogle(event.end_date || event.start_date) }
    }

    if (action === 'update') {
      // Find existing event and update it
      const existingEventsResponse = await calendar.events.list({
        calendarId,
        iCalUID: icalUID,
        maxResults: 1
      })

      const existingEvents = existingEventsResponse.data.items || []
      if (existingEvents.length > 0) {
        await calendar.events.update({
          calendarId,
          eventId: existingEvents[0].id!,
          requestBody: googleEvent
        })
        return { success: true, message: 'Event updated in Google Calendar' }
      }
    }

    // Create new event (for both 'create' action and 'update' when event doesn't exist)
    // Handle potential 409 conflicts by retrying without iCalUID if needed
    try {
      await calendar.events.insert({
        calendarId,
        requestBody: googleEvent
      })
    } catch (insertError: any) {
      if (insertError.code === 409 && insertError.message?.includes('iCalUID')) {
        // Retry without iCalUID to avoid conflicts
        console.log(`Retrying event ${event.title} without iCalUID due to conflict`)
        const eventWithoutUID = { ...googleEvent }
        delete eventWithoutUID.iCalUID
        
        await calendar.events.insert({
          calendarId,
          requestBody: eventWithoutUID
        })
      } else {
        throw insertError
      }
    }

    return { success: true, message: 'Event created in Google Calendar' }

  } catch (error) {
    const errorMsg = `Google Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMsg, error)
    return { success: false, message: errorMsg }
  }
}

function formatDateForGoogle(dateInput: any): string {
  if (typeof dateInput === 'string') {
    // Handle YYYY-MM-DD format
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateInput
    }
    // Handle other string formats
    return new Date(dateInput).toISOString().split('T')[0]
  }
  
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0]
  }
  
  // Fallback
  return new Date(dateInput).toISOString().split('T')[0]
}
