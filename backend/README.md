npm startGentleMind Backend (Express + SQLite)

Setup

1. Ensure Node.js is installed.
2. From the `backend` directory, install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

Server runs on port 4000 by default.

API Endpoints

**Moods**
- `GET /api/moods` - Retrieve all mood check-ins
- `POST /api/moods` - Save a mood check-in
  ```json
  { "mood": "amazing", "timestamp": "2/21/2026, ...", "date": "2/21/2026" }
  ```

**Journals**
- `GET /api/journals` - Retrieve all journal entries
- `POST /api/journals` - Save a journal entry
  ```json
  { "text": "...", "timestamp": "2/21/2026, ...", "date": "2/21/2026" }
  ```

**Programs**
- `GET /api/programs` - Retrieve all program definitions
- `GET /api/userprogram` - Retrieve user's current program progress
- `POST /api/userprogram` - Save/update program progress
  ```json
  { "program_id": "gratitude", "day": 1, "completed": [1] }
  ```

**Streak**
- `GET /api/streak` - Retrieve current streak data

**Data Management**
- `POST /api/clear` - Clear all data (use with caution)

Notes

- SQLite database stored at `backend/database.db`
- Client-side features (affirmations, breathing, small-step suggestions) remain on frontend
- Streak is calculated server-side on each mood check-in
