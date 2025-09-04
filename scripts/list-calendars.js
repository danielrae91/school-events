// Script to list all Google Calendars accessible to your service account
// Run with: node scripts/list-calendars.js

const { google } = require('googleapis');
require('dotenv').config();

async function listCalendars() {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const calendar = google.calendar({ version: 'v3', auth });
    
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    console.log('Available calendars:');
    calendars.forEach(cal => {
      console.log(`- Name: ${cal.summary}`);
      console.log(`  ID: ${cal.id}`);
      console.log(`  Access: ${cal.accessRole}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error listing calendars:', error.message);
  }
}

listCalendars();
