import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all pending suggestions
    const suggestionIds = await redis.zrange('tk:suggestions:pending', 0, -1)
    const suggestions = []

    for (const id of suggestionIds) {
      const suggestion = await redis.hgetall(`suggestion:${id}`)
      if (suggestion && Object.keys(suggestion).length > 0) {
        suggestions.push({
          id,
          ...suggestion,
          source: 'suggestion'
        })
      }
    }

    return NextResponse.json({
      suggestions: suggestions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })

  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, suggestionId, eventData } = await request.json()

    if (action === 'approve') {
      // Get suggestion data
      const suggestion = await redis.hgetall(`suggestion:${suggestionId}`)
      if (!suggestion || Object.keys(suggestion).length === 0) {
        return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
      }

      // Create event from suggestion
      const eventId = Date.now().toString()
      const event = {
        id: eventId,
        title: eventData?.title || suggestion.title,
        description: eventData?.description || suggestion.description || '',
        location: eventData?.location || suggestion.location || '',
        start_date: eventData?.start_date || suggestion.start_date,
        start_time: eventData?.start_time || suggestion.start_time || '',
        end_date: eventData?.end_date || suggestion.end_date || '',
        end_time: eventData?.end_time || suggestion.end_time || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'suggestion',
        needs_enrichment: false
      }

      // Store as regular event
      await redis.hset(`event:${eventId}`, event)
      await redis.zadd('tk:events', { score: Date.now(), member: eventId })

      // Remove from suggestions
      await redis.zrem('tk:suggestions:pending', suggestionId)
      await redis.del(`suggestion:${suggestionId}`)

      return NextResponse.json({ success: true, eventId })

    } else if (action === 'reject') {
      // Remove suggestion
      await redis.zrem('tk:suggestions:pending', suggestionId)
      await redis.del(`suggestion:${suggestionId}`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error processing suggestion:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process suggestion',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
