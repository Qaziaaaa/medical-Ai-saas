import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    user: { name: 'Dr. Smith' },
    role: 'doctor',
    ...overrides,
  })
}

function renderLayout(pathname, children = <p>Content</p>) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <DashboardLayout>{children}</DashboardLayout>
    </MemoryRouter>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('renders children', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('displays correct page title for dashboard', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct page title for patients', () => {
    renderLayout('/patients')
    expect(screen.getAllByText('Patients').length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct page title for appointments', () => {
    renderLayout('/appointments')
    expect(screen.getAllByText('Appointments').length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct page title for prescriptions', () => {
    renderLayout('/prescriptions')
    expect(screen.getAllByText('Prescriptions').length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct page title for symptom checker', () => {
    renderLayout('/ai/symptom-checker')
    expect(screen.getAllByText('AI Symptom Checker').length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to Clinic for unknown paths', () => {
    renderLayout('/unknown/path')
    expect(screen.getByText('Clinic')).toBeInTheDocument()
  })

  it('matches nested patient route', () => {
    renderLayout('/patients/123')
    expect(screen.getAllByText('Patients').length).toBeGreaterThanOrEqual(1)
  })

  it('shows role badge', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getByText('Doctor')).toBeInTheDocument()
  })

  it('shows user name in header', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getAllByText('Dr. Smith').length).toBeGreaterThanOrEqual(1)
  })

  it('shows user initial in avatar', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getAllByText('D').length).toBeGreaterThanOrEqual(1)
  })

  it('has hamburger menu button', () => {
    renderLayout('/doctor/dashboard')
    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
  })

  it('applies success variant for receptionist', () => {
    mockAuth({ role: 'receptionist', user: { name: 'Jane' } })
    renderLayout('/receptionist/dashboard')
    expect(screen.getByText('Receptionist')).toBeInTheDocument()
  })
})
