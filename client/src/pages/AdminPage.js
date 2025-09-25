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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip
} from '@mui/material';
import { Add, Person, Delete, Edit } from '@mui/icons-material';
import { teamAPI, meetingAPI } from '../utils/api';
import moment from 'moment';

const AdminPage = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamResponse, meetingsResponse] = await Promise.all([
        teamAPI.getTeamMembers(),
        meetingAPI.getPendingMeetings()
      ]);
      
      setTeamMembers(teamResponse.data.teamMembers || []);
      setMeetings(meetingsResponse.data.meetings || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    setLoading(true);
    try {
      const response = await teamAPI.addTeamMember(newMember);
      
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        setOpenDialog(false);
        setNewMember({ name: '', email: '' });
        loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Error adding member:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add team member' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'assigned': return 'success';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const calculateStats = () => {
    const totalMeetings = teamMembers.reduce((sum, member) => sum + member.meeting_count, 0);
    const averageMeetings = teamMembers.length > 0 ? (totalMeetings / teamMembers.length).toFixed(1) : 0;
    
    return {
      totalTeamMembers: teamMembers.length,
      totalMeetings,
      averageMeetings,
      pendingMeetings: meetings.length
    };
  };

  const stats = calculateStats();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Admin Dashboard
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

      {/* Statistics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.totalTeamMembers}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Team Members
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.totalMeetings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.averageMeetings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Avg per Member
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.pendingMeetings}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Team Members Management */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Team Members ({teamMembers.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              Add Member
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Meeting Count</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Joined</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person />
                          {member.name}
                        </Box>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={member.meeting_count} 
                          color="primary" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={member.is_active ? 'Active' : 'Inactive'}
                          color={member.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {moment(member.created_at).format('MMM D, YYYY')}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Meetings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Meetings
          </Typography>
          
          {meetings.length === 0 ? (
            <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
              No recent meetings
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Meeting Title</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.slice(0, 10).map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {meeting.customer_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {meeting.customer_email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{meeting.meeting_title}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {moment(meeting.start_time).format('MMM D, YYYY')}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {moment(meeting.start_time).format('h:mm A')} - {moment(meeting.end_time).format('h:mm A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={meeting.status}
                          color={getStatusColor(meeting.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {meeting.assigned_to ? (
                          teamMembers.find(m => m.id === meeting.assigned_to)?.name || 'Unknown'
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={newMember.name}
              onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained"
            disabled={loading || !newMember.name.trim() || !newMember.email.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;