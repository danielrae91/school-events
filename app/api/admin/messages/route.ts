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

    console.log('Fetching messages list...')
    
    // Get messages list - handle both formats
    const messagesListData = await redis.get('messages:list')
    console.log('Raw messages list data:', messagesListData, typeof messagesListData)
    
    let messagesList = []
    
    if (messagesListData) {
      if (typeof messagesListData === 'string') {
        try {
          messagesList = JSON.parse(messagesListData)
          console.log('Parsed messages list from JSON:', messagesList)
        } catch (parseError) {
          console.error('Error parsing messages list JSON:', parseError)
          // Reset to empty array if corrupted
          messagesList = []
          await redis.set('messages:list', JSON.stringify([]))
        }
      } else if (Array.isArray(messagesListData)) {
        console.log('Messages list is already an array:', messagesListData)
        messagesList = messagesListData
        // Convert to JSON format for consistency
        await redis.set('messages:list', JSON.stringify(messagesListData))
      }
    }
    
    console.log('Final messages list:', messagesList)
    
    // Get message data
    const messages = []
    for (const messageId of messagesList) {
      try {
        const messageData = await redis.get(messageId)
        if (messageData) {
          let parsed
          if (typeof messageData === 'string') {
            parsed = JSON.parse(messageData)
          } else if (typeof messageData === 'object') {
            // If Redis returns an object directly, use it as-is
            parsed = messageData
          } else {
            console.error('Unexpected message data type:', typeof messageData, messageData)
            continue
          }
          messages.push(parsed)
          console.log('Added message:', messageId, parsed.name)
        }
      } catch (error) {
        console.error('Error parsing message data:', messageId, error)
        // Try to clean up corrupted message
        try {
          await redis.del(messageId)
          console.log('Deleted corrupted message:', messageId)
        } catch (deleteError) {
          console.error('Failed to delete corrupted message:', deleteError)
        }
      }
    }

    console.log(`Returning ${messages.length} messages`)
    return NextResponse.json({ messages })
    
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
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
