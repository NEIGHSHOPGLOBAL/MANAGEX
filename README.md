# ManageX

A lightweight Team Planner & Task Management PWA built with **React** and **Flask**.

## Features

- JWT authentication with Employee ID login
- Role-based hierarchy: Super Admin → Admin → COO → Branch Manager → Employee
- Three task types: Personal, Normal, and Project (with verification workflow)
- Project management with members and progress tracking
- Dashboard with stats, charts, and recent activity
- Calendar planner for task deadlines and project milestones
- Task comments, checklist, image/PDF uploads (max 5 MB)
- Geolocation tracking on task completion (office vs outside)
- Late completion tracking
- Notifications, activity logs, and storage management (Super Admin)
- Installable PWA with offline shell support

## Quick Start

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5001` and seeds demo data on first launch.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### 3. PostgreSQL (optional)

By default the app uses SQLite. For PostgreSQL:

```bash
docker compose up -d
cp backend/.env.example backend/.env
# Then restart the backend
```

## Installable Desktop App (DMG / EXE)

ManageX can be packaged as a **native desktop app** with a bundled backend — no separate Python/Node setup needed after install.

### macOS — DMG (already built on this machine)

```bash
# From project root — builds frontend + backend + DMG
npm install
npm run dist:mac
```

Installer output: `release/ManageX-1.0.0-arm64.dmg`

1. Open the DMG
2. Drag **ManageX** to Applications
3. Launch from Applications or Spotlight

**Login:** Employee ID `AX001` / password `AX001` (same for all AX00x users)

User data (database, uploads) is stored in `~/Library/Application Support/ManageX/`.

### Windows — EXE installer

Build on a **Windows PC** (cross-compiling from Mac is not supported):

```bash
npm install
npm run dist:win
```

Output: `release/ManageX Setup 1.0.0.exe` (NSIS installer with desktop shortcut)

### Linux — AppImage

```bash
npm run dist:linux
```

### Development desktop mode

```bash
npm run desktop:dev
```

Runs Electron with local Python backend (requires `backend/venv`).

---

## Demo Accounts

| Employee ID | Password       | Role           |
|-------------|----------------|----------------|
| AX001       | AX001          | Super Admin    |
| AX005       | AX005          | Employee       |

## Project Structure

```
managex/
├── backend/          # Flask REST API
│   ├── app.py        # Entry point + seed data
│   ├── models.py     # SQLAlchemy models
│   ├── routes.py     # API endpoints
│   └── utils.py      # Auth, permissions, helpers
├── frontend/         # React PWA
│   └── src/
│       ├── api/      # API client
│       ├── components/
│       └── pages/
├── docker-compose.yml
└── overview.txt      # Full specification
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/auth/login | Login |
| GET    | /api/dashboard/stats | Dashboard data |
| GET    | /api/tasks | List tasks |
| POST   | /api/tasks | Create task |
| POST   | /api/tasks/:id/verify | Verify project task |
| GET    | /api/projects | List projects |
| GET    | /api/users | List employees |
| GET    | /api/storage/usage | Storage stats (Super Admin) |

## Tech Stack

- **Frontend:** React, Tailwind CSS, React Router, Recharts, Vite PWA
- **Backend:** Python Flask, Flask-JWT-Extended, SQLAlchemy
- **Database:** SQLite (default) or PostgreSQL
