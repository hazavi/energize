# EnerGize

A fitness workout planner and tracker built with Angular and Supabase. Plan weekly routines, execute workout sessions with built-in timers, and review your training history.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Testing Credentials](#testing-credentials)

---

## Features

**Weekly Workout Planner**

- Seven-day grid view with day-level zoom panels
- Add up to 10 exercises per day from a searchable exercise catalog
- Drag-and-drop reordering of exercises within each day
- Mark rest days and attach notes to any day

**Exercise Management**

- Browse exercises with GIF previews, filterable by body part and equipment
- Configure sets, reps, and weight for each exercise
- Toggle between kg and lbs per set
- Inline editing and deletion with confirmation

**Live Workout Sessions**

- Start a session for any day with a real-time elapsed timer
- Check off individual sets and exercises as you go
- Built-in rest timer with preset intervals (30s, 1m, 2m, 3m, 5m) or custom duration
- Minimize the session to a floating bar and continue browsing
- Session state persists across page reloads via local storage

**Workout History**

- Completed workouts save automatically with duration and exercise completion stats
- Monthly calendar view with activity indicators
- Aggregate stats: total workouts, total duration, average session time, most active day
- Delete individual history records

---

## Tech Stack

| Layer     | Technology                           |
| --------- | ------------------------------------ |
| Frontend  | Angular 21, TypeScript, RxJS         |
| Styling   | Custom CSS (glassmorphic dark theme) |
| Backend   | Supabase (PostgreSQL, REST API)      |
| Auth      | Supabase Auth                        |
| Drag/Drop | SortableJS                           |

---

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Supabase project with the database tables created (see [Database Setup](#database-setup))

---

## Getting Started

1. **Clone the repository**

   ```
   git clone <repository-url>
   cd EnerGize
   ```

2. **Install dependencies**

   ```
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` (or edit the existing `.env`) and fill in your Supabase credentials:

   ```
   PRODUCTION=false
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

   The build script runs `generate-env.js` automatically to write these values into `src/environments/environment.ts`.

4. **Run the database migration** (see [Database Setup](#database-setup))

5. **Start the development server**

   ```
   npm start
   ```

   The app will be available at `http://localhost:4200`.

---

## Database Setup

The application requires four tables in your Supabase PostgreSQL database. Open the SQL Editor in your Supabase Dashboard and run the following:

```sql
CREATE TABLE IF NOT EXISTS template (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  workout_id BIGINT DEFAULT NULL,
  user_uid TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templateexercise (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES template(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL,
  sets JSONB DEFAULT '[]'::jsonb,
  "order" INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES template(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_history (
  id BIGSERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL,
  day TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  duration BIGINT DEFAULT 0,
  exercises_completed INT DEFAULT 0,
  total_exercises INT DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE template ENABLE ROW LEVEL SECURITY;
ALTER TABLE templateexercise ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;

-- Permissive policies (adjust for production)
CREATE POLICY "Allow all for anon" ON template FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON templateexercise FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON workout FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON workout_history FOR ALL USING (true) WITH CHECK (true);
```

The `exercises` table should already exist and be populated with exercise data.

---

## Project Structure

```
src/
  app/
    components/
      workout/          Weekly planner, workout sessions, rest timer
      exercises/        Exercise catalog with filters and pagination
      exercise-modal/   Two-phase modal: select exercises, configure sets
      exercise-detail/  Full exercise detail view
      history/          Workout history with calendar and stats
      settings/         User settings
      auth/             Login, register, admin pages
      loading/          Shared loading spinner
      workout-modal/    Workout creation modal
    guards/             Route guards (auth, admin)
    models/             TypeScript interfaces (Template, TemplateExercise, Set, etc.)
    service/            API services (GenericService, AuthService, Supabase client)
  environments/         Runtime config generated from .env
```

---

## Available Scripts

| Command         | Description                                         |
| --------------- | --------------------------------------------------- |
| `npm start`     | Start the Angular dev server on port 4200           |
| `npm run build` | Generate environment files and build for production |
| `npm test`      | Run unit tests via Karma                            |
| `npm run watch` | Build in watch mode for development                 |

---

## Environment Variables

| Variable                    | Description                             |
| --------------------------- | --------------------------------------- |
| `PRODUCTION`                | Set to `true` for production builds     |
| `SUPABASE_URL`              | Your Supabase project URL               |
| `SUPABASE_ANON_KEY`         | Supabase anonymous/public API key       |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
