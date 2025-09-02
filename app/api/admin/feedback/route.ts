import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get feedback list from Redis
    const feedbackList = await redis.get('feedback:list') as string[] || []
    const feedback = []

    for (const feedbackId of feedbackList) {
      const feedbackData = await redis.get(feedbackId)
      if (feedbackData) {
        try {
          // Handle both string and object responses from Redis
          const parsedData = typeof feedbackData === 'string' 
            ? JSON.parse(feedbackData) 
            : feedbackData
          feedback.push(parsedData)
        } catch (error) {
          console.error('Error parsing feedback data:', error, 'Data:', feedbackData)
          // Skip malformed feedback entries
          continue
        }
      }
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
