import { NextRequest, NextResponse } from 'next/server'
import { storePushSubscription } from '@/lib/pushNotifications'

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    const subscriptionId = await storePushSubscription(subscription)
    
    return NextResponse.json({
      success: true,
      subscriptionId,
      message: 'Push subscription stored successfully'
    })
    
  } catch (error) {
    console.error('Error storing push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to store subscription' },
      { status: 500 }
    )
  }
}
