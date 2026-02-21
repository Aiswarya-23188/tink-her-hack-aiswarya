// Optional Backend Integration for GentleMind Frontend
// 
// By default, scriptss.js uses localStorage. To use the backend API instead:
// 1. Start backend: cd backend && npm start
// 2. Replace the relevant functions in scriptss.js with these API calls
// 3. Update API_BASE_URL to match your backend (default: http://localhost:4000)

const API_BASE_URL = 'http://localhost:4000/api';

// ============= MOOD API =============
async function saveMoodToBackend(mood, timestamp, date) {
  try {
    const res = await fetch(`${API_BASE_URL}/moods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, timestamp, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (err) {
    console.error('Mood save error:', err);
    throw err;
  }
}

async function getMoodsFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/moods`);
    if (!res.ok) throw new Error('Failed to fetch moods');
    return await res.json();
  } catch (err) {
    console.error('Get moods error:', err);
    return [];
  }
}

// ============= JOURNAL API =============
async function saveJournalToBackend(text, timestamp, date) {
  try {
    const res = await fetch(`${API_BASE_URL}/journals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timestamp, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (err) {
    console.error('Journal save error:', err);
    throw err;
  }
}

async function getJournalsFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/journals`);
    if (!res.ok) throw new Error('Failed to fetch journals');
    return await res.json();
  } catch (err) {
    console.error('Get journals error:', err);
    return [];
  }
}

// ============= PROGRAM API =============
async function getProgramsFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/programs`);
    if (!res.ok) throw new Error('Failed to fetch programs');
    return await res.json();
  } catch (err) {
    console.error('Get programs error:', err);
    return {};
  }
}

async function getUserProgramFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/userprogram`);
    if (!res.ok) throw new Error('Failed to fetch user program');
    return await res.json();
  } catch (err) {
    console.error('Get user program error:', err);
    return { id: null, day: 0, completed: [] };
  }
}

async function saveUserProgramToBackend(program_id, day, completed) {
  try {
    const res = await fetch(`${API_BASE_URL}/userprogram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program_id, day, completed })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  } catch (err) {
    console.error('Save program error:', err);
    throw err;
  }
}

// ============= STREAK API =============
async function getStreakFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/streak`);
    if (!res.ok) throw new Error('Failed to fetch streak');
    return await res.json();
  } catch (err) {
    console.error('Get streak error:', err);
    return { current: 0, last_checkin_date: null };
  }
}

// ============= CLEAR DATA API =============
async function clearDataFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear data');
    return await res.json();
  } catch (err) {
    console.error('Clear data error:', err);
    throw err;
  }
}

// Export for use in scriptss.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveMoodToBackend,
    getMoodsFromBackend,
    saveJournalToBackend,
    getJournalsFromBackend,
    getProgramsFromBackend,
    getUserProgramFromBackend,
    saveUserProgramToBackend,
    getStreakFromBackend,
    clearDataFromBackend
  };
}
