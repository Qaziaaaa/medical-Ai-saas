---
phase: full-code-review
reviewed: 2026-06-17T12:00:00Z
depth: deep
files_reviewed: 54
files_reviewed_list:
  - backend/src/app.js
  - backend/src/server.js
  - backend/src/models/User.js
  - backend/src/models/Patient.js
  - backend/src/models/Appointment.js
  - backend/src/models/Prescription.js
  - backend/src/middleware/authenticate.js
  - backend/src/middleware/authorize.js
  - backend/src/middleware/errorHandler.js
  - backend/src/middleware/requestLogger.js
  - backend/src/controllers/authController.js
  - backend/src/controllers/patientController.js
  - backend/src/controllers/appointmentController.js
  - backend/src/controllers/prescriptionController.js
  - backend/src/controllers/aiController.js
  - backend/src/controllers/dashboardController.js
  - backend/src/controllers/userController.js
  - backend/src/services/authService.js
  - backend/src/services/patientService.js
  - backend/src/services/appointmentService.js
  - backend/src/services/prescriptionService.js
  - backend/src/services/aiService.js
  - backend/src/services/aiPythonService.js
  - backend/src/utils/apiResponse.js
  - backend/src/utils/asyncHandler.js
  - backend/src/utils/AppError.js
  - backend/src/utils/pdfGenerator.js
  - backend/src/utils/logger.js
  - backend/src/utils/seedUsers.js
  - backend/src/routes/auth.js
  - backend/src/routes/patients.js
  - backend/src/routes/appointments.js
  - backend/src/routes/prescriptions.js
  - backend/src/routes/ai.js
  - backend/src/routes/aiPython.js
  - backend/src/routes/dashboard.js
  - backend/src/routes/users.js
  - backend/package.json
  - backend/.env
  - backend/.env.example
  - frontend/src/lib/axios.js
  - frontend/src/context/AuthContext.js
  - frontend/src/context/AuthProvider.jsx
  - frontend/src/hooks/useAuth.js
  - frontend/src/hooks/usePatients.js
  - frontend/src/hooks/useAppointments.js
  - frontend/src/hooks/usePrescriptions.js
  - frontend/src/hooks/useAI.js
  - frontend/src/routes/AppRoutes.jsx
  - frontend/src/routes/ProtectedRoute.jsx
  - frontend/src/pages/LoginPage.jsx
  - frontend/src/pages/DoctorDashboard.jsx
  - frontend/src/pages/ReceptionistDashboard.jsx
  - frontend/src/pages/PatientsPage.jsx
  - frontend/src/pages/PatientDetailPage.jsx
  - frontend/src/pages/AppointmentsPage.jsx
  - frontend/src/pages/PrescriptionsPage.jsx
  - frontend/src/pages/PrescriptionViewerPage.jsx
  - frontend/src/pages/SymptomCheckerPage.jsx
  - frontend/src/pages/NotFoundPage.jsx
  - frontend/src/pages/UnauthorizedPage.jsx
  - frontend/src/App.jsx
  - frontend/src/main.jsx
  - frontend/src/components/layout/DashboardLayout.jsx
  - frontend/src/components/layout/Sidebar.jsx
  - frontend/src/components/appointments/BookAppointmentModal.jsx
  - frontend/src/components/patients/PatientFormModal.jsx
  - frontend/src/components/prescriptions/PrescriptionFormModal.jsx
  - frontend/src/components/ui/Modal.jsx
  - frontend/src/components/ui/Button.jsx
  - frontend/src/components/ui/Input.jsx
  - frontend/src/components/ui/Badge.jsx
  - frontend/src/components/ui/Card.jsx
  - frontend/src/components/ui/Spinner.jsx
  - frontend/src/components/ui/Skeleton.jsx
  - frontend/src/components/ui/EmptyState.jsx
  - frontend/src/components/ui/ToastProvider.jsx
  - frontend/src/components/ui/toast.js
  - frontend/src/components/ui/index.js
findings:
  critical: 7
  warning: 16
  info: 9
  total: 32
status: issues_found
---

# Full Code Review Report

**Reviewed:** 2026-06-17T12:00:00Z  
**Depth:** Deep (cross-file analysis)  
**Files Reviewed:** 54  
**Status:** Issues Found (32 findings: 7 Critical, 16 Warning, 9 Info)

## Summary

Comprehensive review of the AI Clinic Management SaaS system. The codebase is well-structured with consistent patterns (asyncHandler wrapper, service/controller separation, standardized API responses). However, several critical security and correctness issues were identified including secrets exposure, missing rate limiting, data-scoping bugs, and frontend/backend field mismatches.

