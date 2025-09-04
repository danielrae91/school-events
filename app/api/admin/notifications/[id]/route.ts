import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notificationId = params.id

    // Delete from notification history sorted set
    await redis.zrem('notification_history', notificationId)
    
    // Delete the notification data
    await redis.del(notificationId)

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
