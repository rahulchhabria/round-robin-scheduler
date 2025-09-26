const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const ALLOWED_DOMAIN = 'sentry.io';

class AuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:3001/auth/login/callback'
    );
  }

  // Generate OAuth URL for login
  getLoginUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar'
    ];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Handle OAuth callback
  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      const user = userInfo.data;
      
      // Check if user is from allowed domain
      if (!user.email || !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        throw new Error(`Access denied. Only ${ALLOWED_DOMAIN} email addresses are allowed.`);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          email: user.email,
          name: user.name,
          picture: user.picture,
          googleTokens: tokens
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        token,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Middleware to protect routes
  requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = this.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Check domain again in case JWT was compromised
    if (!decoded.email || !decoded.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.user = decoded;
    next();
  }
}

module.exports = AuthService;