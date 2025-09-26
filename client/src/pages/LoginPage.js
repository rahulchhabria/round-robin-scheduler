import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Alert 
} from '@mui/material';
import { Google } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/login';
  };

  const getErrorMessage = (error) => {
    switch (error) {
      case 'no_code':
        return 'Authorization code not received';
      case 'auth_failed':
        return 'Authentication failed';
      case 'access_denied':
        return 'Access denied';
      default:
        if (error && error.includes('sentry.io')) {
          return 'Only sentry.io email addresses are allowed to access this system';
        }
        return error || 'An error occurred during login';
    }
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="60vh"
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Team Login
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            Access to team dashboard and admin panel is restricted to Sentry team members
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<Google />}
            onClick={handleLogin}
            fullWidth
            sx={{ mt: 2 }}
          >
            Sign in with Google
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
            Only @sentry.io email addresses are permitted
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;