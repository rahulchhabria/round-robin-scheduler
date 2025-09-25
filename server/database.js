const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || './scheduler.db';

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Team members table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS team_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          google_calendar_id TEXT,
          is_active BOOLEAN DEFAULT 1,
          meeting_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Meetings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS meetings (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          meeting_title TEXT NOT NULL,
          meeting_description TEXT,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          status TEXT DEFAULT 'pending',
          assigned_to INTEGER,
          google_event_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES team_members (id)
        )
      `);

      // Available slots table (for defining when meetings can be booked)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS available_slots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day_of_week INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          duration_minutes INTEGER DEFAULT 30,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Insert default available slots (Monday-Friday, 9 AM - 5 PM)
      this.db.run(`
        INSERT OR IGNORE INTO available_slots (day_of_week, start_time, end_time, duration_minutes)
        VALUES 
          (1, '09:00', '17:00', 30),
          (2, '09:00', '17:00', 30),
          (3, '09:00', '17:00', 30),
          (4, '09:00', '17:00', 30),
          (5, '09:00', '17:00', 30)
      `);
    });
  }

  // Team member operations
  addTeamMember(name, email, callback) {
    const stmt = this.db.prepare("INSERT INTO team_members (name, email) VALUES (?, ?)");
    stmt.run([name, email], callback);
    stmt.finalize();
  }

  getTeamMembers(callback) {
    this.db.all("SELECT * FROM team_members WHERE is_active = 1 ORDER BY meeting_count ASC", callback);
  }

  updateMeetingCount(memberId, callback) {
    this.db.run("UPDATE team_members SET meeting_count = meeting_count + 1 WHERE id = ?", [memberId], callback);
  }

  // Meeting operations
  createMeeting(meetingData, callback) {
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, customer_name, customer_email, meeting_title, meeting_description, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      meetingData.id,
      meetingData.customerName,
      meetingData.customerEmail,
      meetingData.title,
      meetingData.description,
      meetingData.startTime,
      meetingData.endTime
    ], callback);
    stmt.finalize();
  }

  getPendingMeetings(callback) {
    this.db.all("SELECT * FROM meetings WHERE status = 'pending' ORDER BY start_time ASC", callback);
  }

  assignMeetingToMember(meetingId, memberId, callback) {
    this.db.run(
      "UPDATE meetings SET assigned_to = ?, status = 'assigned' WHERE id = ?",
      [memberId, meetingId],
      callback
    );
  }

  getMeetingById(meetingId, callback) {
    this.db.get("SELECT * FROM meetings WHERE id = ?", [meetingId], callback);
  }

  updateMeetingGoogleEventId(meetingId, eventId, callback) {
    this.db.run("UPDATE meetings SET google_event_id = ? WHERE id = ?", [eventId, meetingId], callback);
  }

  // Available slots operations
  getAvailableSlots(callback) {
    this.db.all("SELECT * FROM available_slots WHERE is_active = 1", callback);
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;