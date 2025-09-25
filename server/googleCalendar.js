const { google } = require('googleapis');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Generate OAuth URL for team member authentication
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  // Set credentials from OAuth callback
  async setCredentials(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // Create calendar event
  async createEvent(eventData, accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: 'America/Los_Angeles', // Adjust timezone as needed
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: 'America/Los_Angeles',
      },
      attendees: [
        { email: eventData.customerEmail },
        { email: eventData.teamMemberEmail }
      ],
      conferenceData: {
        createRequest: {
          requestId: eventData.meetingId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Check for conflicts in team member's calendar
  async checkAvailability(email, startTime, endTime, accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: email }]
        }
      });

      const busyTimes = response.data.calendars[email].busy || [];
      return busyTimes.length === 0; // Available if no busy times
    } catch (error) {
      console.error('Error checking availability:', error);
      return false; // Assume unavailable if error
    }
  }

  // Get calendar list for team member
  async getCalendarList(accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error getting calendar list:', error);
      return [];
    }
  }
}

module.exports = GoogleCalendarService;