import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message, timestamp, userAgent } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get real IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'

    const feedbackId = `feedback:${Date.now()}`
    
    const feedbackData = {
      id: feedbackId,
      name,
      email,
      message,
      timestamp,
      userAgent: userAgent || 'unknown',
      ipAddress: realIp,
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
