import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log(`[${new Date().toISOString()}] [test-webhook] Received test webhook:`, {
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      url: request.url
    })

    // Simulate calling the actual inbound webhook
    const inboundResponse = await fetch(`${request.nextUrl.origin}/api/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        envelope: {
          from: 'test@example.com'
        },
        headers: {
          subject: 'Test Newsletter - School Events',
          message_id: 'test-' + Date.now()
        },
        plain: `
UPCOMING SCHOOL EVENTS

Sports Day
Date: Friday, September 6, 2024
Time: 9:00 AM - 3:00 PM
Location: School Field
Description: Annual sports day with various activities and competitions for all year levels.

Parent-Teacher Conferences
Date: Monday, September 9, 2024
Time: 3:30 PM - 6:00 PM
Location: School Hall
Description: Individual meetings with teachers to discuss student progress.

School Fair
Date: Saturday, September 14, 2024
Time: 10:00 AM - 4:00 PM
Location: School Grounds
Description: Community fair with stalls, games, and entertainment.
        `,
        html: null
      })
    })

    const inboundResult = await inboundResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook processed',
      inboundResponse: inboundResult
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Test webhook failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test webhook endpoint - use POST to simulate email processing',
    timestamp: new Date().toISOString()
  })
}
