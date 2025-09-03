import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents } from '@/lib/db'
import { generateICalFeed, validateICalFeed } from '@/lib/ics'

export const dynamic = 'force-dynamic'

const headers = {
  "content-type": "text/calendar; charset=utf-8",
  "cache-control": "no-cache, no-store, must-revalidate",
  "pragma": "no-cache",
  "expires": "0"
}

export async function GET(request: NextRequest) {
  try {
    const providedKey = request.nextUrl.searchParams.get('key')
    
    // Check feed secret if configured
    if (process.env.FEED_SECRET && providedKey !== process.env.FEED_SECRET) {
      return new NextResponse("forbidden", { status: 403 })
    }

    // Get all events from Redis
    const events = await getAllEvents()
    
    // Generate iCal feed
    const icsContent = generateICalFeed(events)
    
    // Validate the generated feed
    if (!validateICalFeed(icsContent)) {
      throw new Error('Generated iCal feed is invalid')
    }

    console.log(`Generated iCal feed with ${events.length} events`)

    // Return iCal feed with appropriate headers
    return new NextResponse(icsContent, { status: 200, headers })

  } catch (error) {
    console.error('Error generating calendar feed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate calendar feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function HEAD(request: NextRequest) {
  const providedKey = request.nextUrl.searchParams.get('key')
  
  // Check feed secret if configured
  if (process.env.FEED_SECRET && providedKey !== process.env.FEED_SECRET) {
    return new NextResponse(null, { status: 403 })
  }
  
  return new NextResponse(null, { status: 200, headers })
}
