// ============= STATE & DATA =============
let currentMood = null;
let moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];
let journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
let streakData = JSON.parse(localStorage.getItem('streakData')) || { current: 0, lastCheckInDate: null };

// Backend integration toggle and base URL
const USE_BACKEND = true;
const API_BASE = 'http://localhost:4000/api';

async function saveMoodToBackend(moodObj) {
    if (!USE_BACKEND) return;
    try {
        await fetch(`${API_BASE}/moods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(moodObj)
        });
        const res = await fetch(`${API_BASE}/streak`);
        if (res.ok) {
            const s = await res.json();
            streakData = { current: s.current || 0, lastCheckInDate: s.last_checkin_date || s.lastCheckInDate || null };
            localStorage.setItem('streakData', JSON.stringify(streakData));
            updateStreakDisplay();
        }
    } catch (e) {
        // network error: keep local state
    }
}

async function saveJournalToBackend(entry) {
    if (!USE_BACKEND) return;
    try {
        await fetch(`${API_BASE}/journals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
    } catch (e) {
        // ignore network errors
    }
}

async function initBackendSync() {
    if (!USE_BACKEND) return;
    try {
        const [progRes, userProgRes, streakRes] = await Promise.all([
            fetch(`${API_BASE}/programs`),
            fetch(`${API_BASE}/userprogram`),
            fetch(`${API_BASE}/streak`)
        ]);

        if (progRes.ok) {
            const progs = await progRes.json();
            if (progs && Object.keys(progs).length) Object.assign(programs, progs);
        }

        if (userProgRes.ok) {
            const up = await userProgRes.json();
            if (up && up.program_id) {
                userProgram = { id: up.program_id, day: up.day || 1, completed: up.completed || [] };
                localStorage.setItem('userProgram', JSON.stringify(userProgram));
                renderProgram();
            }
        }

        if (streakRes.ok) {
            const s = await streakRes.json();
            if (s) {
                streakData = { current: s.current || 0, lastCheckInDate: s.last_checkin_date || s.lastCheckInDate || null };
                localStorage.setItem('streakData', JSON.stringify(streakData));
                updateStreakDisplay();
            }
        }
    } catch (e) {
        // silent
    }
}

// Affirmations pool
const affirmations = [
    "You are stronger than you think.",
    "This moment is temporary, but you are stronger.",
    "Your feelings are valid, and you will get through this.",
    "Be kind to yourself, you deserve it.",
    "You are enough, exactly as you are.",
    "Every small step forward is progress.",
    "Your presence matters in this world.",
    "You have overcome 100% of your worst days.",
    "Breathe. You are doing the best you can.",
    "You are worthy of love and respect.",
    "This too shall pass.",
    "Your potential is limitless.",
    "Focus on what you can control today.",
    "You are brave for facing your feelings.",
    "Growth happens outside your comfort zone."
];

// Small things to do by mood
const smallThingsSuggestions = {
    amazing: [
        "🌟 Share your happiness with someone today",
        "🎵 Listen to your favorite song and dance",
        "📸 Capture a moment that made you smile",
        "💝 Do something kind for someone else"
    ],
    good: [
        "🚶 Take a 10-minute walk outside",
        "☕ Enjoy your favorite beverage mindfully",
        "📚 Read one page of something you enjoy",
        "🎨 Do a quick creative activity"
    ],
    okay: [
        "💧 Drink a glass of water",
        "🧘 Try a 5-minute meditation",
        "📝 Write down 3 things you're grateful for",
        "🎵 Listen to calm music"
    ],
    sad: [
        "🤗 Send a message to someone you care about",
        "🛁 Take care of yourself with a warm shower",
        "🍎 Eat something nourishing and healthy",
        "📞 Reach out to a trusted friend or family"
    ],
    anxious: [
        "🪴 Water a plant or touch something natural",
        "✍️ Jot down your worries to get them out",
        "🧊 Hold ice cubes to ground yourself",
        "🔇 Turn off notifications for 10 minutes"
    ]
};

// ============= GUIDED PROGRAMS DATA =============
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

// Program runtime state (persisted)
let userProgram = JSON.parse(localStorage.getItem('userProgram')) || { id: null, day: 0, completed: [] };

// ============= DOM ELEMENTS =============
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const moodBtns = document.querySelectorAll('.mood-btn');
const saveMoodBtn = document.getElementById('save-mood');
const moodDescription = document.getElementById('mood-description');
const moodSuggestion = document.getElementById('mood-suggestion');

const journalText = document.getElementById('journal-text');
const charCount = document.getElementById('char-count');
const saveJournalBtn = document.getElementById('save-journal');
const journalList = document.getElementById('journal-list');

const getAffirmationBtn = document.getElementById('get-affirmation');
const affirmationText = document.getElementById('affirmation-text');

const startBreathingBtn = document.getElementById('start-breathing');
const breathingCircle = document.getElementById('breathing-circle');
const breathingText = document.getElementById('breathing-text');

const getSuggestionBtn = document.getElementById('get-suggestion');
const suggestionText = document.getElementById('suggestion-text');
const smallThingMood = document.getElementById('small-thing-mood');

const clearDataBtn = document.getElementById('clear-data');
const totalCheckinsEl = document.getElementById('total-checkins');
const mostCommonMoodEl = document.getElementById('most-common-mood');
const totalEntriesEl = document.getElementById('total-entries');
const streakCountEl = document.getElementById('streak-count');

// ============= TAB NAVIGATION =============
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    tabContents.forEach(tab => tab.classList.remove('active'));
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update history chart when switching to history tab
    if (tabName === 'history') {
        updateHistoryStats();
        drawMoodChart();
    }

    // Render program UI when switching to programs tab
    if (tabName === 'programs') {
        renderProgram();
    }
}

