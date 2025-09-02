import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GPT prompt from Redis, set default if empty
    let gptPrompt = await redis.get('gpt_prompt') as string
    
    if (!gptPrompt) {
      // Set default prompt
      const defaultPrompt = `You are an expert at extracting school events from newsletter content. Extract ALL date-based events from the provided newsletter text.

For each event, provide:
- title: Short, clear event name
- description: Include all relevant details (dress code, items to bring, etc.)
- start_date: YYYY-MM-DD format
- end_date: Only if multi-day event, YYYY-MM-DD format
- start_time: HH:MM format if time is mentioned
- end_time: HH:MM format if end time is mentioned
- location: If specified
- needs_enrichment: true if information is missing, vague, or references "Hero", "TBD", or similar placeholders

Important rules:
1. Only extract events with specific dates (not "next week" or "soon")
2. Convert relative dates to absolute dates based on newsletter date
3. Mark needs_enrichment=true for incomplete information
4. Include recurring events as separate entries if dates are specified
5. Be conservative - only extract clear, actionable events

Return ONLY valid JSON in this format:
{
  "events": [
    {
      "title": "Event Name",
      "description": "Event details",
      "start_date": "2024-03-15",
      "start_time": "09:00",
      "location": "School Hall",
      "needs_enrichment": false
    }
  ]
}`
      
      await redis.set('gpt_prompt', defaultPrompt)
      gptPrompt = defaultPrompt
    }

    return NextResponse.json({ gptPrompt })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gptPrompt } = await request.json()

    // Save GPT prompt to Redis
    await redis.set('gpt_prompt', gptPrompt)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