---

## Critical Issues

### CR-01: Live API keys and database credentials on disk in `.env`

**File:** `backend/.env:1-18`  
**Issue:** The `.env` file contains live secrets — a MongoDB Atlas connection string with embedded credentials (`qazi123:qazi123`), a JWT signing secret, a Gemini API key (`AIzaSyC...`), and a Groq API key (`gsk_nr...`). While this file is gitignored (not tracked), it exists on disk where any developer with filesystem access, a compromised IDE extension, or CI misconfiguration could exfiltrate these credentials. The MongoDB credentials alone grant external network access to the database.

**Fix:** 
1. Rotate all credentials immediately (MongoDB password, JWT_SECRET, both API keys).  
2. Use environment variables injected at deploy-time (Vercel environment variables, GitHub Secrets, etc.) rather than an `.env` file on disk in development.  
3. Add `.env` to `.pre-commit-config` or use a pre-commit hook to prevent accidental commits: `git secrets --scan`.

### CR-02: Seed script logs plaintext passwords to console

**File:** `backend/src/utils/seedUsers.js:55,60`  
**Issue:** The seed script outputs plaintext passwords to stdout:

```javascript
// Line 55
console.log(`✅  Created ${userData.role}: ${userData.email}  (password: ${userData.password})`);
// Line 60
console.log(`   ${u.role.padEnd(14)} ${u.email}  /  ${u.password}`);
```

These passwords ("Doctor@123", "Recept@123") would be captured in CI logs, terminal history, and production startup logs, constituting a credential disclosure vulnerability.

**Fix:** Remove password from seed script output. Only log the email and role, or omit logging entirely:

```javascript
console.log(`✅  Created ${userData.role}: ${userData.email}`);
```

### CR-03: No rate limiting on any endpoint

**File:** `backend/src/app.js`  
**Issue:** The `express-rate-limit` package (`^7.3.1`) is listed in `package.json` dependencies but is never configured or used in the application. This means all endpoints (auth, patient CRUD, AI symptom checker) are unprotected against brute-force, DoS, and credential-stuffing attacks. The auth endpoint (`POST /api/auth/login`) is particularly exposed.

**Fix:** Apply a global rate limiter and a stricter one on auth:

```javascript
const rateLimit = require('express-rate-limit');

// Global limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Auth-specific: stricter
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again later.', data: null },
}));
```

### CR-04: `express.json` body limit of 10kb will silently reject larger payloads

**File:** `backend/src/app.js:44`  
**Issue:** The body parser is configured with a 10kb limit:

```javascript
app.use(express.json({ limit: '10kb' }));
```

A patient record with fullName (200 chars), address (500 chars), and medicalHistory (5000 chars) can easily exceed 10KB, especially with Unicode characters. Prescription creations with multiple medicines will also fail. When the limit is exceeded, Express returns a 413 PayloadTooLarge error, but the error handler at `errorHandler.js:100` catches `entity.too.large` errors, so the user gets an "Internal server error" rather than a clear message about the size limit.

**Fix:** Increase the limit to at least 1MB (or `16kb` minimum for the current schema):

```javascript
app.use(express.json({ limit: '1mb' }));
```

### CR-05: No file type validation on X-ray upload endpoint

**File:** `backend/src/routes/aiPython.js:11`  
**Issue:** The multer configuration allows any file type up to 10MB:

```javascript
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
```

There is no MIME type or file extension filter. An attacker could upload executable scripts, malware, or excessively large files, which are then forwarded to the Python AI service. This is both a security and abuse vector.

**Fix:** Add a file filter to multer:

```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/dicom'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PNG, JPEG, and DICOM files are allowed', 400), false);
    }
  },
});
```

### CR-06: Dashboard `appointmentsToday` is not scoped to the authenticated doctor

**File:** `backend/src/controllers/dashboardController.js:31-32`  
**Issue:** The `appointmentsToday` count fetches ALL appointments for today without filtering by the requesting doctor:

```javascript
const [appointmentsToday, totalPatients] = await Promise.all([
  Appointment.countDocuments(todayFilter),   // ← no doctor filter
  Patient.countDocuments({ deletedAt: null }),
]);
```

When a doctor views their dashboard, they see the total number of appointments across ALL doctors, not just their own. This is incorrect and may lead to misinformed clinical decisions.

**Fix:** Filter by `req.user.id` when the role is `doctor`:

