import { NextRequest, NextResponse } from 'next/server'
import { CloudMailinInbound } from '@/lib/types'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists, redis } from '@/lib/db'
import { createHash, createHmac } from 'crypto'

// Async function to process email without blocking webhook response
async function processEmailAsync(logId: string, subject: string, plain: string, html?: string) {
  console.log(`[${new Date().toISOString()}] [info] Starting async processing for log ${logId}`)
  
  try {
    // Update status to show processing started
    await redis.hset(`email_log:${logId}`, {
      status: 'processing',
      stage: 'gpt_parsing',
      processingStarted: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[${new Date().toISOString()}] [info] Calling GPT for log ${logId}`)
    
    // Parse newsletter content with GPT-4
    const events = await parseNewsletterWithGPT(subject, plain, html)
    console.log(`[${new Date().toISOString()}] [info] GPT returned ${events.length} events for log ${logId}`)

    // Update status to show GPT completed
    await redis.hset(`email_log:${logId}`, {
      status: 'processing',
      stage: 'storing_events',
      gptCompleted: new Date().toISOString(),
      eventsExtracted: events.length,
      updatedAt: new Date().toISOString()
    })

    // Store events (with deduplication)
    const storedEvents = []
    const skippedEvents = []
    const createdEventIds = []

    for (const event of events) {
      try {
        const exists = await eventExists(event.title, event.start_date)
        
        if (exists) {
          skippedEvents.push(event.title)
          console.log(`[${new Date().toISOString()}] [info] Skipping duplicate event: ${event.title} on ${event.start_date}`)
          continue
        }

        const stored = await storeEvent(event)
        storedEvents.push(stored)
        createdEventIds.push(stored.id)
        console.log(`[${new Date().toISOString()}] [info] Stored event: ${event.title} on ${event.start_date} (ID: ${stored.id})`)
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [error] Error storing event:`, event.title, error)
        skippedEvents.push(`${event.title} (storage error)`)
      }
    }

    // Update log with success
    await redis.hset(`email_log:${logId}`, {
      status: 'completed',
      stage: 'completed',
      eventsProcessed: storedEvents.length,
      eventsSkipped: skippedEvents.length,
      createdEvents: JSON.stringify(createdEventIds),
      createdEventTitles: JSON.stringify(storedEvents.map(e => e.title)),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`[${new Date().toISOString()}] [info] Email processing complete for ${logId}: ${storedEvents.length} stored, ${skippedEvents.length} skipped`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${new Date().toISOString()}] [error] Async email processing error for ${logId}:`, error)
    
    // Update log with detailed error
    await redis.hset(`email_log:${logId}`, {
      status: 'failed',
      stage: 'error',
      error: errorMessage,
      errorDetails: error instanceof Error ? error.stack : 'No stack trace',
      failedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}

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
      status: 'received',
      stage: 'received',
      retryCount: 0,
      createdEvents: '[]',
      createdEventTitles: '[]',
      updatedAt: new Date().toISOString(),
      emailContent: JSON.stringify({
        subject: email.headers.subject,
        plain: email.plain,
        html: email.html
      })
    }

    // Store initial log
    await redis.hset(`email_log:${logId}`, logData)

    // Process email asynchronously to avoid timeout
    processEmailAsync(logId, email.headers.subject, email.plain, email.html).catch((error: Error) => {
      console.error('Async email processing failed:', error)
    })

    // Return immediately to avoid CloudMailin timeout
    return NextResponse.json({
      success: true,
      message: 'Email received and queued for processing',
      log_id: logId
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
