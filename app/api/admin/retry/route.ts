import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'
import { storeEvent, eventExists } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { logId } = await request.json()

    // Get the failed email log
    const logData = await redis.hgetall(`email_log:${logId}`)
    if (!logData || Object.keys(logData).length === 0 || !logData.emailContent) {
      return NextResponse.json({ error: 'Log not found or no email content' }, { status: 404 })
    }

    // Parse the stored email content
    const emailContentStr = typeof logData.emailContent === 'string' ? logData.emailContent : JSON.stringify(logData.emailContent)
    const emailContent = JSON.parse(emailContentStr)
    
    // Retry processing with GPT
    const contentToProcess = `
NEWSLETTER SUBJECT: ${emailContent.subject || ''}

NEWSLETTER CONTENT:
${emailContent.plain || ''}

${emailContent.html ? `\nHTML CONTENT:\n${emailContent.html}` : ''}
    `.trim()
    
    const events = await parseNewsletterWithGPT(contentToProcess)

    // Store events (with deduplication)
    const storedEvents = []
    const skippedEvents = []

    for (const event of events) {
      try {
        const exists = await eventExists(event.title, event.start_date)
        
        if (exists) {
          skippedEvents.push(event.title)
          continue
        }

        const stored = await storeEvent(event)
        storedEvents.push(stored)
        
      } catch (error) {
        console.error('Error storing event during retry:', event.title, error)
      }
    }

    // Update log status
    await redis.hset(`email_log:${logId}`, {
      status: 'success',
      eventsProcessed: storedEvents.length,
      eventsSkipped: skippedEvents.length,
      retryTimestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Retry successful: ${storedEvents.length} events stored, ${skippedEvents.length} skipped`,
      eventsStored: storedEvents.length,
      eventsSkipped: skippedEvents.length
    })

  } catch (error) {
    console.error('Error retrying email processing:', error)
    return NextResponse.json(
      { error: 'Failed to retry email processing' },
      { status: 500 }
    )
  }
}
