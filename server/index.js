require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const Database = require('./database');
const GoogleCalendarService = require('./googleCalendar');
const AuthService = require('./auth');

const app = express();
const db = new Database();
const googleCalendar = new GoogleCalendarService();
const auth = new AuthService();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store for access tokens (in production, use Redis or database)
const userTokens = new Map();

// Routes

// Get available time slots for booking
app.get('/api/slots', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }

  const targetDate = moment(date);
  const dayOfWeek = targetDate.day();

  db.getAvailableSlots(async (err, slots) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Filter slots for the requested day of week
    const daySlots = slots.filter(slot => slot.day_of_week === dayOfWeek);

    if (daySlots.length === 0) {
      return res.json({ slots: [] });
    }

    // Generate time slots for the day
    const potentialSlots = [];

    daySlots.forEach(slot => {
      const startTime = moment(`${date} ${slot.start_time}`);
      const endTime = moment(`${date} ${slot.end_time}`);
      const duration = slot.duration_minutes;

      let current = startTime.clone();
      while (current.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
        potentialSlots.push({
          startTime: current.format(),
          endTime: current.clone().add(duration, 'minutes').format(),
          duration: duration
        });
        current.add(duration, 'minutes');
      }
    });

    // Filter out past slots
    const now = moment();
    const futureSlots = potentialSlots.filter(slot => moment(slot.startTime).isAfter(now));

    // Check team member availability for calendar-connected members
    try {
      const availableSlots = await checkTeamAvailability(futureSlots);
      res.json({ slots: availableSlots });
    } catch (error) {
      console.error('Error checking team availability:', error);
      // Fallback to showing all slots if availability check fails
      res.json({ slots: futureSlots });
    }
  });
});

// Helper function to check team member availability
async function checkTeamAvailability(timeSlots) {
  return new Promise((resolve, reject) => {
    db.getTeamMembersWithCalendar((err, members) => {
      if (err) {
        return reject(err);
      }

      if (members.length === 0) {
        // No calendar-connected members, show all slots
        return resolve(timeSlots);
      }

      // Check availability for each slot
      const availabilityPromises = timeSlots.map(async (slot) => {
        let hasAvailableMember = false;

        for (const member of members) {
          if (!member.calendar_sync_enabled) continue;

          try {
            const isAvailable = await googleCalendar.checkAvailability(
              member.email,
              slot.startTime,
              slot.endTime,
              member.google_access_token
            );

            if (isAvailable) {
              hasAvailableMember = true;
              break; // At least one team member is available
            }
          } catch (error) {
            console.error(`Error checking availability for ${member.email}:`, error);
            // Continue checking other members
          }
        }

        return hasAvailableMember ? slot : null;
      });

      Promise.all(availabilityPromises)
        .then(results => {
          const availableSlots = results.filter(slot => slot !== null);
          resolve(availableSlots);
        })
        .catch(reject);
    });
  });
}

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

// Authentication routes
app.get('/auth/login', (req, res) => {
  const authUrl = auth.getLoginUrl();
  res.redirect(authUrl);
});

app.get('/auth/login/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
  }

  try {
    const result = await auth.handleCallback(code);
    
    if (result.success) {
      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${result.token}`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(result.error)}`);
    }
  } catch (error) {
    console.error('Login callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = auth.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  res.json({
    user: {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture
    }
  });
});

// Get pending meetings for team selection (protected)
app.get('/api/meetings/pending', auth.requireAuth.bind(auth), (req, res) => {
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

// Assign team member to meeting (protected)
app.post('/api/meetings/:id/assign', auth.requireAuth.bind(auth), (req, res) => {
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

// Get all team members (protected)
app.get('/api/team-members', auth.requireAuth.bind(auth), (req, res) => {
  db.getTeamMembers((err, members) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ teamMembers: members });
  });
});

// Add new team member (protected)
app.post('/api/team-members', auth.requireAuth.bind(auth), (req, res) => {
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

// Team member calendar connection
app.get('/auth/team-calendar/:teamMemberEmail', auth.requireAuth.bind(auth), (req, res) => {
  const { teamMemberEmail } = req.params;

  // Check if the requesting user matches the team member email (for security)
  if (req.user.email !== teamMemberEmail) {
    return res.status(403).json({ error: 'Access denied. Can only connect your own calendar.' });
  }

  const authUrl = googleCalendar.getAuthUrl() + `&state=${encodeURIComponent(teamMemberEmail)}`;
  res.redirect(authUrl);
});

app.get('/auth/team-calendar-callback', async (req, res) => {
  const { code, state: teamMemberEmail } = req.query;

  if (!code || !teamMemberEmail) {
    return res.redirect(`${process.env.CLIENT_URL}/team?error=missing_params`);
  }

  try {
    const tokens = await googleCalendar.setCredentials(code);

    // Get team member from database
    db.getMemberByEmail(teamMemberEmail, async (err, member) => {
      if (err || !member) {
        console.error('Team member not found:', teamMemberEmail);
        return res.redirect(`${process.env.CLIENT_URL}/team?error=member_not_found`);
      }

      // Get calendar ID (primary calendar)
      const calendarId = 'primary';

      // Store tokens in database
      db.updateMemberCalendarTokens(
        member.id,
        tokens.access_token,
        tokens.refresh_token,
        calendarId,
        (err) => {
          if (err) {
            console.error('Failed to store calendar tokens:', err);
            return res.redirect(`${process.env.CLIENT_URL}/team?error=token_storage_failed`);
          }

          res.redirect(`${process.env.CLIENT_URL}/team?calendar_connected=success`);
        }
      );
    });
  } catch (error) {
    console.error('Calendar OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/team?error=auth_failed`);
  }
});

// Get team member calendar status
app.get('/api/team-members/:memberId/calendar-status', auth.requireAuth.bind(auth), (req, res) => {
  const { memberId } = req.params;

  db.getTeamMembers((err, members) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const member = members.find(m => m.id == memberId);
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json({
      calendarConnected: !!member.calendar_connected,
      calendarSyncEnabled: !!member.calendar_sync_enabled,
      connectedAt: member.calendar_connected_at
    });
  });
});

// Toggle calendar sync for team member
app.post('/api/team-members/:memberId/toggle-sync', auth.requireAuth.bind(auth), (req, res) => {
  const { memberId } = req.params;
  const { enabled } = req.body;

  db.updateMemberCalendarSyncStatus(memberId, enabled, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update sync status' });
    }

    res.json({ success: true, syncEnabled: enabled });
  });
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