// ============= MOOD CHECK-IN =============
const moodDescriptions = {
    amazing: "You're feeling amazing! That's wonderful! 🎉",
    good: "You're feeling good! Keep up that positive energy! ✨",
    okay: "You're feeling okay. That's a normal feeling. It's all good.",
    sad: "You're feeling sad. It's okay to feel this way. You're not alone. 💙",
    anxious: "You're feeling anxious. Take a deep breath, you'll get through this. 🫂"
};

moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        moodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMood = btn.getAttribute('data-mood');
        moodDescription.textContent = moodDescriptions[currentMood];
        applyMoodTheme(currentMood);
    });
});

function applyMoodTheme(mood) {
    document.body.className = '';
    if (mood) {
        document.body.classList.add(`mood-${mood}`);
        
        // Apply low-energy mode for sad and anxious moods
        if (mood === 'sad' || mood === 'anxious') {
            document.body.classList.add('low-energy');
            // Hide history and dump tabs, auto-switch to a simpler tab if needed
            const currentTab = document.querySelector('.tab-content.active');
            if (currentTab && (currentTab.id === 'history' || currentTab.id === 'overthinking')) {
                switchTab('affirmations');
            }
        } else {
            document.body.classList.remove('low-energy');
        }
    }
}

saveMoodBtn.addEventListener('click', () => {
    if (!currentMood) {
        alert('Please select a mood first!');
        return;
    }

    const timestamp = new Date().toLocaleString();
    const today = new Date().toDateString();
    
    moodHistory.push({
        mood: currentMood,
        timestamp: timestamp,
        date: today
    });

    // Update streak
    updateStreak(today);

    localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
    localStorage.setItem('streakData', JSON.stringify(streakData));
    // Try saving to backend (non-blocking)
    saveMoodToBackend({ mood: currentMood, timestamp, date: today });
    
    moodSuggestion.textContent = `✅ Mood saved! 🔥 Streak: ${streakData.current} days`;

    setTimeout(() => {
        moodSuggestion.textContent = '';
        moodDescription.textContent = '';
        updateStreakDisplay();
    }, 3000);
});

// ============= JOURNAL =============
journalText.addEventListener('input', () => {
    charCount.textContent = journalText.value.length;
});

saveJournalBtn.addEventListener('click', () => {
    if (journalText.value.trim() === '') {
        alert('Please write something in your journal!');
        return;
    }

    const entry = {
        text: journalText.value,
        timestamp: new Date().toLocaleString(),
        date: new Date().toLocaleDateString()
    };

    journalEntries.unshift(entry);
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));

    // Try saving journal to backend (non-blocking)
    saveJournalToBackend(entry);

    journalText.value = '';
    charCount.textContent = '0';
    displayJournalEntries();

    showNotification(saveJournalBtn, 'Entry saved! 📝');
});

function displayJournalEntries() {
    journalList.innerHTML = '';
    journalEntries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-item';
        entryDiv.innerHTML = `
            <div class="entry-date">${entry.timestamp}</div>
            <div class="entry-text">${escapeHtml(entry.text)}</div>
        `;
        journalList.appendChild(entryDiv);
    });
}

// Display on load
displayJournalEntries();
// Initialize backend sync (if enabled)
initBackendSync();

