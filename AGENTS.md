# AGENTS.md

## Project Overview

AI Clinic Management SaaS — a full-stack medical clinic management platform with AI-powered symptom checking. Built for a hackathon.

- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6
- **Backend:** Node.js + Express 4 + Mongoose 8 (MongoDB)
- **AI:** GROQ API via `groq-sdk` (model: `llama-3.3-70b-versatile`)
- **Auth:** JWT with bcryptjs (two roles: Doctor, Receptionist)
- **Testing:** Jest + Supertest (backend), Vitest + React Testing Library (frontend)
- **Package manager:** npm (both workspaces)
- **Languages:** JavaScript (no TypeScript in source)

## Repository Structure

```
/
├── backend/          # Express API server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/     # Auth, error handling, logging
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helpers (PDF, logger, seed, etc.)
│   └── tests/             # Jest test suites
├── frontend/         # React SPA
│   └── src/
│       ├── components/    # Reusable UI + feature components
│       ├── context/       # AuthContext (React Context)
│       ├── hooks/         # Custom data-fetching hooks
│       ├── pages/         # Route pages
│       └── __tests__/     # Vitest test suites
```

## Setup Commands

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then edit .env with your values

# Frontend
cd frontend
npm install
cp .env.example .env
```

Required environment variables:

**backend/.env:** `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`, `GROQ_API_KEY`, `FRONTEND_ORIGIN`

**frontend/.env:** `VITE_API_BASE_URL`

## Seed Data

After backend setup, seed demo users:

```bash
cd backend
node src/utils/seedUsers.js
```

| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor@clinic.demo | Doctor@123 |
| Receptionist | receptionist@clinic.demo | Recept@123 |

## Development Workflow

```bash
# Start backend (watch mode with nodemon)
cd backend && npm run dev

# Start frontend (Vite dev server with HMR)
cd frontend && npm run dev
```

Backend runs on `http://localhost:5000` by default. Frontend runs on `http://localhost:5173`.

## Testing Instructions

```bash
# Backend tests (Jest)
cd backend && npm test            # run all tests
cd backend && npm run test:watch  # watch mode

# Frontend tests (Vitest)
cd frontend && npm test           # run all tests
cd frontend && npm run test:watch # watch mode
```

Backend tests live in `backend/tests/` with test files matching `*.test.js`. Frontend tests live in `frontend/src/__tests__/`.

## Code Style

- **Backend:** CommonJS (`require`/`module.exports`), plain JavaScript, no ESLint configured
- **Frontend:** ES modules (`import`/`export`), JSX, ESLint 9 with `eslint-plugin-react` and `eslint-plugin-react-hooks`
- **Lint command:** `cd frontend && npm run lint` (zero warnings required)
- **CSS:** Tailwind utility classes via `className`; custom design tokens in `tailwind.config.js`
- **Architecture pattern:** Controller → Service → Model (three-layer) on backend; hooks + context on frontend
- **Naming:** PascalCase for components, camelCase for hooks/functions/variables, lowercase-dashed for files

## Build and Deployment

```bash
# Frontend production build
cd frontend && npm run build
# Output: frontend/dist/

# Backend production start
cd backend && npm start
```

- **Frontend:** Deploy `frontend/dist/` to Vercel (Framework Preset: Vite)
- **Backend:** Deploy `backend/` to Render (Web Service, Node environment)
- **Database:** MongoDB Atlas
- **AI:** GROQ API key from console.groq.com

See `DEPLOYMENT.md` for detailed steps.

## Pull Request Guidelines

- Title format: `[backend|frontend] Brief description`
- Run both test suites before merging
- Frontend must pass `npm run lint` with zero warnings
- Keep PRs focused on a single concern

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| GET | `/api/patients` | JWT | List patients |
| POST | `/api/patients` | JWT | Create patient |
| GET | `/api/appointments` | JWT | List appointments |
| POST | `/api/appointments` | JWT | Create appointment |
| GET | `/api/prescriptions` | JWT | List prescriptions |
| POST | `/api/prescriptions` | JWT | Create prescription |
| POST | `/api/ai/symptom-checker` | JWT (Doctor) | AI diagnosis |
| GET | `/health` | No | Health check |
