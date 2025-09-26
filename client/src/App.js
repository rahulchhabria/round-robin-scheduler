import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BookingPage from './pages/BookingPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthSuccessPage from './pages/AuthSuccessPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#36166b',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const Navigation = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8
            }
          }}
        >
          Meeting Scheduler
        </Typography>
        {isAuthenticated ? (
          <>
            <Button color="inherit" component={Link} to="/team">
              Team Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/admin">
              Admin
            </Button>
            <Button color="inherit" onClick={logout}>
              Logout ({user?.email})
            </Button>
          </>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Team Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navigation />
          <Container maxWidth="lg">
            <Box sx={{ mt: 4 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/book" element={<BookingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/success" element={<AuthSuccessPage />} />
                <Route 
                  path="/team" 
                  element={
                    <ProtectedRoute>
                      <TeamPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Box>
          </Container>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;