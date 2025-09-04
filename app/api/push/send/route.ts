import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/pushNotifications'

export async function POST(request: NextRequest) {
  try {
    console.log('Push notification send request received')
    
    // Check admin token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (token !== process.env.ADMIN_TOKEN) {
      console.log('Invalid admin token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('Admin token validated')

    const { title, body, eventId, eventTitle, eventDate } = await request.json()
    
    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    console.log('Notification payload:', { title, body, eventId, eventTitle, eventDate })

    const result = await sendPushNotification({
      title,
      body,
      eventId,
      eventTitle,
      eventDate
    })

    console.log('Push notification result:', result)

    return NextResponse.json({ 
      success: true, 
      message: `Notification sent to ${result.successCount} subscribers (${result.failureCount} failed)`,
      ...result 
    })
    
  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
