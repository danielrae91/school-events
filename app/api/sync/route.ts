import { NextRequest, NextResponse } from 'next/server'
import { syncFromIcsToGoogle } from '@/lib/googleCalendarSync'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.SYNC_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run the sync
    console.log('[SYNC] Starting Google Calendar sync...')
    const result = await syncFromIcsToGoogle()
    
    if (result.success) {
      console.log(`[SYNC] Success: ${result.message}`)
      return NextResponse.json({
        success: true,
        message: result.message,
        synced: result.synced,
        errors: result.errors,
        timestamp: new Date().toISOString()
      })
    } else {
      console.error(`[SYNC] Failed: ${result.message}`)
      return NextResponse.json({
        success: false,
        message: result.message,
        synced: result.synced,
        errors: result.errors,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[SYNC] Unexpected error:', error)
    
    return NextResponse.json({
      success: false,
      message: `Sync failed: ${errorMessage}`,
      synced: 0,
      errors: [errorMessage],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Simple health check endpoint
  return NextResponse.json({
    message: 'Google Calendar sync endpoint',
    timestamp: new Date().toISOString(),
    status: 'ready'
  })
}
