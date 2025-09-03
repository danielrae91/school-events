# Google Calendar Sync Setup

This document explains how to set up the Google Calendar sync functionality for TK Events.

## Required Environment Variables

Add these environment variables to your Vercel project settings:

### Google Calendar API Credentials

1. **GOOGLE_CLIENT_ID** - OAuth2 client ID from Google Cloud Console
2. **GOOGLE_CLIENT_SECRET** - OAuth2 client secret from Google Cloud Console  
3. **GOOGLE_REDIRECT_URI** - OAuth2 redirect URI (e.g., `http://localhost:3000/auth/callback`)
4. **GOOGLE_REFRESH_TOKEN** - OAuth2 refresh token for your Google account
5. **GOOGLE_CALENDAR_ID** - The ID of the target Google Calendar to sync events to

### Sync Authentication

6. **SYNC_SECRET** - Secret token for authenticating sync API calls

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API

### 2. Create OAuth2 Credentials

1. Go to "Credentials" in the Google Cloud Console
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Set application type to "Web application"
4. Add authorized redirect URIs (for local testing: `http://localhost:3000/auth/callback`)
5. Save the Client ID and Client Secret

### 3. Get Refresh Token

You'll need to perform the OAuth2 flow once to get a refresh token. You can use a tool like:

- Google OAuth2 Playground: https://developers.google.com/oauthplayground/
- Or create a temporary script to handle the OAuth flow

### 4. Find Calendar ID

1. Go to Google Calendar
2. Click on the calendar you want to sync to
3. Go to "Settings and sharing"
4. Copy the "Calendar ID" (usually looks like an email address)

### 5. Generate Sync Secret

Generate a secure random string for the SYNC_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing the Sync

### Manual Sync

You can manually trigger a sync by calling:

```bash
curl -X POST https://your-domain.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_SYNC_SECRET"
```

### Automatic Sync

The system is configured to automatically sync every 6 hours via Vercel cron jobs.

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that your SYNC_SECRET is correct
2. **Google API errors**: Verify your OAuth2 credentials and refresh token
3. **Calendar not found**: Ensure GOOGLE_CALENDAR_ID is correct
4. **Permission denied**: Make sure your Google account has write access to the target calendar

### Logs

Check Vercel function logs for detailed error messages during sync operations.

## How It Works

1. The sync function fetches the ICS feed from `https://tkevents.nz/calendar.ics`
2. Parses the ICS data using the `ical` library
3. Converts events to Google Calendar format
4. Uses the Google Calendar API to create/update events
5. Events are matched by their iCal UID to avoid duplicates
6. All-day events use `{ date: "YYYY-MM-DD" }` format
7. Timed events use `{ dateTime: "ISO-8601", timeZone: "Pacific/Auckland" }` format

The sync is one-way: your app is the source of truth, and changes are pushed to Google Calendar.
