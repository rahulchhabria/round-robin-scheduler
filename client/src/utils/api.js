import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const meetingAPI = {
  // Get available time slots
  getAvailableSlots: (date) => 
    api.get(`/api/slots?date=${date}`),

  // Book a new meeting
  bookMeeting: (meetingData) => 
    api.post('/api/meetings', meetingData),

  // Get pending meetings
  getPendingMeetings: () => 
    api.get('/api/meetings/pending'),

  // Assign meeting to team member
  assignMeeting: (meetingId, teamMemberId, accessToken) => 
    api.post(`/api/meetings/${meetingId}/assign`, { 
      teamMemberId, 
      accessToken 
    }),
};

export const teamAPI = {
  // Get all team members
  getTeamMembers: () => 
    api.get('/api/team-members'),

  // Add new team member
  addTeamMember: (memberData) => 
    api.post('/api/team-members', memberData),
};

export const authAPI = {
  // Get access token for session
  getAccessToken: (sessionId) => 
    api.get(`/api/auth/token/${sessionId}`),
};

export default api;