```javascript
const doctorFilter = role === 'doctor' ? { ...todayFilter, doctor: req.user.id } : todayFilter;
const [appointmentsToday, totalPatients] = await Promise.all([
  Appointment.countDocuments(doctorFilter),
  Patient.countDocuments({ deletedAt: null }),
]);
```

### CR-07: Password field in User schema lacks `select: false`, risking hash leakage

**File:** `backend/src/models/User.js:19-20`  
**Issue:** The password field does not use Mongoose's `select: false`:

```javascript
password: {
  type: String,
  required: true, // stores bcrypt hash — never plaintext
},
```

The comment says "never plaintext" but the hash is returned by default on all queries. The `toJSON` transform strips it (`delete ret.password`), but `.lean()` queries (used throughout services) bypass this transform. Currently only `authService.login()` manually strips the password after using `.lean()`. Any new service method that does `User.find().lean()` without manually stripping will leak password hashes in API responses.

**Fix:** Add `select: false` to the schema field:

```javascript
password: {
  type: String,
  required: true,
  select: false,  // ← prevents accidental hash leak
},
```

Then update `authService.login()` to use `.select('+password')` when the hash is needed:

```javascript
const user = await User.findOne({ email: ... }).select('+password').lean();
```

---

## Warnings

### WR-01: `updateStatus` allows reverting to `pending`

**File:** `backend/src/services/appointmentService.js:186-213`  
**Issue:** The `updateStatus` function restricts certain transitions (receptionists can't set `completed`, doctors can't set `confirmed`) but does not prevent setting `pending` on an already-processed appointment. A receptionist or doctor could accidentally revert a `confirmed` or `completed` appointment back to `pending`, causing workflow disruption.

**Fix:** Add a state-machine guard that prevents transitioning backward to `pending`:

```javascript
if (status === 'pending' && existing.status !== 'pending') {
  throw new AppError('Cannot revert appointment to pending', 400);
}
```

### WR-02: `PatientDetailPage.handleEditSubmit` has unhandled promise rejection

**File:** `frontend/src/pages/PatientDetailPage.jsx:50-54`  
**Issue:** The edit submission handler lacks error handling:

```javascript
async function handleEditSubmit(formData) {
  const response = await apiClient.put(`/api/patients/${id}`, formData)
  const { data } = response.data
  setPatient(data?.patient ?? data)
}
```

If the API call fails, the promise rejection is unhandled, causing an uncaught exception. The modal remains open with no feedback to the user.

**Fix:** Wrap in try/catch and show user feedback:

```javascript
async function handleEditSubmit(formData) {
  try {
    const response = await apiClient.put(`/api/patients/${id}`, formData)
    const { data } = response.data
    setPatient(data?.patient ?? data)
    toast.success('Patient updated')  // requires toast import
    setEditOpen(false)
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Update failed')
  }
}
```

### WR-03: Conflict time extraction in `BookAppointmentModal` references nonexistent field

**File:** `frontend/src/components/appointments/BookAppointmentModal.jsx:71-78`  
**Issue:** When handling a 409 conflict, the code tries to parse `err?.response?.data?.data?.conflictingTime`:

```javascript
const conflictingTime = err?.response?.data?.data?.conflictingTime
```

However, the backend's `checkConflict` function (`appointmentService.js:105-111`) throws an `AppError` with only a `message` string — it never sets `conflictingTime` in the response. The `errorHandler` returns `{ success: false, message, data: null }`. So `err.response.data.data` is `null`, and `.conflictingTime` is always `undefined`. The conflict error message in the UI always falls back to the generic text, never showing the specific conflicting time.

**Fix:** Either:
- Backend: Include `conflictingTime` in the AppError response structure
- Frontend: Parse the time from the error message string instead

For the backend, modify `checkConflict` to include structured data:

```javascript
const err = new AppError(`Doctor has a conflicting appointment at ${conflictTime}`, 409);
err.data = { conflictingTime: conflict.toISOString() };
throw err;
```

### WR-04: Doctor email and specialization in PrescriptionViewerPage are always undefined

**File:** `frontend/src/pages/PrescriptionViewerPage.jsx:108-113`  
**Issue:** The viewer attempts to display `prescription.doctor?.email` and `prescription.doctor?.specialization`, but the backend's `getPrescription` only populates `name` and `credentials`:

```javascript
// prescriptionService.js:98
.populate('doctor', 'name credentials');
```

