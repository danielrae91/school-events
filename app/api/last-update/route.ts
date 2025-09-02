import { NextResponse } from 'next/server'
import { getLastEmailUpdate } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lastUpdate = await getLastEmailUpdate()
    
    return NextResponse.json({
      lastUpdate,
      formatted: lastUpdate ? new Date(lastUpdate).toLocaleString('en-NZ', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : null
    })
  } catch (error) {
    console.error('Error getting last update:', error)
    return NextResponse.json({ error: 'Failed to get last update' }, { status: 500 })
  }
}
