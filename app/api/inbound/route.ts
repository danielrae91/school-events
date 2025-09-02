import { NextRequest, NextResponse } from 'next/server'
import { CloudMailinInbound } from '@/lib/types'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists } from '@/lib/db'
import { createHash, createHmac } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // CloudMailin sends different content types, handle both JSON and form data
    const contentType = request.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)
    
    let body: any
    
    if (contentType.includes('application/json')) {
      // Handle JSON payload
      const rawBody = await request.text()
      console.log('Raw JSON payload:', rawBody.substring(0, 500))
      
      try {
        body = JSON.parse(rawBody)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Raw body that failed to parse:', rawBody.substring(0, 1000))
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      // Handle form data payload
      const formData = await request.formData()
      console.log('Form data keys:', Array.from(formData.keys()))
      
      // CloudMailin sends form data with a 'message' field containing JSON
      const messageField = formData.get('message')
      if (messageField) {
        try {
          body = JSON.parse(messageField.toString())
        } catch (parseError) {
          console.error('Form data JSON parse error:', parseError)
          return NextResponse.json({ error: 'Invalid form data JSON' }, { status: 400 })
        }
      } else {
        // Convert form data to object
        body = {} as any
        formData.forEach((value, key) => {
          (body as any)[key] = value.toString()
        })
      }
    } else {
      // Fallback: try to parse as JSON
      const rawBody = await request.text()
      console.log('Unknown content type, trying JSON parse:', rawBody.substring(0, 500))
      
      try {
        body = JSON.parse(rawBody)
      } catch (parseError) {
        console.error('Fallback JSON parse error:', parseError)
        return NextResponse.json({ error: 'Unsupported content type or invalid payload' }, { status: 400 })
      }
    }
    
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