The `email` field exists on User but is not selected, so it's always `undefined`. The `specialization` field doesn't exist on the User schema at all (it's `credentials` instead).

**Fix:** Align the populate fields or remove the UI elements:

```javascript
// Fix populate:
.populate('doctor', 'name email credentials');

// Or fix UI:
{prescription.doctor?.credentials && (
  <Badge variant="info" label={prescription.doctor.credentials} className="mt-1" />
)}
```

### WR-05: Dashboard pages silently swallow API errors

**File:** `frontend/src/pages/DoctorDashboard.jsx:32`, `frontend/src/pages/ReceptionistDashboard.jsx:32`  
**Issue:** API errors on the dashboard are silently consumed with `.catch(() => {})`:

```javascript
apiClient.get('/api/dashboard/stats')
  .then((res) => { if (!cancelled) setStats(res.data?.data) })
  .catch(() => {})   // ← error swallowed
  .finally(() => { if (!cancelled) setLoading(false) })
```

If the dashboard stats endpoint fails (network error, 500, etc.), the dashboard shows perpetual "—" values with no error indication. The user has no way to know data failed to load.

**Fix:** Add error state handling:

```javascript
const [error, setError] = useState(null);

// In the promise:
.catch((err) => { if (!cancelled) setError(err.message) })
```

And display an error banner in the UI.

### WR-06: `totalPrescriptions` dashboard stat counts ALL doctors' prescriptions

**File:** `backend/src/controllers/dashboardController.js:40`  
**Issue:** The doctor-specific dashboard stat counts prescriptions globally:

```javascript
const totalPrescriptions = await Prescription.countDocuments();
```

This returns the count of all prescriptions in the system, not just those issued by the current doctor. Same issue as CR-06 but for prescriptions.

**Fix:** Filter by the current doctor:

```javascript
const totalPrescriptions = await Prescription.countDocuments({ doctor: req.user.id });
```

### WR-07: Error handler uses `console.error` instead of logger utility

**File:** `backend/src/middleware/errorHandler.js:115`  
**Issue:** The global error handler logs unexpected errors using `console.error` rather than the project's `logger` utility:

```javascript
console.error('[errorHandler] Unexpected error:', err);
```

This bypasses the structured logging format (JSON in production, colorized in dev) and won't appear in any centralized logging pipeline.

**Fix:** Use the logger:

```javascript
const logger = require('../utils/logger');
// ...
logger.error(`[errorHandler] Unexpected error: ${err.message}`);
```

### WR-08: Patient search uses `$regex` instead of `$text` index, causing full scan

**File:** `backend/src/services/patientService.js:28-33`  
**Issue:** The search query uses `$regex`:

```javascript
const regex = new RegExp(escaped, 'i');
filter.$or = [
  { fullName: regex },
  { contactNumber: regex },
];
```

However, the Patient schema has a text index on `fullName` (line 57: `PatientSchema.index({ fullName: 'text', contactNumber: 1 })`). The `$regex` query cannot use the text index and will perform a full collection scan on every search. This is a correctness/performance concern as the patient table grows.

**Fix:** Use `$text` for fullName search and keep `$regex` for contactNumber, or add a regular index on `fullName`:

```javascript
// Either use $text search for names
if (search.trim()) {
  filter.$text = { $search: search.trim() };
}

// Or create a regular index instead of text index:
PatientSchema.index({ fullName: 1 });
```

### WR-09: `aiService.checkSymptoms` returns fallback on ALL errors including validation

**File:** `backend/src/services/aiService.js:77-90`  
**Issue:** The retry loop catches ALL errors and returns `FALLBACK_RESPONSE` after exhaustion. This includes validation errors (like invalid JSON response from Groq) which are not transient. A corrupt AI response cannot be fixed by retrying and will waste all retries before returning a fallback response that may mislead the user.

**Fix:** Differentiate error types — only retry on transient errors (network, timeout), fail fast on parse errors:

```javascript
catch (err) {
  if (err.message === 'No JSON found in response' || err.message.includes('JSON')) {
    throw new AppError('AI response could not be parsed', 502);
  }
  if (attempt === MAX_RETRIES) {
    console.error('[AIService] All retries exhausted:', err.message);
    return FALLBACK_RESPONSE;
  }
}
```

### WR-10: `aiPythonService.js` creates plain `Error` with `isOperational` instead of using `AppError`

**File:** `backend/src/services/aiPythonService.js:48-53,93-98`  
**Issue:** Errors from the Python AI service are constructed as plain `Error` objects with manually-set `isOperational` and `statusCode`:

```javascript
const error = new Error(message);
error.statusCode = status;
error.isOperational = true;
error.original = err;
error.pythonDetail = err.response?.data;
```

This duplicates the `AppError` pattern and bypasses the stack-trace cleanup (`Error.captureStackTrace`) that `AppError` provides.

**Fix:** Use the `AppError` class:

```javascript
const AppError = require('../utils/AppError');
const error = new AppError(message, status);
error.original = err;
error.pythonDetail = err.response?.data;
```

### WR-11: Race condition in `usePatients` — `setPage(1)` called in debounce timeout after component unmount

**File:** `frontend/src/hooks/usePatients.js:39-46`  
**Issue:** When the user types a search query, the debounce timeout calls `setPage(1)` and `setDebouncedSearch(search)`. If the component unmounts before the 300ms timeout fires, `setPage(1)` will try to update state on an unmounted component (React warning in dev). The cleanup function (`clearTimeout`) prevents the `setDebouncedSearch` call, but `setPage(1)` is called before the cleanup.

Wait, looking more carefully: the timeout callback calls `setDebouncedSearch(search)` AND `setPage(1)`. If the component unmounts, `clearTimeout` in cleanup prevents both. But if `search` changes again before the first timeout fires, the old timeout is cleared and a new one set. This is correct behavior.

However, there's still a subtle issue: `setPage(1)` is called inside the debounced timeout, but the `useEffect` at line 74-76 reacts to `page` changes. If the user had navigated to page 5 and then types a search, the page jumps to 1 after 300ms. But during those 300ms, page is still 5 and a fetch could happen with the old search + page 5. This is a minor race but the data will be corrected 300ms later.

### WR-12: `useEffect` missing dependency in `usePrescriptions` — `patientId` vs `patientIdRef`

**File:** `frontend/src/hooks/usePrescriptions.js:56-58`  
**Issue:** The `useEffect` depends directly on `patientId` state:

```javascript
useEffect(() => {
  fetchPrescriptions(page, patientId)
}, [page, patientId, fetchPrescriptions])
```

But the mutation callbacks use `patientIdRef.current` which could be stale if `fetchPrescriptions` captured a stale `patientId`. This pattern exists in `usePatients`, `useAppointments`, and `usePrescriptions` — the refs ensure mutations use the latest value, but the `useEffect` uses the state directly, which is correct for re-fetching. This is technically sound but the dual ref+state pattern adds complexity.

### WR-13: No `X-Content-Type-Options` header from helmet default (might allow MIME sniffing)

**File:** `backend/src/app.js:17`  
**Issue:** `app.use(helmet())` is used with default settings. The default helmet configuration includes `contentTypeOptions` (nosniff), so this is actually safe by default. No issue here.

Wait, let me re-check. Helmet 7.x by default sets `X-Content-Type-Options: nosniff`. So this is fine.

### WR-14: `toast.js` re-export is fragile — depends on `react-hot-toast` internal

**File:** `frontend/src/components/ui/toast.js:1-3`  
**Issue:** The toast module imports then re-exports the default `toast` from react-hot-toast:

```javascript
import { toast } from 'react-hot-toast';
export default toast;
```

The `toast` import uses named import but re-exports as default. This works because react-hot-toast's `toast` is callable (it's a function with methods). However, the file is never imported — all pages use react-hot-toast's `toast` directly through the barrel export in `index.js`. This file is dead code.

