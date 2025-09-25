import React from 'react';
import { Typography, Box, Card, CardContent, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CalendarToday, Group, AdminPanelSettings } from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Meeting Scheduler
      </Typography>
      
      <Typography variant="h6" component="p" gutterBottom align="center" color="textSecondary">
        Book meetings and manage your team's schedule with round-robin assignment
      </Typography>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <CalendarToday sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Book a Meeting
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Customers can easily book meetings by selecting from available time slots. 
                The system will automatically assign a team member.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/book')}
                sx={{ mt: 2 }}
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Group sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Team Dashboard
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Team members can view pending meetings and self-select which ones 
                they want to join. Fair distribution with round-robin logic.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/team')}
                sx={{ mt: 2 }}
              >
                Team View
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <AdminPanelSettings sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Admin Panel
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Manage team members, view scheduling statistics, and configure 
                available meeting slots and business hours.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/admin')}
                sx={{ mt: 2 }}
              >
                Admin Panel
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6, p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Features
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" component="li">
              🗓️ Google Calendar integration
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" component="li">
              🔄 Round-robin team assignment
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" component="li">
              👥 Team self-selection option
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" component="li">
              📧 Automatic email notifications
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default HomePage;