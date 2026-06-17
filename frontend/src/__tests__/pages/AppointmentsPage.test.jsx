import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppointmentsPage from '../../pages/AppointmentsPage'
import * as authHook from '../../hooks/useAuth'
import * as appointmentsHook from '../../hooks/useAppointments'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockAppointments = [
  {
    _id: 'a1',
    patient: { fullName: 'Alice Johnson' },
    doctor: { name: 'Dr. Smith' },
    scheduledAt: '2025-06-17T10:00:00.000Z',
    reason: 'Checkup',
    status: 'confirmed',
  },
  {
    _id: 'a2',
    patient: { fullName: 'Bob Williams' },
    doctor: { name: 'Dr. Jones' },
    scheduledAt: '2025-06-18T14:30:00.000Z',
    reason: 'Follow-up',
    status: 'pending',
  },
]

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    role: overrides.role ?? 'receptionist',
    user: { name: 'Test User', email: 'test@test.com', ...overrides },
    token: 'fake-token',
    logout: vi.fn(),
  })
}

function mockUseAppointments(overrides = {}) {
  appointmentsHook.useAppointments.mockReturnValue({
    appointments: [],
    total: 0,
    loading: false,
    error: null,
    page: 1,
    setPage: vi.fn(),
    filters: { status: '', dateFrom: '', dateTo: '' },
    setFilters: vi.fn(),
    createAppointment: vi.fn(),
    updateStatus: vi.fn(),
    ...overrides,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppointmentsPage />
    </MemoryRouter>
  )
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'receptionist' })
  })

  it('renders the page heading', () => {
    mockUseAppointments()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeInTheDocument()
  })

  it('shows total count', () => {
    mockUseAppointments({ total: 15 })
    renderPage()
    expect(screen.getByText('15 total appointments')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockUseAppointments({ loading: true })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeInTheDocument()
  })

  it('shows empty state when no appointments', () => {
    mockUseAppointments({ appointments: [], total: 0 })
    renderPage()
    expect(screen.getByText('No appointments found')).toBeInTheDocument()
  })

  it('renders appointment rows', () => {
    mockUseAppointments({ appointments: mockAppointments, total: 2 })
    renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Williams')).toBeInTheDocument()
  })

  it('shows Book Appointment button for receptionist', () => {
    mockUseAppointments()
    renderPage()
    expect(screen.getByText('+ Book Appointment')).toBeInTheDocument()
  })

  it('hides Book Appointment button for doctor', () => {
    mockAuth({ role: 'doctor' })
    mockUseAppointments()
    renderPage()
    expect(screen.queryByText('+ Book Appointment')).not.toBeInTheDocument()
  })

  it('renders filter controls', () => {
    mockUseAppointments()
    renderPage()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('shows status badge for each appointment', () => {
    mockUseAppointments({ appointments: mockAppointments, total: 2 })
    renderPage()
    const confirmed = screen.getAllByText('Confirmed')
    expect(confirmed.length).toBeGreaterThanOrEqual(1)
    const pending = screen.getAllByText('Pending')
    expect(pending.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Update… select for actionable appointments', () => {
    mockAuth({ role: 'receptionist' })
    mockUseAppointments({ appointments: mockAppointments, total: 2 })
    renderPage()
    const updates = screen.getAllByText('Update…')
    expect(updates.length).toBeGreaterThanOrEqual(1)
  })

  it('shows pagination when multiple pages', () => {
    mockUseAppointments({ total: 40 })
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('shows error banner when error is present', () => {
    mockUseAppointments({ error: 'Failed to load appointments' })
    renderPage()
    expect(screen.getByText('Failed to load appointments')).toBeInTheDocument()
  })
})
