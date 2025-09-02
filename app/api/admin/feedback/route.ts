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
    const feedbackList = await redis.lrange('feedback_list', 0, -1)
    const feedback = []

    for (const feedbackId of feedbackList) {
      const feedbackData = await redis.hgetall(`feedback:${feedbackId}`)
      if (feedbackData && Object.keys(feedbackData).length > 0) {
        feedback.push({
          id: feedbackId,
          ...feedbackData
        })
      }
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
