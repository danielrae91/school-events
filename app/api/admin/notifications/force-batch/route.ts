import { NextRequest, NextResponse } from 'next/server'
import { forceProcessBatch } from '@/lib/batchedNotifications'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const result = await forceProcessBatch()
    
    return NextResponse.json({
      ...result,
      success: true
    })
    
  } catch (error) {
    console.error('Error forcing batch processing:', error)
    return NextResponse.json(
      { error: 'Failed to process batch' },
      { status: 500 }
    )
  }
}
