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

    // Get all stored emails
    const emailKeys = await redis.keys('email:*')
    
    if (emailKeys.length === 0) {
      return NextResponse.json({ message: 'No stored emails found' })
    }

    let processedCount = 0
    let errorCount = 0

    // Process each email
    for (const emailKey of emailKeys) {
      try {
        const emailData = await redis.get(emailKey)
        if (!emailData) continue

        const email = typeof emailData === 'string' ? JSON.parse(emailData) : emailData
        
        // Create log entry for retry
        const logId = `log:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const logData = {
          id: logId,
          subject: email.subject || 'Unknown Subject',
          status: 'processing',
          created_at: new Date().toISOString(),
          retry: true
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
        console.error('Error processing email:', error)
        errorCount++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bulk retry completed. Processed: ${processedCount}, Errors: ${errorCount}`,
      totalEmails: emailKeys.length,
      processedCount,
      errorCount
    })
  } catch (error) {
    console.error('Error in bulk retry:', error)
    return NextResponse.json({ error: 'Failed to process bulk retry' }, { status: 500 })
  }
}
