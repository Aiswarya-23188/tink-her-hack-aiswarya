const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.db');

// Ensure backend folder exists and DB file created
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '');
}

const db = new sqlite3.Database(DB_PATH);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mood TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_program (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id TEXT,
    day INTEGER,
    completed TEXT,
    started_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS streak (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current INTEGER DEFAULT 0,
    last_checkin_date TEXT
  )`);

  // Ensure single row for streak exists
  db.get('SELECT COUNT(*) AS cnt FROM streak', (err, row) => {
    if (err) return console.error(err);
    if (row.cnt === 0) {
      db.run('INSERT INTO streak(id,current,last_checkin_date) VALUES (1,0,NULL)');
    }
  });
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simple programs definitions (same as frontend)
const programs = {
  gratitude: {
    title: 'Gratitude Reset',
    days: [
      'Write down 3 things you are grateful for today.',
      'Send a thank-you note or message to someone.',
      'Take 5 minutes to notice small positive moments.',
      'List 5 things you like about yourself.',
      'Pay attention to nature for 10 minutes.',
      'Share one gratitude with a friend or journal it.',
      'Reflect on the week and pick your favorite moment.'
    ]
  },
  stress: {
    title: 'Stress Detox',
    days: [
      'Try a 5-minute progressive muscle relaxation.',
      'Take a mindful 10-minute walk without your phone.',
      'Declutter one small area (desk, drawer).',
      'Write down 3 stress triggers and one coping step.',
      'Practice 4-7-8 breathing for 5 minutes.',
      'Do a calming activity you enjoy (read, tea).',
      'Make a simple plan for tomorrow to reduce worry.'
    ]
  },
  confidence: {
    title: 'Building Confidence',
    days: [
      'Write one recent accomplishment you are proud of.',
      'Do a small act outside your comfort zone.',
      'List your top strengths and how you use them.',
      'Practice a 2-minute power posture and positive affirmations.',
      'Teach or explain something you know to another person.',
      'Do something kind for yourself and notice it.',
      'Plan a next step toward a personal goal and take action.'
    ]
  }
};

// ---------- Mood endpoints ----------
app.get('/api/moods', (req, res) => {
  db.all('SELECT * FROM moods ORDER BY id DESC LIMIT 100', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/moods', (req, res) => {
  const { mood, timestamp, date } = req.body;
  if (!mood || !timestamp || !date) return res.status(400).json({ error: 'Missing fields' });

  // Insert mood
  db.run('INSERT INTO moods(mood,timestamp,date) VALUES (?,?,?)', [mood, timestamp, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Update streak
    updateStreak(date, (err, streak) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, mood, timestamp, date, streak });
    });
  });
});

// ---------- Journal endpoints ----------
app.get('/api/journals', (req, res) => {
  db.all('SELECT * FROM journals ORDER BY id DESC LIMIT 100', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/journals', (req, res) => {
  const { text, timestamp, date } = req.body;
  if (!text || !timestamp || !date) return res.status(400).json({ error: 'Missing fields' });

  db.run('INSERT INTO journals(text,timestamp,date) VALUES (?,?,?)', [text, timestamp, date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, text, timestamp, date });
  });
});

// ---------- Programs endpoints ----------
app.get('/api/programs', (req, res) => {
  res.json(programs);
});

app.get('/api/userprogram', (req, res) => {
  db.get('SELECT * FROM user_program ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ id: null, day: 0, completed: [] });
    row.completed = row.completed ? JSON.parse(row.completed) : [];
    res.json(row);
  });
});

app.post('/api/userprogram', (req, res) => {
  const { program_id, day, completed } = req.body;
  if (!program_id) return res.status(400).json({ error: 'Missing program_id' });

  const now = new Date().toISOString();
  const completedStr = JSON.stringify(completed || []);

  // insert as latest state (simple approach)
  db.run('INSERT INTO user_program(program_id,day,completed,started_at) VALUES (?,?,?,?)', [program_id, day || 1, completedStr, now], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, program_id, day: day || 1, completed });
  });
});

// ---------- Streak endpoint (read-only) ----------
app.get('/api/streak', (req, res) => {
  db.get('SELECT current,last_checkin_date FROM streak WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { current: 0, last_checkin_date: null });
  });
});

// Clear all data ----------
app.post('/api/clear', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM moods');
    db.run('DELETE FROM journals');
    db.run('DELETE FROM user_program');
    db.run('UPDATE streak SET current = 0, last_checkin_date = NULL WHERE id = 1');
    res.json({ ok: true });
  });
});

// Helper: update streak logic similar to frontend
function updateStreak(todayDateStr, cb) {
  db.get('SELECT current, last_checkin_date FROM streak WHERE id = 1', (err, row) => {
    if (err) return cb(err);

    const current = row ? row.current : 0;
    const last = row ? row.last_checkin_date : null;

    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let nextCurrent;
    if (last === todayDateStr) {
      nextCurrent = current;
    } else if (last === yesterday) {
      nextCurrent = current + 1;
    } else {
      nextCurrent = 1;
    }

    db.run('UPDATE streak SET current = ?, last_checkin_date = ? WHERE id = 1', [nextCurrent, todayDateStr], function(err) {
      if (err) return cb(err);
      cb(null, { current: nextCurrent, last_checkin_date: todayDateStr });
    });
  });
}

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GentleMind backend running on port ${PORT}`);
});
