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
    const messagesListData = await redis.get('messages:list')
    let messagesList = []
    
    if (messagesListData) {
      try {
        messagesList = JSON.parse(messagesListData as string)
      } catch (parseError) {
        console.error('Error parsing messages list:', parseError)
        // If it's not JSON, treat it as an array directly (fallback for old format)
        messagesList = Array.isArray(messagesListData) ? messagesListData : []
      }
    }
    
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

    // Get current messages list
    const messagesListData = await redis.get('messages:list')
    let messagesList = []
    
    if (messagesListData) {
      try {
        messagesList = JSON.parse(messagesListData as string)
      } catch (parseError) {
        console.error('Error parsing messages list for deletion:', parseError)
        messagesList = Array.isArray(messagesListData) ? messagesListData : []
      }
    }

    // Delete messages
    for (const messageId of messageIds) {
      await redis.del(messageId)
      // Remove from array and update the list
      messagesList = messagesList.filter((id: string) => id !== messageId)
    }
    
    // Update the messages list
    await redis.set('messages:list', JSON.stringify(messagesList))

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting messages:', error)
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    )
  }
}
