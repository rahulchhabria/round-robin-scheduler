import React from 'react';
import { Box, Card, CardContent, Grid, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CalendarToday } from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={12}>
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
      </Grid>
    </Box>
  );
};

export default HomePage;