import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

  // Get calendar status for team member
  getCalendarStatus: (memberId) =>
    api.get(`/api/team-members/${memberId}/calendar-status`),

  // Toggle calendar sync for team member
  toggleCalendarSync: (memberId, enabled) =>
    api.post(`/api/team-members/${memberId}/toggle-sync`, { enabled }),
};

export const authAPI = {
  // Get access token for session
  getAccessToken: (sessionId) => 
    api.get(`/api/auth/token/${sessionId}`),

  // Verify authentication token
  verifyToken: (token) =>
    api.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    }),
};

export default api;