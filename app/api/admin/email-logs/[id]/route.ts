import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const logId = params.id
    const logKey = `email_log:${logId}`
    
    // Check if log exists
    const logExists = await redis.exists(logKey)
    if (!logExists) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    // Delete the log
    await redis.del(logKey)

    return NextResponse.json({ success: true, message: 'Log deleted successfully' })
  } catch (error) {
    console.error('Error deleting email log:', error)
    return NextResponse.json(
      { error: 'Failed to delete email log' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { action } = await request.json()
    
    if (action !== 'retry') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const logId = params.id
    const logKey = `email_log:${logId}`
    
    // Get existing log data
    const logData = await redis.hgetall(logKey)
    if (!logData || Object.keys(logData).length === 0) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    // Parse email content
    let emailContent
    try {
      emailContent = JSON.parse((logData.emailContent as string) || '{}')
    } catch (e) {
      return NextResponse.json({ error: 'Invalid email content in log' }, { status: 400 })
    }

    // Increment retry count
    const retryCount = parseInt((logData.retryCount as string) || '0') + 1

    // Update log status for retry
    await redis.hset(logKey, {
      status: 'processing',
      stage: 'retry_gpt_parsing',
      retryCount: retryCount.toString(),
      retryStarted: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Process email again
    try {
      console.log(`[${new Date().toISOString()}] [info] Retrying email processing for log ${logId} (attempt ${retryCount})`)
      
      // Parse newsletter content with GPT-4
      const contentToProcess = `
NEWSLETTER SUBJECT: ${emailContent.subject || ''}

NEWSLETTER CONTENT:
${emailContent.plain || ''}

${emailContent.html ? `\nHTML CONTENT:\n${emailContent.html}` : ''}
      `.trim()
      
      const events = await parseNewsletterWithGPT(contentToProcess)
      
      console.log(`[${new Date().toISOString()}] [info] Retry GPT returned ${events.length} events for log ${logId}`)

      // Update status to show GPT completed
      await redis.hset(logKey, {
        status: 'processing',
        stage: 'retry_storing_events',
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
            console.log(`[${new Date().toISOString()}] [info] Retry skipping duplicate event: ${event.title} on ${event.start_date}`)
            continue
          }

          const stored = await storeEvent(event)
          storedEvents.push(stored)
          createdEventIds.push(stored.id)
          console.log(`[${new Date().toISOString()}] [info] Retry stored event: ${event.title} on ${event.start_date} (ID: ${stored.id})`)
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [error] Retry error storing event:`, event.title, error)
          skippedEvents.push(`${event.title} (storage error)`)
        }
      }

      // Update log with success
      await redis.hset(logKey, {
        status: 'completed',
        stage: 'retry_completed',
        eventsProcessed: storedEvents.length,
        eventsSkipped: skippedEvents.length,
        createdEvents: JSON.stringify(createdEventIds),
        createdEventTitles: JSON.stringify(storedEvents.map(e => e.title)),
        retryCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      console.log(`[${new Date().toISOString()}] [info] Retry email processing complete for ${logId}: ${storedEvents.length} stored, ${skippedEvents.length} skipped`)

      return NextResponse.json({
        success: true,
        message: 'Email processing retried successfully',
        eventsProcessed: storedEvents.length,
        eventsSkipped: skippedEvents.length,
        createdEvents: createdEventIds
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${new Date().toISOString()}] [error] Retry email processing error for ${logId}:`, error)
      
      // Update log with detailed error
      await redis.hset(logKey, {
        status: 'failed',
        stage: 'retry_error',
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : 'No stack trace',
        retryFailedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      return NextResponse.json(
        { 
          error: 'Retry failed',
          details: errorMessage
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error retrying email processing:', error)
    return NextResponse.json(
      { error: 'Failed to retry email processing' },
      { status: 500 }
    )
  }
}
