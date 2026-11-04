# Student Management Dashboard

A full-stack student records system: a Next.js dashboard talking to a
Python/FastAPI backend over a SQLite database. Students, courses, enrolments,
grades and attendance, with a charted analytics view over the whole thing.

This project is self-contained and unrelated to the Agentic Chat app in the
parent folder — it has its own backend, frontend and database.

## Architecture

```
frontend/ (Next.js 14 App Router, TypeScript, Tailwind)
  dashboard + CRUD UI  ---HTTP--->  backend/ (FastAPI + SQLAlchemy + SQLite)
                                        |
                                        |-- app/models.py        Student / Course / Enrollment / Attendance
                                        |-- app/routers/students.py     search, filter, sort, paginate, CRUD
                                        |-- app/routers/courses.py      CRUD + per-course roll-ups
                                        |-- app/routers/enrollments.py  enrol, grade, un-enrol
                                        |-- app/routers/attendance.py   daily marks (upsert per student/day)
                                        |-- app/routers/stats.py        every dashboard aggregate in one call
                                        |-- app/queries.py       shared aggregate subqueries
                                        |-- seed.py              generates a sample school
```

### Data model

| Table | Holds | Notes |
|---|---|---|
| `students` | name, email, phone, DOB, grade level, status | email is unique |
| `courses` | code, title, department, instructor, credits | code is unique |
| `enrollments` | student ↔ course, plus the `score` (0–100) | unique per (student, course) |
| `attendance` | one mark per student per day | unique per (student, day) |

Deleting a student or a course cascades to its enrolments and attendance rows.
Foreign keys are enforced — SQLite ignores them unless `PRAGMA foreign_keys` is
switched on per connection, which `app/database.py` does.

A student's letter grade is derived from the mean of their graded enrolments
(A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F). Attendance rate counts `present` and
`late` as attended, against every mark on record.

## Prerequisites

- **Python 3.10+** — https://www.python.org/downloads/
- **Node.js 18+** (includes npm) — https://nodejs.org/

No API keys, no external services.

## Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

python seed.py             # populates a sample school (safe to skip)
uvicorn app.main:app --reload --port 8000
```

The API runs at http://localhost:8000, with interactive docs at
http://localhost:8000/docs. Tables are created automatically at startup, so the
seed step is optional — skip it to start from an empty database.

`seed.py` refuses to run twice; use `python seed.py --reset` to drop every table
and rebuild the sample data from scratch. It generates 140 students, 12 courses,
~630 enrolments and 40 school days of attendance, from a fixed random seed so
the numbers are the same on every machine.

## Frontend setup

```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. `NEXT_PUBLIC_API_URL` in `.env.local` points the UI
at the API; it defaults to `http://localhost:8000` if unset. The backend's
`CORS_ORIGIN` must match wherever the frontend runs.

## What's in the UI

- **Dashboard** — headline roll (students on roll, courses, enrolments, average
  score, attendance rate) over four charts: attendance rate across the last 14
  school days, enrolments by department, grade distribution, and headcount by
  grade level. Every chart has a table view toggle, so no value is reachable
  only by hovering or only by colour.
- **Students** — searchable, filterable, sortable, paginated table with add /
  edit / delete. Search matches name or email; filters narrow by grade level and
  status.
- **Student detail** — profile roll-up, enrolments with inline editable scores,
  enrol/un-enrol, and attendance marks. Editing a score saves on blur.
- **Courses** — every course with its enrolled headcount and mean score, filtered
  by department, with add / edit / delete.

## API reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/students` | Paginated list. Query: `search`, `grade_level`, `status`, `sort`, `order`, `page`, `page_size` |
| `POST` | `/api/students` | Create. `409` if the email is taken |
| `GET` | `/api/students/{id}` | Profile with enrolments and attendance summary |
| `PUT` | `/api/students/{id}` | Partial update — omitted fields are left alone |
| `DELETE` | `/api/students/{id}` | Delete, cascading to enrolments and attendance |
| `GET` | `/api/courses` | Courses with enrolled counts and mean scores |
| `GET` | `/api/courses/departments` | Distinct department names |
| `POST` / `PUT` / `DELETE` | `/api/courses[/{id}]` | Course CRUD. `409` on a duplicate code |
| `POST` | `/api/enrollments` | Enrol a student. `409` if already enrolled |
| `PUT` | `/api/enrollments/{id}` | Set or clear the score |
| `DELETE` | `/api/enrollments/{id}` | Un-enrol |
| `GET` | `/api/attendance` | Marks, filtered by `day` and/or `student_id` |
| `POST` | `/api/attendance` | Mark one student for one day (upsert) |
| `POST` | `/api/attendance/bulk` | Mark a whole register in one request |
| `GET` | `/api/stats` | Every dashboard aggregate. Query: `trend_days` (1–90) |

## Notes on the charts

The charts are hand-rolled inline SVG — no charting dependency. Colours come
from a validated palette defined once as CSS custom properties in
`app/globals.css`:

- A **single blue series slot** for the department, grade-level and attendance-rate
  charts, since each plots one measure.
- A **one-hue ordinal ramp** (light → dark) for the ordered A–F grade bands.
- The **reserved status palette** for attendance states, always shipped as a
  coloured dot *plus* the word, never colour alone — two of those hues sit below
  3:1 contrast on white by design.

The attendance-rate axis is anchored at 0 rather than zoomed to the data range,
so the line can't exaggerate its own variation.

## Swapping SQLite for Postgres

Set `DATABASE_URL` in `backend/.env` to a Postgres URL (e.g.
`postgresql+psycopg://user:pass@localhost/students`) and install the driver.
`app/database.py` only applies the SQLite-specific connect args and foreign-key
pragma when the URL is a SQLite one, so nothing else needs changing. The schema
is created from the models at startup; there are no migrations.