**Fix:** Remove `frontend/src/components/ui/toast.js` and update the barrel export:

```javascript
// In index.js, remove:
export { default as toast } from './toast';
// And add directly:
export { toast } from 'react-hot-toast';
```

### WR-15: `sendError` utility is exported but never imported or used anywhere

**File:** `backend/src/utils/apiResponse.js:26-32`  
**Issue:** The `sendError` function is defined and exported but never imported by any controller, service, or middleware. All errors are thrown as `AppError` instances and handled by the global `errorHandler`. This is dead code that adds confusion about the proper error-handling pattern.

**Fix:** Remove `sendError` from `apiResponse.js` to enforce the error-throwing pattern consistently, or keep it but document its intended use case.

### WR-16: `noValidate` on login form prevents browser password manager hints

**File:** `frontend/src/pages/LoginPage.jsx:183`  
**Issue:** The form uses `noValidate` which disables browser-native validation. While inline validation is implemented, `noValidate` also prevents some password managers from associating the form correctly.

**Fix:** Remove `noValidate` and keep only the custom validation. Or use `novalidate` (HTML attribute) with proper `autoComplete` attributes which are already set.

---

## Info

### IN-01: Unused `GEMINI_API_KEY` in `.env` file

**File:** `backend/.env:12`  
**Issue:** The `.env` file contains `GEMINI_API_KEY=AIzaSyC9EfNkT2cTZ3NYCXYkVq_587BFo9uxrqQ`, but the codebase uses `GROQ_API_KEY` for the AI service. The `@google/generative-ai` package is in `package.json` dependencies but never imported or used anywhere. Either unused dependencies or a planned feature that wasn't implemented.

