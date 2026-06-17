import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../../routes/AppRoutes'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../pages/LoginPage', () => ({
  default: () => <div>LoginPage</div>,
}))
vi.mock('../../pages/DoctorDashboard', () => ({
  default: () => <div>DoctorDashboard</div>,
}))
vi.mock('../../pages/ReceptionistDashboard', () => ({
  default: () => <div>ReceptionistDashboard</div>,
}))
vi.mock('../../pages/PatientsPage', () => ({
  default: () => <div>PatientsPage</div>,
}))
vi.mock('../../pages/PatientDetailPage', () => ({
  default: () => <div>PatientDetailPage</div>,
}))
vi.mock('../../pages/AppointmentsPage', () => ({
  default: () => <div>AppointmentsPage</div>,
}))
vi.mock('../../pages/PrescriptionsPage', () => ({
  default: () => <div>PrescriptionsPage</div>,
}))
vi.mock('../../pages/PrescriptionViewerPage', () => ({
  default: () => <div>PrescriptionViewerPage</div>,
}))
vi.mock('../../pages/SymptomCheckerPage', () => ({
  default: () => <div>SymptomCheckerPage</div>,
}))
vi.mock('../../pages/UnauthorizedPage', () => ({
  default: () => <div>UnauthorizedPage</div>,
}))
vi.mock('../../pages/NotFoundPage', () => ({
  default: () => <div>NotFoundPage</div>,
}))

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    isAuthenticated: false,
    role: null,
    user: null,
    token: null,
    logout: vi.fn(),
    ...overrides,
  })
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  )
}

describe('AppRoutes — public routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('renders LoginPage at /login', async () => {
    renderAt('/login')
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
  })

  it('renders UnauthorizedPage at /unauthorized', async () => {
    renderAt('/unauthorized')
    await waitFor(() => expect(screen.getByText('UnauthorizedPage')).toBeInTheDocument())
  })

  it('renders NotFoundPage for unknown routes', async () => {
    renderAt('/unknown-route')
    await waitFor(() => expect(screen.getByText('NotFoundPage')).toBeInTheDocument())
  })

  it('redirects / to /login', async () => {
    renderAt('/')
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
  })
})

describe('AppRoutes — protected routes (unauthenticated)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ isAuthenticated: false, role: null })
  })

  it('redirects /patients to /login when not authenticated', async () => {
    renderAt('/patients')
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
  })

  it('redirects /doctor/dashboard to /login when not authenticated', async () => {
    renderAt('/doctor/dashboard')
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
  })

  it('redirects /receptionist/dashboard to /login when not authenticated', async () => {
    renderAt('/receptionist/dashboard')
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
  })
})

describe('AppRoutes — doctor-only routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ isAuthenticated: true, role: 'doctor' })
  })

  it('renders DoctorDashboard at /doctor/dashboard', async () => {
    renderAt('/doctor/dashboard')
    await waitFor(() => expect(screen.getByText('DoctorDashboard')).toBeInTheDocument())
  })

  it('renders SymptomCheckerPage at /ai/symptom-checker', async () => {
    renderAt('/ai/symptom-checker')
    await waitFor(() => expect(screen.getByText('SymptomCheckerPage')).toBeInTheDocument())
  })

  it('redirects /receptionist/dashboard to /unauthorized for doctor', async () => {
    renderAt('/receptionist/dashboard')
    await waitFor(() => expect(screen.getByText('UnauthorizedPage')).toBeInTheDocument())
  })
})

describe('AppRoutes — receptionist-only routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ isAuthenticated: true, role: 'receptionist' })
  })

  it('renders ReceptionistDashboard at /receptionist/dashboard', async () => {
    renderAt('/receptionist/dashboard')
    await waitFor(() => expect(screen.getByText('ReceptionistDashboard')).toBeInTheDocument())
  })

  it('redirects /doctor/dashboard to /unauthorized for receptionist', async () => {
    renderAt('/doctor/dashboard')
    await waitFor(() => expect(screen.getByText('UnauthorizedPage')).toBeInTheDocument())
  })
})

describe('AppRoutes — shared role routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ isAuthenticated: true, role: 'doctor' })
  })

  it('renders PatientsPage at /patients', async () => {
    renderAt('/patients')
    await waitFor(() => expect(screen.getByText('PatientsPage')).toBeInTheDocument())
  })

  it('renders PatientDetailPage at /patients/:id', async () => {
    renderAt('/patients/123')
    await waitFor(() => expect(screen.getByText('PatientDetailPage')).toBeInTheDocument())
  })

  it('renders AppointmentsPage at /appointments', async () => {
    renderAt('/appointments')
    await waitFor(() => expect(screen.getByText('AppointmentsPage')).toBeInTheDocument())
  })

  it('renders PrescriptionsPage at /prescriptions', async () => {
    renderAt('/prescriptions')
    await waitFor(() => expect(screen.getByText('PrescriptionsPage')).toBeInTheDocument())
  })

  it('renders PrescriptionViewerPage at /prescriptions/:id', async () => {
    renderAt('/prescriptions/456')
    await waitFor(() => expect(screen.getByText('PrescriptionViewerPage')).toBeInTheDocument())
  })

  it('allows receptionist to access shared routes', async () => {
    mockAuth({ isAuthenticated: true, role: 'receptionist' })
    renderAt('/appointments')
    await waitFor(() => expect(screen.getByText('AppointmentsPage')).toBeInTheDocument())
  })
})
