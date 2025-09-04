import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function PATCH(
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

    const messageId = params.id
    const { isRead } = await request.json()

    // Get existing message data
    const messageData = await redis.get(messageId)
    if (!messageData) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const message = JSON.parse(messageData as string)
    message.isRead = isRead

    // Update message
    await redis.set(messageId, JSON.stringify(message))

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

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

    const messageId = params.id

    // Delete from messages list
    await redis.lrem('messages:list', 0, messageId)
    
    // Delete the message data
    await redis.del(messageId)

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
