import { NextRequest, NextResponse } from 'next/server'
import { CloudMailinInbound } from '@/lib/types'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists } from '@/lib/db'
import { createHash, createHmac } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate CloudMailin webhook signature if secret is provided
    if (process.env.CLOUDMAILIN_SECRET) {
      const signature = request.headers.get('x-cloudmailin-signature')
      if (!signature || !verifyCloudMailinSignature(body, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Parse the CloudMailin inbound email payload
    const email: CloudMailinInbound = body as CloudMailinInbound
    
    // Validate required fields
    if (!email.headers?.subject || (!email.plain && !email.html)) {
      return NextResponse.json({ error: 'Missing required email fields' }, { status: 400 })
    }

    console.log('Processing inbound email:', {
      from: email.envelope.from,
      subject: email.headers.subject,
      messageId: email.headers.message_id
    })

    // Parse newsletter content with GPT-4
    const events = await parseNewsletterWithGPT(
      email.headers.subject,
      email.plain,
      email.html
    )

    console.log(`Extracted ${events.length} events from newsletter`)

    // Store events (with deduplication)
    const storedEvents = []
    const skippedEvents = []

    for (const event of events) {
      try {
        // Check if event already exists
        const exists = await eventExists(event.title, event.start_date)
        
        if (exists) {
          skippedEvents.push(event.title)
          console.log(`Skipping duplicate event: ${event.title} on ${event.start_date}`)
          continue
        }

        // Store new event
        const stored = await storeEvent(event)
        storedEvents.push(stored)
        console.log(`Stored event: ${event.title} on ${event.start_date}`)
        
      } catch (error) {
        console.error('Error storing event:', event.title, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed newsletter: ${storedEvents.length} new events stored, ${skippedEvents.length} duplicates skipped`,
      events_stored: storedEvents.length,
      events_skipped: skippedEvents.length,
      skipped_titles: skippedEvents
    })

  } catch (error) {
    console.error('Error processing inbound email:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process newsletter',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

function verifyCloudMailinSignature(body: any, signature: string): boolean {
  if (!process.env.CLOUDMAILIN_SECRET) return false
  
  try {
    const bodyString = JSON.stringify(body)
    const expectedSignature = createHmac('sha256', process.env.CLOUDMAILIN_SECRET)
      .update(bodyString)
      .digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying CloudMailin signature:', error)
    return false
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'TK Newsletter CloudMailin Webhook',
    timestamp: new Date().toISOString()
  })
}
