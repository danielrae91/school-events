import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message, timestamp } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const feedbackId = `feedback:${Date.now()}`
    
    const feedbackData = {
      id: feedbackId,
      name,
      email,
      message,
      timestamp,
      created_at: new Date().toISOString()
    }

    await redis.set(feedbackId, JSON.stringify(feedbackData))
    
    // Add to feedback list for admin
    const feedbackList = await redis.get('feedback:list') as string[] || []
    feedbackList.unshift(feedbackId)
    await redis.set('feedback:list', feedbackList)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
