import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
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

    // Get messages list
    const messagesList = await redis.get('messages:list') as string[] || []
    
    // Get message data
    const messages = []
    for (const messageId of messagesList) {
      try {
        const messageData = await redis.get(messageId)
        if (messageData) {
          messages.push(JSON.parse(messageData as string))
        }
      } catch (error) {
        console.error('Error parsing message data:', messageId, error)
      }
    }

    return NextResponse.json({ messages })
    
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { messageIds } = await request.json()

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'Invalid message IDs' }, { status: 400 })
    }

    // Delete messages
    for (const messageId of messageIds) {
      await redis.del(messageId)
      await redis.lrem('messages:list', 0, messageId)
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting messages:', error)
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    )
  }
}
