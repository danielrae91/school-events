import { NextRequest, NextResponse } from 'next/server'
import { redis, getAllEvents, storeEvent, updateEvent, deleteEvent } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await getAllEvents()
    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching admin events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, eventId, eventData } = body

    if (action === 'delete') {
      await deleteEvent(eventId)
      return NextResponse.json({ success: true })
    }

    if (action === 'bulk_delete') {
      const { eventIds } = body
      for (const id of eventIds) {
        await deleteEvent(id)
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'create') {
      await storeEvent(eventData)
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      await updateEvent(eventId, eventData)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error handling admin events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