// Clear all local data and notify backend
clearDataBtn.addEventListener('click', async () => {
    if (!confirm('Clear all local data? This cannot be undone.')) return;
    moodHistory = [];
    journalEntries = [];
    userProgram = { id: null, day: 0, completed: [] };
    streakData = { current: 0, lastCheckInDate: null };
    localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));
    localStorage.setItem('userProgram', JSON.stringify(userProgram));
    localStorage.setItem('streakData', JSON.stringify(streakData));
    displayJournalEntries();
    updateStreakDisplay();
    try {
        if (USE_BACKEND) await fetch(`${API_BASE}/clear`, { method: 'POST' });
    } catch (e) {}
});

// ============= AFFIRMATIONS =============
getAffirmationBtn.addEventListener('click', () => {
    const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    affirmationText.textContent = randomAffirmation;
});

// ============= BREATHING EXERCISE =============
let isBreathing = false;

startBreathingBtn.addEventListener('click', () => {
    if (isBreathing) {
        stopBreathing();
    } else {
        startBreathing();
    }
});

function startBreathing() {
    isBreathing = true;
    breathingCircle.classList.add('breathing');
    startBreathingBtn.textContent = 'Stop Exercise';
    breathingText.textContent = 'Take slow, deep breaths...';

    let step = 0;
    const steps = ['Breathe in...', 'Hold...', 'Breathe out...'];
    const durations = [4000, 7000, 8000]; // 4s in, 7s hold, 8s out

    const breathingInterval = setInterval(() => {
        step = (step + 1) % 3;
        breathingText.textContent = steps[step];
    }, 4000 + 7000 + 8000);

    // Stop after 5 minutes (5 cycles)
    setTimeout(() => {
        stopBreathing();
        clearInterval(breathingInterval);
    }, 320000);
}

function stopBreathing() {
    isBreathing = false;
    breathingCircle.classList.remove('breathing');
    startBreathingBtn.textContent = 'Start Exercise';
    breathingText.textContent = 'Great job! You did it! 🙏';
}

// ============= SMALL THING TO DO =============
getSuggestionBtn.addEventListener('click', () => {
    if (!currentMood) {
        suggestionText.textContent = 'Please select a mood first in the Mood Check tab!';
        smallThingMood.textContent = '';
        return;
    }

    const suggestions = smallThingsSuggestions[currentMood];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    smallThingMood.textContent = `💡 For your ${currentMood} mood:`;
    suggestionText.textContent = randomSuggestion;
});

// ============= GUIDED PROGRAMS LOGIC & UI =============
const programOptions = document.querySelectorAll('.program-option');
const programTitleEl = document.getElementById('program-title');
const programProgressEl = document.getElementById('program-progress');
const progFillEl = document.getElementById('prog-fill');
const progTextEl = document.getElementById('prog-text');
const programDayEl = document.getElementById('program-day');
const dayTitleEl = document.getElementById('day-title');
const dayTaskEl = document.getElementById('day-task');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const markDoneBtn = document.getElementById('mark-done');
const exitProgramBtn = document.getElementById('exit-program');

programOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-program');
        startProgram(id);
    });
});

function startProgram(id) {
    if (!programs[id]) return;
    userProgram.id = id;
    if (!userProgram.day || userProgram.day < 1) userProgram.day = 1;
    if (!Array.isArray(userProgram.completed)) userProgram.completed = [];
    localStorage.setItem('userProgram', JSON.stringify(userProgram));
    renderProgram();
}

function renderProgram() {
    if (!userProgram.id) {
        programTitleEl.textContent = 'Choose a program to begin';
        programProgressEl.style.display = 'none';
        programDayEl.style.display = 'none';
        return;
    }

    const prog = programs[userProgram.id];
    programTitleEl.textContent = prog.title;
    programProgressEl.style.display = 'flex';
    programDayEl.style.display = 'block';

    const dayIndex = Math.min(Math.max(userProgram.day, 1), prog.days.length);
    dayTitleEl.textContent = `Day ${dayIndex}`;
    dayTaskEl.textContent = prog.days[dayIndex - 1];

    const percent = Math.round((dayIndex - 1) / prog.days.length * 100);
    progFillEl.style.width = `${percent}%`;
    progTextEl.textContent = `Day ${dayIndex} / ${prog.days.length}`;

    // update mark-done state
    if (userProgram.completed.includes(dayIndex)) {
        markDoneBtn.textContent = 'Completed ✓';
        markDoneBtn.disabled = true;
    } else {
        markDoneBtn.textContent = 'Mark Done';
        markDoneBtn.disabled = false;
    }
}

prevDayBtn.addEventListener('click', () => {
    if (!userProgram.id) return;
    if (userProgram.day > 1) {
        userProgram.day -= 1;
        localStorage.setItem('userProgram', JSON.stringify(userProgram));
        renderProgram();
    }
});

