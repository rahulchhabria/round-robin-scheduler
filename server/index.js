require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const Database = require('./database');
const GoogleCalendarService = require('./googleCalendar');

const app = express();
const db = new Database();
const googleCalendar = new GoogleCalendarService();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store for access tokens (in production, use Redis or database)
const userTokens = new Map();

// Routes

// Get available time slots for booking
app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }

  const targetDate = moment(date);
  const dayOfWeek = targetDate.day();

  db.getAvailableSlots((err, slots) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Filter slots for the requested day of week
    const daySlots = slots.filter(slot => slot.day_of_week === dayOfWeek);
    
    if (daySlots.length === 0) {
      return res.json({ slots: [] });
    }

    // Generate time slots for the day
    const availableSlots = [];
    
    daySlots.forEach(slot => {
      const startTime = moment(`${date} ${slot.start_time}`);
      const endTime = moment(`${date} ${slot.end_time}`);
      const duration = slot.duration_minutes;

      let current = startTime.clone();
      while (current.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
        availableSlots.push({
          startTime: current.format(),
          endTime: current.clone().add(duration, 'minutes').format(),
          duration: duration
        });
        current.add(duration, 'minutes');
      }
    });

    // Filter out past slots and check for existing meetings
    const now = moment();
    const futureSlots = availableSlots.filter(slot => moment(slot.startTime).isAfter(now));

    // Check for existing meetings (simplified - in production, check conflicts)
    res.json({ slots: futureSlots });
  });
});

// Book a new meeting
app.post('/api/meetings', (req, res) => {
  const { customerName, customerEmail, title, description, startTime, endTime } = req.body;

  if (!customerName || !customerEmail || !title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const meetingId = uuidv4();
  const meetingData = {
    id: meetingId,
    customerName,
    customerEmail,
    title,
    description: description || '',
    startTime,
    endTime
  };

  db.createMeeting(meetingData, (err) => {
    if (err) {
      console.error('Error creating meeting:', err);
      return res.status(500).json({ error: 'Failed to create meeting' });
    }

    res.json({ 
      success: true, 
      meetingId,
      message: 'Meeting booked successfully! Our team will be in touch soon.' 
    });
  });
});

// Get pending meetings for team selection
app.get('/api/meetings/pending', (req, res) => {
  db.getPendingMeetings((err, meetings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const formattedMeetings = meetings.map(meeting => ({
      ...meeting,
      startTime: moment(meeting.start_time).format(),
      endTime: moment(meeting.end_time).format()
    }));

    res.json({ meetings: formattedMeetings });
  });
});

// Assign team member to meeting
app.post('/api/meetings/:id/assign', (req, res) => {
  const { id: meetingId } = req.params;
  const { teamMemberId, accessToken } = req.body;

  if (!teamMemberId) {
    return res.status(400).json({ error: 'Team member ID required' });
  }

  // Get meeting details
  db.getMeetingById(meetingId, async (err, meeting) => {
    if (err || !meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get team member details
    db.getTeamMembers((err, teamMembers) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const teamMember = teamMembers.find(m => m.id == teamMemberId);
      if (!teamMember) {
        return res.status(404).json({ error: 'Team member not found' });
      }

      // Assign meeting
      db.assignMeetingToMember(meetingId, teamMemberId, async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to assign meeting' });
        }

        // Update meeting count
        db.updateMeetingCount(teamMemberId, () => {});

        // Create Google Calendar event if access token provided
        if (accessToken && teamMember.email) {
          try {
            const eventData = {
              title: meeting.meeting_title,
              description: meeting.meeting_description,
              startTime: meeting.start_time,
              endTime: meeting.end_time,
              customerEmail: meeting.customer_email,
              teamMemberEmail: teamMember.email,
              meetingId: meeting.id
            };

            const event = await googleCalendar.createEvent(eventData, accessToken);
            
            // Store event ID
            db.updateMeetingGoogleEventId(meetingId, event.id, () => {});
            
            res.json({ 
              success: true, 
              message: 'Meeting assigned and calendar event created!',
              eventId: event.id
            });
          } catch (error) {
            console.error('Calendar event creation failed:', error);
            res.json({ 
              success: true, 
              message: 'Meeting assigned, but calendar event creation failed. Please create manually.',
              calendarError: true
            });
          }
        } else {
          res.json({ 
            success: true, 
            message: 'Meeting assigned successfully!' 
          });
        }
      });
    });
  });
});

// Get all team members
app.get('/api/team-members', (req, res) => {
  db.getTeamMembers((err, members) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ teamMembers: members });
  });
});

// Add new team member
app.post('/api/team-members', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  db.addTeamMember(name, email, function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Team member with this email already exists' });
      }
      return res.status(500).json({ error: 'Failed to add team member' });
    }

    res.json({ 
      success: true, 
      teamMemberId: this.lastID,
      message: 'Team member added successfully!' 
    });
  });
});

// Google Calendar OAuth routes
app.get('/auth/google', (req, res) => {
  const authUrl = googleCalendar.getAuthUrl();
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokens = await googleCalendar.setCredentials(code);
    // In production, associate tokens with user session/ID
    const sessionId = uuidv4();
    userTokens.set(sessionId, tokens);
    
    // Redirect to frontend with session ID
    res.redirect(`${process.env.CLIENT_URL}/team?session=${sessionId}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/team?error=auth_failed`);
  }
});

// Get access token for session
app.get('/api/auth/token/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const tokens = userTokens.get(sessionId);
  
  if (!tokens) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ accessToken: tokens.access_token });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});