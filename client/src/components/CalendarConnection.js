import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  Grid
} from '@mui/material';
import { CalendarToday, CheckCircle, Error, Sync } from '@mui/icons-material';
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';

const CalendarConnection = ({ teamMember, onStatusChange }) => {
  const { user, authToken } = useAuth();
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (teamMember) {
      loadCalendarStatus();
      checkConnectionMessages();
    }
  }, [teamMember]);

  const checkConnectionMessages = () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('calendar_connected') === 'success') {
      setMessage({
        type: 'success',
        text: 'Calendar connected successfully! Your availability will now be checked when customers book meetings.'
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      let errorMessage = 'Failed to connect calendar';

      switch (error) {
        case 'member_not_found':
          errorMessage = 'Team member not found. Please contact admin.';
          break;
        case 'auth_failed':
          errorMessage = 'Calendar authentication failed. Please try again.';
          break;
        case 'token_storage_failed':
          errorMessage = 'Failed to save calendar connection. Please try again.';
          break;
        default:
          errorMessage = 'Calendar connection failed. Please try again.';
      }

      setMessage({ type: 'error', text: errorMessage });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const loadCalendarStatus = async () => {
    if (!teamMember || !authToken) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/team-members/${teamMember.id}/calendar-status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
        setSyncEnabled(data.calendarSyncEnabled);
      }
    } catch (error) {
      console.error('Error loading calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = () => {
    if (!user || !teamMember) return;

    // Redirect to calendar connection endpoint
    window.location.href = `/auth/team-calendar/${encodeURIComponent(user.email)}`;
  };

  const handleToggleSync = async (event) => {
    const enabled = event.target.checked;

    try {
      const response = await fetch(`/api/team-members/${teamMember.id}/toggle-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setSyncEnabled(enabled);
        setMessage({
          type: 'success',
          text: enabled ? 'Calendar sync enabled' : 'Calendar sync disabled'
        });
        if (onStatusChange) onStatusChange();
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
      setMessage({ type: 'error', text: 'Failed to update sync setting' });
    }
  };

  if (!teamMember) {
    return null;
  }

  // Only show to the team member themselves
  if (!user || user.email !== teamMember.email) {
    return null;
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <CalendarToday color="primary" />
              <Typography variant="h6">
                Your Calendar Connection
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="textSecondary">
                  Loading calendar status...
                </Typography>
              </Box>
            ) : calendarStatus?.calendarConnected ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main">
                    Calendar connected
                  </Typography>
                  {calendarStatus.connectedAt && (
                    <Typography variant="caption" color="textSecondary">
                      • Connected {moment(calendarStatus.connectedAt).fromNow()}
                    </Typography>
                  )}
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Your calendar is connected and will be checked for conflicts when customers book meetings.
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={syncEnabled}
                      onChange={handleToggleSync}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Sync fontSize="small" />
                      <Typography variant="body2">
                        Enable availability sync
                      </Typography>
                    </Box>
                  }
                />
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Error color="warning" fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Calendar not connected
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Connect your Google Calendar to automatically check your availability when customers book meetings. Only times when you're free will be shown as available.
                </Typography>
              </>
            )}
          </Grid>

          <Grid item xs={12} sm={4}>
            {!loading && !calendarStatus?.calendarConnected && (
              <Button
                variant="contained"
                onClick={handleConnectCalendar}
                size="large"
                fullWidth
                startIcon={<CalendarToday />}
              >
                Connect Calendar
              </Button>
            )}

            {calendarStatus?.calendarConnected && (
              <Chip
                label={syncEnabled ? "Sync Active" : "Sync Disabled"}
                color={syncEnabled ? "success" : "warning"}
                variant="filled"
                sx={{ fontSize: '1rem', p: 1 }}
              />
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CalendarConnection;