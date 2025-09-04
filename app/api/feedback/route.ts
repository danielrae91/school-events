import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message, timestamp, userAgent, platform, language, screenResolution, viewport, timezone } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get real IP address and additional headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const country = request.headers.get('cf-ipcountry') || 'unknown'
    const city = request.headers.get('cf-ipcity') || 'unknown'

    const messageId = `message:${Date.now()}`
    
    const messageData = {
      id: messageId,
      name,
      email,
      message,
      timestamp,
      userAgent: userAgent || 'unknown',
      platform: platform || 'unknown',
      language: language || 'unknown',
      screenResolution: screenResolution || 'unknown',
      viewport: viewport || 'unknown',
      timezone: timezone || 'unknown',
      ipAddress: realIp,
      country,
      city,
      isRead: false,
      created_at: new Date().toISOString()
    }

    await redis.set(messageId, JSON.stringify(messageData))
    
    // Add to messages list for admin
    const messagesList = await redis.get('messages:list') as string[] || []
    messagesList.unshift(messageId)
    await redis.set('messages:list', JSON.stringify(messagesList))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