nextDayBtn.addEventListener('click', () => {
    if (!userProgram.id) return;
    const len = programs[userProgram.id].days.length;
    if (userProgram.day < len) {
        userProgram.day += 1;
        localStorage.setItem('userProgram', JSON.stringify(userProgram));
        renderProgram();
    }
});

markDoneBtn.addEventListener('click', () => {
    if (!userProgram.id) return;
    const dayIndex = userProgram.day;
    if (!userProgram.completed.includes(dayIndex)) {
        userProgram.completed.push(dayIndex);
        // auto-advance if not last
        const len = programs[userProgram.id].days.length;
        if (userProgram.day < len) userProgram.day += 1;
        localStorage.setItem('userProgram', JSON.stringify(userProgram));
        renderProgram();
    }
});

exitProgramBtn.addEventListener('click', () => {
    userProgram = { id: null, day: 0, completed: [] };
    localStorage.setItem('userProgram', JSON.stringify(userProgram));
    renderProgram();
});

// Initialize program UI from saved state
renderProgram();

// ============= MOOD HISTORY & CHART =============
function updateHistoryStats() {
    totalCheckinsEl.textContent = moodHistory.length;
    totalEntriesEl.textContent = journalEntries.length;

    // Find most common mood
    if (moodHistory.length > 0) {
        const moodCounts = {};
        moodHistory.forEach(record => {
            moodCounts[record.mood] = (moodCounts[record.mood] || 0) + 1;
        });

        const moodEmojis = {
            amazing: '😄',
            good: '🙂',
            okay: '😐',
            sad: '😔',
            anxious: '😰'
        };

        const mostCommon = Object.keys(moodCounts).reduce((a, b) =>
            moodCounts[a] > moodCounts[b] ? a : b
        );

        mostCommonMoodEl.textContent = moodEmojis[mostCommon];
    }
}

function drawMoodChart() {
    const canvas = document.getElementById('mood-chart');
    const ctx = canvas.getContext('2d');

    // Get mood counts from last 7 days
    const moodCounts = {
        amazing: 0,
        good: 0,
        okay: 0,
        sad: 0,
        anxious: 0
    };

    moodHistory.forEach(record => {
        moodCounts[record.mood]++;
    });

    // Simple bar chart
    const moodLabels = ['Amazing', 'Good', 'Okay', 'Sad', 'Anxious'];
    const moodValues = [moodCounts.amazing, moodCounts.good, moodCounts.okay, moodCounts.sad, moodCounts.anxious];
    const moodColors = ['#fdcb6e', '#55efc4', '#74b9ff', '#6c5ce7', '#fd79a8'];

    // Clear canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    const maxValue = Math.max(...moodValues, 1);
    const barWidth = canvas.width / moodLabels.length;
    const padding = 40;

    // Draw bars
    moodValues.forEach((value, index) => {
        const barHeight = (value / maxValue) * (canvas.height - padding * 2);
        const x = index * barWidth + barWidth / 4;
        const y = canvas.height - padding - barHeight;

        // Bar
        ctx.fillStyle = moodColors[index];
        ctx.fillRect(x, y, barWidth / 2, barHeight);

        // Label
        ctx.fillStyle = '#2d3436';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(moodLabels[index], x + barWidth / 4, canvas.height - 10);

        // Value
        ctx.fillText(value, x + barWidth / 4, y - 5);
    });
}

clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        moodHistory = [];
        journalEntries = [];
        streakData = { current: 0, lastCheckInDate: null };
        localStorage.clear();
        location.reload();
    }
});

// ============= UTILITY FUNCTIONS =============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(element, message) {
    const originalText = element.textContent;
    element.textContent = message;
    setTimeout(() => {
        element.textContent = originalText;
    }, 2000);
}

// ============= STREAK FUNCTIONS =============
function updateStreak(today) {
    const lastCheckInDate = streakData.lastCheckInDate;
    const yesterday = new Date(Date.now() - 86400000).toDateString(); // 24 hours ago
    
    if (lastCheckInDate === today) {
        // Already checked in today, don't increment
        return;
    } else if (lastCheckInDate === yesterday) {
        // Checked in yesterday, increment streak
        streakData.current += 1;
    } else {
        // Either first check-in or missed a day, reset to 1
        streakData.current = 1;
    }
    
    streakData.lastCheckInDate = today;
}

function updateStreakDisplay() {
    if (streakCountEl) {
        streakCountEl.textContent = streakData.current;
    }
}

// ============= INITIALIZATION =============
console.log('🌙 GentleMind app loaded successfully!');
updateHistoryStats();
updateStreakDisplay();
