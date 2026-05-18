import { lazy, Suspense, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import Spinner from '../components/ui/Spinner'

// ---------------------------------------------------------------------------
// Error boundary — catches render errors and shows a readable message
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-neutral-900">Something went wrong</h1>
          <p className="max-w-md text-sm text-neutral-500">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Back to Login
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Lazy-loaded page components
// ---------------------------------------------------------------------------
const LoginPage              = lazy(() => import('../pages/LoginPage'))
const DoctorDashboard        = lazy(() => import('../pages/DoctorDashboard'))
const ReceptionistDashboard  = lazy(() => import('../pages/ReceptionistDashboard'))
const PatientsPage           = lazy(() => import('../pages/PatientsPage'))
const PatientDetailPage      = lazy(() => import('../pages/PatientDetailPage'))
const AppointmentsPage       = lazy(() => import('../pages/AppointmentsPage'))
const PrescriptionsPage      = lazy(() => import('../pages/PrescriptionsPage'))
const PrescriptionViewerPage = lazy(() => import('../pages/PrescriptionViewerPage'))
const SymptomCheckerPage     = lazy(() => import('../pages/SymptomCheckerPage'))
const UnauthorizedPage       = lazy(() => import('../pages/UnauthorizedPage'))
const NotFoundPage           = lazy(() => import('../pages/NotFoundPage'))

// ---------------------------------------------------------------------------
// Loading fallback — centred spinner shown while a chunk is being fetched
// ---------------------------------------------------------------------------
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppRoutes — full route tree
// ---------------------------------------------------------------------------
export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ─────────────────────────────────────────────── */}
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*"             element={<NotFoundPage />} />

        {/* Root redirect → /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Doctor-only routes ────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor/dashboard"   element={<DoctorDashboard />} />
          <Route path="/ai/symptom-checker" element={<SymptomCheckerPage />} />
        </Route>

        {/* ── Receptionist-only routes ──────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['receptionist']} />}>
          <Route path="/receptionist/dashboard" element={<ReceptionistDashboard />} />
        </Route>

        {/* ── Routes accessible by both roles ──────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={['doctor', 'receptionist']} />}>
          <Route path="/patients"              element={<PatientsPage />} />
          <Route path="/patients/:id"          element={<PatientDetailPage />} />
          <Route path="/appointments"          element={<AppointmentsPage />} />
          <Route path="/prescriptions"         element={<PrescriptionsPage />} />
          <Route path="/prescriptions/:id"     element={<PrescriptionViewerPage />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
