import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'
import { parseNewsletterWithGPT } from '@/lib/parseNewsletter'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all events
    const eventKeys = await redis.keys('event:*')
    if (eventKeys.length > 0) {
      await redis.del(...eventKeys)
    }

    // Clear events list
    await redis.del('events:list')

    // Get all stored emails for reprocessing
    const emailKeys = await redis.keys('email:*')
    
    if (emailKeys.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Deleted ${eventKeys.length} events. No stored emails found to reprocess.`,
        deletedEvents: eventKeys.length
      })
    }

    let processedCount = 0
    let errorCount = 0

    // Reprocess each email
    for (const emailKey of emailKeys) {
      try {
        const emailData = await redis.get(emailKey)
        if (!emailData) continue

        const email = typeof emailData === 'string' ? JSON.parse(emailData) : emailData
        
        // Create log entry for reprocessing
        const logId = `log:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const logData = {
          id: logId,
          subject: email.subject || 'Unknown Subject',
          status: 'processing',
          created_at: new Date().toISOString(),
          reparse: true
        }

        await redis.set(logId, JSON.stringify(logData))
        
        // Add to logs list
        const logsList = await redis.get('logs:list') as string[] || []
        logsList.unshift(logId)
        await redis.set('logs:list', logsList)

        // Process the email
        try {
          const events = await parseNewsletterWithGPT(email.content || email.text || '')
          
          // Update log with success
          const updatedLog = {
            ...logData,
            status: 'completed',
            processed_at: new Date().toISOString(),
            eventsExtracted: events.length || 0,
            eventsProcessed: events.length || 0,
            eventsSkipped: 0
          }
          await redis.set(logId, JSON.stringify(updatedLog))
          
          processedCount++
        } catch (parseError) {
          // Update log with error
          const updatedLog = {
            ...logData,
            status: 'failed',
            processed_at: new Date().toISOString(),
            error: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
          await redis.set(logId, JSON.stringify(updatedLog))
          
          errorCount++
        }
      } catch (error) {
        console.error('Error reprocessing email:', error)
        errorCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${eventKeys.length} events and reprocessed ${emailKeys.length} emails. Processed: ${processedCount}, Errors: ${errorCount}`,
      deletedEvents: eventKeys.length,
      totalEmails: emailKeys.length,
      processedCount,
      errorCount
    })
  } catch (error) {
    console.error('Error in delete all events:', error)
    return NextResponse.json({ error: 'Failed to delete events and reprocess' }, { status: 500 })
  }
}
