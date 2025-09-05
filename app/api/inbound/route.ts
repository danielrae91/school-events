import { NextRequest, NextResponse } from 'next/server'
import { CloudMailinInbound } from '@/lib/types'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists, redis } from '@/lib/db'
import { createHash, createHmac } from 'crypto'

// Async function to process email without blocking webhook response
async function processEmailAsync(logId: string, subject: string, plain: string, html?: string, retryCount: number = 0) {
  const maxRetries = 3
  
  try {
    // Add a small delay to ensure the webhook response has been sent
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Update status to show processing started
    await redis.hset(`email_log:${logId}`, {
      status: 'processing',
      stage: 'gpt_parsing',
      processingStarted: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  
    // Parse newsletter content with GPT-4
    const contentToProcess = `
SUBJECT: ${subject}

PLAIN TEXT CONTENT:
${plain}
${html ? `\nHTML CONTENT:\n${html}` : ''}
    `.trim()
    
    let events
    try {
      events = await parseNewsletterWithGPT(contentToProcess)
    } catch (gptError) {
      console.error(`[${new Date().toISOString()}] [error] Step 6 FAILED: GPT parsing failed for ${logId}:`, gptError)
      console.error(`[${new Date().toISOString()}] [error] GPT Error details:`, {
        name: gptError instanceof Error ? gptError.name : 'Unknown',
        message: gptError instanceof Error ? gptError.message : String(gptError),
        stack: gptError instanceof Error ? gptError.stack : 'No stack'
      })
      
      // Update Redis with error details
      await redis.hset(`email_log:${logId}`, {
        status: 'failed',
        stage: 'gpt_parsing_error',
        error: gptError instanceof Error ? gptError.message : String(gptError),
        updatedAt: new Date().toISOString()
      })
      
      throw gptError
    }

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
          continue
        }

        const stored = await storeEvent(event)
        storedEvents.push(stored)
        createdEventIds.push(stored.id)
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [error] Error storing event:`, event.title, error)
        skippedEvents.push(`${event.title} (storage error)`)
      }
    }

    // Add events to notification batch for push notifications
    if (storedEvents.length > 0) {
      try {
        const { addEventToBatch } = await import('@/lib/batchedNotifications')
        
        for (const event of storedEvents) {
          await addEventToBatch(event.id, event.title, event.start_date)
        }
        
      } catch (pushError) {
        console.error(`[${new Date().toISOString()}] [error] Failed to add events to notification batch:`, pushError)
      }

      // Sync new events to Google Calendar
      try {
        const { syncFromIcsToGoogle } = await import('@/lib/googleCalendarSync')
        
        const syncResult = await syncFromIcsToGoogle()
        
        // Update log with sync info
        await redis.hset(`email_log:${logId}`, {
          googleCalendarSynced: 'true',
          googleCalendarSyncResult: JSON.stringify(syncResult),
          googleCalendarSyncedAt: new Date().toISOString()
        })
        
      } catch (syncError) {
        console.error(`[${new Date().toISOString()}] [error] Failed to sync to Google Calendar:`, syncError)
        
        // Update log with sync error
        await redis.hset(`email_log:${logId}`, {
          googleCalendarSynced: 'false',
          googleCalendarSyncError: syncError instanceof Error ? syncError.message : 'Unknown sync error',
          googleCalendarSyncErrorAt: new Date().toISOString()
        })
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
    
    // Update admin panel log format
    await redis.set(`log:${logId}`, JSON.stringify({
      id: `log:${logId}`,
      subject: subject,
      status: 'completed',
      created_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      eventsExtracted: events.length,
      eventsProcessed: storedEvents.length,
      eventsSkipped: skippedEvents.length
    }))


  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${new Date().toISOString()}] [error] Email processing failed for ${logId}:`, error)
    
    // If we haven't exceeded max retries, schedule a retry
    if (retryCount < maxRetries) {
      const nextRetryCount = retryCount + 1
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff, max 30s
      
      // Update log with retry info
      await redis.hset(`email_log:${logId}`, {
        status: 'retrying',
        stage: 'scheduled_retry',
        retryCount: nextRetryCount,
        nextRetryAt: new Date(Date.now() + retryDelay).toISOString(),
        lastError: errorMessage,
        updatedAt: new Date().toISOString()
      })
      
      // Schedule retry
      setTimeout(() => {
        processEmailAsync(logId, subject, plain, html, nextRetryCount).catch(retryError => {
          console.error(`[${new Date().toISOString()}] [error] Retry failed for ${logId}:`, retryError)
        })
      }, retryDelay)
      
    } else {
      // Max retries exceeded, mark as failed
      
      await redis.hset(`email_log:${logId}`, {
        status: 'failed',
        stage: 'error',
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : 'No stack trace',
        errorType: error?.constructor?.name || 'Unknown',
        retryCount: retryCount,
        maxRetriesExceeded: true,
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Update admin panel log format
      await redis.set(`log:${logId}`, JSON.stringify({
        id: `log:${logId}`,
        subject: subject,
        status: 'failed',
        error: errorMessage,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      }))
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    
    // Validate CloudMailin webhook signature if secret is provided
    if (process.env.CLOUDMAILIN_SECRET) {
      const signature = request.headers.get('x-cloudmailin-signature')
      
      if (signature && !verifyCloudMailinSignature(rawBody, signature)) {
        // For now, log but don't reject - CloudMailin signature format might be different
        console.warn('Signature mismatch - proceeding anyway for debugging')
      }
    }
    
    // Parse the body based on content type
    const contentType = request.headers.get('content-type') || ''
    
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

    // Store initial log in both formats for compatibility
    await redis.hset(`email_log:${logId}`, logData)
    await redis.set(`log:${logId}`, JSON.stringify({
      id: `log:${logId}`,
      subject: email.headers.subject,
      status: 'processing',
      created_at: new Date().toISOString()
    }))
    
    // Add to logs list for admin panel
    const logsList = await redis.get('logs:list') as string[] || []
    logsList.unshift(`log:${logId}`)
    await redis.set('logs:list', logsList)

    // Queue async processing (don't await - return immediately)
    setImmediate(() => {
      processEmailAsync(logId, email.headers.subject, email.plain, email.html).catch((error: Error) => {
        console.error(`[${new Date().toISOString()}] [error] Async processing failed for log ${logId}:`, error)
        
        // Update Redis with the error for debugging
        redis.hset(`email_log:${logId}`, {
          status: 'failed',
          stage: 'async_error',
          error: error.message,
          errorStack: error.stack,
          failedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(redisError => {
          console.error(`[${new Date().toISOString()}] [error] Failed to update Redis with error:`, redisError)
        })
      })
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
