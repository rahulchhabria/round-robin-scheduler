# Round-Robin Meeting Scheduler

A web application that allows customers to book meetings and enables team members to pick up meetings in a round-robin fashion, with Google Calendar integration.

## Features

- **Customer Booking**: Customers can view available time slots and book meetings (public access)
- **Team Self-Selection**: Team members can view pending meetings and self-select which ones to join
- **Round-Robin Assignment**: Fair distribution of meeting assignments across team members
- **Google Calendar Integration**: Automatic calendar event creation and synchronization
- **Admin Interface**: Manage team members and view scheduling statistics
- **Secure Authentication**: Team dashboard and admin panel restricted to @sentry.io email addresses

## Setup

1. **Install Dependencies**:
   ```bash
   npm run install-all
   ```

2. **Google Calendar API Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Calendar API
   - Create credentials (OAuth 2.0 client ID)
   - Add `http://localhost:3001/auth/google/callback` to authorized redirect URIs

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Fill in your Google API credentials
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Usage

- **Customer Interface**: `http://localhost:3000/book` (public access)
- **Team Interface**: `http://localhost:3000/team` (requires @sentry.io login)
- **Admin Interface**: `http://localhost:3000/admin` (requires @sentry.io login)
- **Team Login**: `http://localhost:3000/login`

### Authentication

Team dashboard and admin panel are protected by Google OAuth and restricted to users with @sentry.io email addresses. The authentication flow:

1. Click "Team Login" in the navigation
2. Sign in with Google using a @sentry.io email address
3. Get redirected to the team dashboard upon successful authentication
4. Access token is stored securely and automatically included in API requests

## API Endpoints

- `GET /api/slots` - Get available time slots
- `POST /api/meetings` - Book a new meeting
- `GET /api/meetings/pending` - Get pending meetings for team selection
- `POST /api/meetings/:id/assign` - Assign team member to meeting
- `GET /api/team-members` - Get all team members
- `POST /api/team-members` - Add new team member