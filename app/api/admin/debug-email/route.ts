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

    // Get recent email logs
    const keys = await redis.keys('email_log:*')
    const logs = []
    
    for (const key of keys.slice(-10)) { // Get last 10 logs
      const logData = await redis.hgetall(key)
      logs.push({
        id: key.replace('email_log:', ''),
        ...logData
      })
    }

    // Sort by timestamp (with type safety)
    logs.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bTime - aTime
    })

    // Get GPT prompt status
    const gptPrompt = await redis.get('gpt_prompt')
    
    return NextResponse.json({
      logs,
      gptPromptExists: !!gptPrompt,
      gptPromptLength: gptPrompt?.length || 0,
      openaiKeyExists: !!process.env.OPENAI_API_KEY,
      totalLogKeys: keys.length
    })
  } catch (error) {
    console.error('Error debugging email logs:', error)
    return NextResponse.json(
      { error: 'Failed to debug email logs' },
      { status: 500 }
    )
  }
}
