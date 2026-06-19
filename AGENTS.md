# AGENTS.md

## Project Overview

AI Clinic Management SaaS — a full-stack clinic management system with AI-powered symptom checking, appointment scheduling, patient records, and prescription management.

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **Backend**: Node.js + Express + MongoDB (Mongoose) with JWT auth
- **AI Service**: Python FastAPI microservice (X-ray analysis)
- **Testing**: Vitest (frontend), Jest + supertest (backend)

## Setup Commands

```bash
# One-command dev (starts backend + frontend concurrently)
npm install              # Also runs install:all for sub-projects
npm run dev              # Backend :5000 + Frontend :5173

# Or run individually:
# Backend
cd backend
npm install
# Requires .env with MONGO_URI, JWT_SECRET, GROQ_API_KEY, GEMINI_API_KEY
npm run dev        # Start dev server (nodemon)
npm start          # Production start

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server (port 5173)

# AI Python service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

## Testing Instructions

### Backend (Jest, 37 suites, ~460 tests)
```bash
cd backend
npm test                   # jest --runInBand --forceExit
npm run test:watch         # Watch mode
npx jest -t "test name"    # Run single test by name pattern
npx jest tests/services/authService.test.js  # Single file
```
- All tests live in `backend/tests/` organized by type (`models/`, `controllers/`, `services/`, `integration/`, `middleware/`, `utils/`)
- Uses `mongodb-memory-server` — no external DB needed
- Run `--runInBand` to avoid MongoMemoryServer port conflicts

### Frontend (Vitest, 25 suites, ~282 tests)
```bash
cd frontend
npm test                          # vitest run (single run)
npm run test:watch                # Watch mode
npx vitest run --reporter verbose # Full test names
npx vitest run -t "renders page"  # Run matching tests
```
- Tests mirror source structure in `frontend/src/__tests__/`
- `getByRole('heading', …)` for page headings (avoids sidebar collisions)
- `getAllByText` for elements that appear multiple times
- Uses `jsdom` environment with `@testing-library/jest-dom` matchers

### E2E Smoke Test (Node.js, cross-platform)
```bash
node test-e2e.js                        # Default: http://localhost:5000
BASE_URL=https://myapp.com node test-e2e.js  # Custom URL
```
- Standalone script (no test framework) — requires a running backend
- Tests the full API flow: health, auth, patients, appointments, prescriptions, AI endpoints, PDF download
- Exit code 0 = all passed, 1 = any failure

### Python AI Service (pytest, 5 suites, ~46 tests)
```bash
cd ai-service
pip install -r requirements.txt
pytest                     # Run all tests
pytest -v                  # Verbose
pytest tests/test_keyword_triage.py -v  # Single file
```
- Tests in `ai-service/tests/`: health endpoint, keyword triage, triage router, drug checker, auth middleware
- `conftest.py` mocks heavy ML deps (torch, transformers) — tests run without GPU
- Requires Python 3.10+; `pip install -r requirements.txt` first

## Development Workflow

- Every `git commit` auto-pushes to origin (post-commit hook)
- Lint before commit: `cd frontend && npm run lint` (ESLint, zero warnings)
- Backend runs on port 5000, frontend on 5173 (proxied to backend)
- Environment variables: see `.env.example` in backend/

## Code Style

- **Frontend**: JSX files, no automatic JSX transform — always `import React from 'react'`
- **Backend**: CommonJS (`require`/`module.exports`), Express middleware pattern
- **CSS**: Tailwind utility classes, no separate CSS files
- **Imports**: Group by external → internal, separate by blank line

## Build and Deployment

- Frontend build: `cd frontend && npm run build` → outputs to `frontend/dist/`
- Backend: `cd backend && npm start` (or deploy to Railway/Render)
- AI service: Docker container with Python FastAPI + Groq SDK
- See DEPLOYMENT.md for full deployment guide

## AI Service — API Endpoints (Python FastAPI, port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/analyze/triage` | POST | Symptom triage (keyword + BioBERT) |
| `/api/v1/analyze/ner` | POST | Medical entity extraction from clinical text |
| `/api/v1/analyze/interactions` | POST | Drug-drug interaction checker |
| `/api/v1/analyze/contraindications` | POST | Allergy + disease contraindication checker |
| `/api/v1/analyze/assessment` | POST | Unified patient assessment (triage + risk + contraindications) |
| `/api/v1/analyze/xray` | POST | Chest X-ray analysis (DenseNet121) |
| `/api/v1/analyze/xray/finetune` | POST | Admin: trigger X-ray model fine-tuning |
| `/api/v1/analyze/xray/use-finetuned` | POST | Admin: toggle fine-tuned / ImageNet model |
| `/api/v1/analyze/risk` | POST | Health risk prediction (XGBoost) |

### New AI Features (added June 2026)
- **Medical NER** (`app/ner/`): Extracts diseases, medications, dosages, allergens, symptoms from clinical text using BioBERT NER (`brad1141/biobert-finetuned-ner`) with regex fallback via `app/ner/patterns.py`.
- **Contraindication Checker** (`app/drugs/contraindications.py`): Checks drug-allergy and drug-disease conflicts with severity levels (`contraindicated` / `caution`).
- **Unified Assessment** (`app/assessment/assessor.py`): Orchestrates triage + risk + contraindications into a single combined assessment with summary and recommendations.
- **X-Ray Fine-Tuning** (`app/xray/finetune.py`): CLI and HTTP-triggerable pipeline to fine-tune DenseNet121 on CheXpert/NIH datasets. Saves checkpoints to `app/xray/checkpoints/`.

## Additional Notes

- CRLF line endings on Windows (Git auto-converts)
- `property.invariant.test.js` uses `fast-check` — known flaky, retry if it fails
- Backend rate limiters disabled when `NODE_ENV=test`
- `.env` is gitignored; `.env.example` has the schema
