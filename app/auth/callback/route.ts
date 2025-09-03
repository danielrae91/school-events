import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Force dynamic rendering for OAuth callback
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    // Return the tokens (especially the refresh token)
    return NextResponse.json({
      success: true,
      message: 'OAuth flow completed successfully',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      }
    })

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({
      error: 'OAuth callback failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
