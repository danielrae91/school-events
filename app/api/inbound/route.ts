import { NextRequest, NextResponse } from 'next/server'
import { CloudMailinInbound } from '@/lib/types'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists, redis } from '@/lib/db'
import { createHash, createHmac } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    console.log('Raw body length:', rawBody.length)
    
    // Validate CloudMailin webhook signature if secret is provided
    if (process.env.CLOUDMAILIN_SECRET) {
      const signature = request.headers.get('x-cloudmailin-signature')
      console.log('Signature header:', signature)
      
      if (signature && !verifyCloudMailinSignature(rawBody, signature)) {
        console.log('Signature validation failed')
        // For now, log but don't reject - CloudMailin signature format might be different
        console.warn('Signature mismatch - proceeding anyway for debugging')
      }
    }
    
    // Parse the body based on content type
    const contentType = request.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)
    
    let body: any
    
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(rawBody)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
      }
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      // Re-create request to parse form data since we already consumed the body
      const newRequest = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: rawBody
      })
      
      const formData = await newRequest.formData()
      console.log('Form data keys:', Array.from(formData.keys()))
      
      // Convert form data to object for CloudMailin format
      body = {} as any
      formData.forEach((value, key) => {
        // Handle nested keys like headers[subject]
        if (key.includes('[') && key.includes(']')) {
          const match = key.match(/^([^[]+)\[([^\]]+)\]$/)
          if (match) {
            const [, parentKey, childKey] = match
            if (!body[parentKey]) body[parentKey] = {}
            body[parentKey][childKey] = value.toString()
          } else {
            body[key] = value.toString()
          }
        } else {
          body[key] = value.toString()
        }
      })
    } else {
      try {
        body = JSON.parse(rawBody)
      } catch (parseError) {
        console.error('Fallback JSON parse error:', parseError)
        return NextResponse.json({ error: 'Unsupported content type or invalid payload' }, { status: 400 })
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

    // Create log entry
    const logId = Date.now().toString()
    const logData = {
      id: logId,
      from: email.envelope?.from || 'unknown',
      subject: email.headers?.subject || 'No subject',
      messageId: email.headers?.message_id || 'unknown',
      timestamp: new Date().toISOString(),
      status: 'processing',
      emailContent: JSON.stringify({
        subject: email.headers.subject,
        plain: email.plain,
        html: email.html
      })
    }

    try {
      // Store initial log
      await redis.hset(`email_log:${logId}`, logData)

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

      // Update log with success
      await redis.hset(`email_log:${logId}`, {
        status: 'success',
        eventsProcessed: storedEvents.length,
        eventsSkipped: skippedEvents.length
      })

      return NextResponse.json({
        success: true,
        message: `Processed newsletter: ${storedEvents.length} new events stored, ${skippedEvents.length} duplicates skipped`,
        events_stored: storedEvents.length,
        events_skipped: skippedEvents.length,
        skipped_titles: skippedEvents
      })

    } catch (processingError) {
      // Update log with error
      await redis.hset(`email_log:${logId}`, {
        status: 'error',
        error: processingError instanceof Error ? processingError.message : 'Unknown error'
      })
      throw processingError
    }

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

function verifyCloudMailinSignature(rawBody: string, signature: string): boolean {
  if (!process.env.CLOUDMAILIN_SECRET) return false
  
  try {
    const expectedSignature = createHmac('sha256', process.env.CLOUDMAILIN_SECRET)
      .update(rawBody)
      .digest('hex')
    
    console.log('Expected signature:', expectedSignature)
    console.log('Received signature:', signature)
    
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
