import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Create suggestion entry
    const suggestionId = Date.now().toString()
    const suggestionData = {
      id: suggestionId,
      title: body.title,
      description: body.description || '',
      location: body.location || '',
      start_date: body.start_date,
      start_time: body.start_time || '',
      end_date: body.end_date || '',
      end_time: body.end_time || '',
      contact_name: body.contact_name || '',
      contact_email: body.contact_email || '',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    // Store suggestion in Redis
    await redis.hset(`suggestion:${suggestionId}`, suggestionData)
    
    // Add to suggestions list for admin review
    await redis.zadd('tk:suggestions:pending', { 
      score: Date.now(), 
      member: suggestionId 
    })

    return NextResponse.json({
      success: true,
      message: 'Event suggestion submitted successfully',
      suggestion_id: suggestionId
    })

  } catch (error) {
    console.error('Error submitting event suggestion:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit suggestion',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
