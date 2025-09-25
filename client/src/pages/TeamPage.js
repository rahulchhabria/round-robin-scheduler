import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { CalendarToday, Person, Email, Schedule } from '@mui/icons-material';
import moment from 'moment';
import { meetingAPI, teamAPI, authAPI } from '../utils/api';

const TeamPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [authDialog, setAuthDialog] = useState(false);

  useEffect(() => {
    loadData();
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId) {
      try {
        const response = await authAPI.getAccessToken(sessionId);
        setAccessToken(response.data.accessToken);
        setMessage({
          type: 'success',
          text: 'Successfully connected to Google Calendar!'
        });
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Failed to get access token:', error);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [meetingsResponse, teamResponse] = await Promise.all([
        meetingAPI.getPendingMeetings(),
        teamAPI.getTeamMembers()
      ]);
      
      setMeetings(meetingsResponse.data.meetings || []);
      setTeamMembers(teamResponse.data.teamMembers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = () => {
    window.location.href = 'http://localhost:3001/auth/google';
  };

  const handleAssignMeeting = async (meetingId) => {
    if (!selectedMember) {
      setMessage({ type: 'error', text: 'Please select a team member' });
      return;
    }

    setLoading(true);
    try {
      const response = await meetingAPI.assignMeeting(meetingId, selectedMember, accessToken);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        loadData(); // Refresh the data
      }
    } catch (error) {
      console.error('Assignment error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to assign meeting' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime) => {
    const momentDate = moment(dateTime);
    return {
      date: momentDate.format('MMMM D, YYYY'),
      time: momentDate.format('h:mm A'),
      day: momentDate.format('dddd')
    };
  };

  const getNextMemberInRotation = () => {
    if (teamMembers.length === 0) return null;
    
    // Sort by meeting count to find who should get the next meeting
    const sortedMembers = [...teamMembers].sort((a, b) => a.meeting_count - b.meeting_count);
    return sortedMembers[0];
  };

  const nextMember = getNextMemberInRotation();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Team Dashboard
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Google Calendar Connection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Typography variant="h6" gutterBottom>
                Google Calendar Integration
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {accessToken 
                  ? 'Connected! Meeting assignments will automatically create calendar events.'
                  : 'Connect your Google Calendar to automatically create calendar events when you pick up meetings.'
                }
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              {!accessToken && (
                <Button
                  variant="contained"
                  onClick={handleConnectCalendar}
                  size="large"
                  fullWidth
                >
                  Connect Calendar
                </Button>
              )}
              {accessToken && (
                <Chip 
                  label="Connected" 
                  color="success" 
                  variant="filled"
                  sx={{ fontSize: '1rem', p: 1 }}
                />
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Team Member Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Team Member</InputLabel>
                <Select
                  value={selectedMember}
                  label="Select Team Member"
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  {teamMembers.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name} ({member.meeting_count} meetings)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              {nextMember && (
                <Paper sx={{ p: 2, backgroundColor: 'primary.light', color: 'white' }}>
                  <Typography variant="body2">
                    <strong>Next in rotation:</strong> {nextMember.name} ({nextMember.meeting_count} meetings)
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pending Meetings */}
      <Typography variant="h5" gutterBottom>
        Pending Meetings ({meetings.length})
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <CalendarToday sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              No pending meetings
            </Typography>
            <Typography variant="body2" color="textSecondary">
              All meetings have been assigned or there are no new bookings.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {meetings.map((meeting) => {
            const dateTime = formatDateTime(meeting.startTime);
            const endDateTime = formatDateTime(meeting.endTime);
            
            return (
              <Grid item xs={12} key={meeting.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <Typography variant="h6" gutterBottom>
                          {meeting.meeting_title}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person fontSize="small" />
                          <Typography variant="body2">
                            {meeting.customer_name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Email fontSize="small" />
                          <Typography variant="body2">
                            {meeting.customer_email}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Schedule fontSize="small" />
                          <Typography variant="body2">
                            {dateTime.day}, {dateTime.date} • {dateTime.time} - {endDateTime.time}
                          </Typography>
                        </Box>
                        
                        {meeting.meeting_description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            {meeting.meeting_description}
                          </Typography>
                        )}

                        <Chip 
                          label={`Booked ${moment(meeting.created_at).fromNow()}`}
                          size="small"
                          variant="outlined"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => handleAssignMeeting(meeting.id)}
                          disabled={loading || !selectedMember}
                          fullWidth
                        >
                          {loading ? <CircularProgress size={20} /> : 'Assign to Me'}
                        </Button>
                        
                        <Typography variant="caption" color="textSecondary" align="center">
                          Duration: {moment(meeting.endTime).diff(moment(meeting.startTime), 'minutes')} minutes
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Team Stats */}
      {teamMembers.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Team Meeting Distribution
            </Typography>
            <Grid container spacing={2}>
              {teamMembers.map((member) => (
                <Grid item xs={12} sm={6} md={4} key={member.id}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {member.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {member.email}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {member.meeting_count} meetings
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TeamPage;