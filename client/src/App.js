import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';

import BookingPage from './pages/BookingPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Meeting Scheduler
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Home
            </Button>
            <Button color="inherit" component={Link} to="/book">
              Book Meeting
            </Button>
            <Button color="inherit" component={Link} to="/team">
              Team Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/admin">
              Admin
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg">
          <Box sx={{ mt: 4 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Box>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;