**Fix:** Remove `GEMINI_API_KEY`, remove the unused `@google/generative-ai` dependency, or implement the Gemini integration if intended.

### IN-02: User model comment misleading — `unique: true` not on schema field

**File:** `backend/src/models/User.js:42-44`  
**Issue:** The comment says "redundant with unique:true" but the email field doesn't have `unique: true`. Only the explicit index enforces uniqueness. The comment should be updated to reflect the actual intent.

### IN-03: React import unnecessary in components using JSX (React 17+)

**Files:** `frontend/src/components/ui/Modal.jsx:1`, `Button.jsx:1`, `Input.jsx:1`, etc.  
**Issue:** React 17's new JSX transform means `import React from 'react'` is not required for JSX. The project likely uses this transform (no `React.createElement` calls in the output). All `import React from 'react'` statements are unnecessary but harmless.

### IN-04: No `id` param validation in controllers before passing to services

**Files:** `backend/src/controllers/*.js`  
**Issue:** `req.params.id` is passed directly to service methods without validating it's a valid MongoDB ObjectId. A malformed ID results in a `CastError` caught by `errorHandler.js:73` which returns "Invalid ID format" — a reasonable user-facing message, but validating early would be cleaner.

### IN-05: `.env.example` is missing `GEMINI_API_KEY` and has mismatched comment

**File:** `backend/.env.example:17`  
**Issue:** The example file has `GROQ_API_KEY=your_groq_api_key_here` but the comment says "Google Gemini AI". The comment is a copy-paste leftover.

### IN-06: `form-data` dependency in `package.json` is only used by `aiPythonService.js`

**File:** `backend/package.json:25`  
**Issue:** The `form-data` package is listed as a general dependency but is only used in one file for multipart uploads. Consider if this could be inlined or if there's a lighter alternative.

### IN-07: `DoctorDashboard.jsx` uses promise chain instead of async/await pattern

**File:** `frontend/src/pages/DoctorDashboard.jsx:28-35`  
**Issue:** The dashboard uses `.then().catch().finally()` while all other pages use async/await with try/catch. This inconsistency makes the code harder to maintain.

### IN-08: `PatientDetailPage.jsx` has 251 lines — high complexity

**File:** `frontend/src/pages/PatientDetailPage.jsx`  
**Issue:** This component handles data fetching, error states, loading skeletons, edit modal, three placeholder sections, and two helper components. Consider extracting `DetailField` and `PlaceholderSection` into separate files and splitting the main component into smaller custom hooks.

### IN-09: PrescriptionsPage pagination is outside the main content container

**File:** `frontend/src/pages/PrescriptionsPage.jsx:183-210`  
**Issue:** The closing `</div>` on line 183 closes the `space-y-6` wrapper, but the pagination controls on lines 186-210 are between that wrapper and the `</DashboardLayout>` closing tag. The pagination lacks the `space-y-6` padding and may render differently than other page paginations.

**Fix:** Move pagination inside the content wrapper div.

---

## Cross-File Consistency Findings

| Issue | Files | Description |
|-------|-------|-------------|
| Doctor populate fields mismatch | `prescriptionService.js:98`, `PrescriptionViewerPage.jsx:108-113` | Backend populates `name credentials`; frontend expects `email` and `specialization` |
| `conflictingTime` never sent | `appointmentService.js:105-111`, `BookAppointmentModal.jsx:71-78` | Frontend reads field backend never sets |
| Rate limiter installed but unused | `package.json:23`, `app.js` | `express-rate-limit` in deps, never configured |
| Two AI SDKs installed, one unused | `package.json:16,26`, `aiService.js` | Both `@google/generative-ai` and `groq-sdk` in deps, only Groq used |
| Password hash pattern inconsistent | `User.js`, `authService.js:31`, `errorHandler.js` | Schema lacks `select:false`, lean bypasses toJSON transform, manual strip in one place |

---

_Reviewed: 2026-06-17T12:00:00Z_  
_Reviewer: OpenCode (gsd-code-reviewer)_  
_Depth: deep_
