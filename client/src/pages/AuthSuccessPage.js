import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      login(token);
      // Redirect to team dashboard after successful login
      setTimeout(() => {
        navigate('/team');
      }, 1000);
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, login, navigate]);

  return (
    <Box 
      display="flex" 
      flexDirection="column"
      justifyContent="center" 
      alignItems="center" 
      minHeight="60vh"
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6">
        Logging you in...
      </Typography>
    </Box>
  );
};

export default AuthSuccessPage;