# FitTrack360

A production-ready fitness management platform featuring a Flask backend, MySQL + MongoDB storage, and a responsive HTML/CSS/JavaScript dashboard frontend. The system combines secure authentication, QR-based attendance, AI-powered posture tracking, and an Indian diet planning module, making it a full-stack final-year project that is ready for deployment on Vercel (frontend) and any Python-friendly host (backend).

## Key Features

- **Secure Auth Flow** – JWT-based login with face detection gating.
- **Attendance Management** – QR code check-in/out with timestamps stored in MySQL.
- **Analytics Board** – Real-time database status, user totals, attendance trends, posture summaries, and exportable CSV reports.
- **AI Posture Analysis** – Live MoveNet pose tracking for hand raises and sit-ups, real-time skeleton overlay, posture scoring, and feedback; logs stored in MongoDB.
- **Progress Dashboards** – Daily, weekly, and monthly charts for performance and calorie estimates.
- **Indian Diet Planner** – Activity-aware vegetarian & non-vegetarian plans with macro tables.
- **Persistent Chatbot** – 24×7 sidebar assistant for diet, macros, and workout questions.
- **Dark/Light Themes** – Modern, animated, responsive UI optimized for desktop and mobile.

## Project Structure

```
backend/
  app.py
  config.py
  extensions.py
  models/
  routes/
  utils/
  requirements.txt
frontend/
  index.html
  assets/
    css/styles.css
    js/app.js
```

## Getting Started

### Backend

1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Provide environment variables (see `backend/config.py` for defaults) to point to your MySQL and MongoDB instances.
4. Initialize the database tables:
   ```bash
   cd backend
   flask db init
   flask db migrate -m "init"
   flask db upgrade
   ```
5. Run the server:
   ```bash
   flask run --app backend.app --debug
   ```

### Frontend

Serve the static frontend via any web server or Vercel:

```bash
cd frontend
python -m http.server 5173
```

Set `window.APP_API_BASE` in `index.html` (or inject at runtime) to point to the Flask API if it is hosted on a different domain.

## Deployment Notes

- Deploy the **frontend** to Vercel using the provided production command (`vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-6662a1b3`).
- Host the **backend** on a Python-compatible platform (e.g., Railway, Render, EC2) with access to MySQL and MongoDB.
- Update CORS origins via the `FRONTEND_ORIGIN` environment variable.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `SECRET_KEY` | Flask secret key | `super-secret-key` |
| `JWT_SECRET_KEY` | JWT signing key | `jwt-secret-key` |
| `DATABASE_URL` | SQLAlchemy MySQL URL | `mysql+pymysql://fitness_user:fitness_pass@localhost:3306/fitness_db` |
| `MONGO_URI` | Mongo connection string | `mongodb://localhost:27017/fitness_analytics` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## API Overview

- `POST /api/auth/register` – Create user.
- `POST /api/auth/login` – Authenticate and retrieve JWT.
- `GET /api/auth/me` – Current profile.
- `POST /api/attendance/generate-qr` – Generate QR payload + image.
- `POST /api/attendance/log` – Log check-in/out.
- `GET /api/attendance/history/<user_id>` – Attendance timeline.
- `GET /api/analytics/dashboard` – Analytics snapshot.
- `GET /api/analytics/export/attendance` – CSV report.
- `GET /api/diet/plans` – Diet plan & macros.
- `POST /api/posture/session` – Store posture analysis.
- `GET /api/posture/history/<user_id>` – Posture history.
- `POST /api/chatbot/ask` – Chatbot prompt.

## Tech Stack

- **Backend:** Flask, SQLAlchemy, JWT, PyMongo, Flask-Migrate
- **Databases:** MySQL (core data), MongoDB (analytics & posture frames)
- **Frontend:** Vanilla JS, Chart.js, FaceDetector API / face-api.js, TensorFlow.js MoveNet, responsive CSS
- **Utilities:** qrcode, MoveNet pose detection, responsive UI toolkit

## License

MIT
