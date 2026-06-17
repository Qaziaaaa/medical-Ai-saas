import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PrescriptionsPage from '../../pages/PrescriptionsPage'
import * as authHook from '../../hooks/useAuth'
import * as prescriptionsHook from '../../hooks/usePrescriptions'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/usePrescriptions', () => ({
  usePrescriptions: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockPrescriptions = [
  {
    _id: 'rx1',
    patient: { fullName: 'Alice Johnson' },
    doctor: { name: 'Dr. Smith' },
    createdAt: '2025-06-15T00:00:00.000Z',
    medicines: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days' }],
  },
  {
    _id: 'rx2',
    patient: { fullName: 'Bob Williams' },
    doctor: { name: 'Dr. Jones' },
    createdAt: '2025-06-16T00:00:00.000Z',
    medicines: [
      { name: 'Ibuprofen', dosage: '200mg', frequency: 'Three times daily', duration: '5 days' },
      { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '3 days' },
    ],
  },
]

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    role: overrides.role ?? 'doctor',
    user: { name: 'Dr. Test', email: 'doctor@test.com', ...overrides },
    token: 'fake-token',
    logout: vi.fn(),
  })
}

function mockUsePrescriptions(overrides = {}) {
  prescriptionsHook.usePrescriptions.mockReturnValue({
    prescriptions: [],
    total: 0,
    loading: false,
    error: null,
    page: 1,
    setPage: vi.fn(),
    patientId: '',
    setPatientId: vi.fn(),
    createPrescription: vi.fn(),
    downloadPDF: vi.fn(),
    ...overrides,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PrescriptionsPage />
    </MemoryRouter>
  )
}

describe('PrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'doctor' })
  })

  it('renders the page heading', () => {
    mockUsePrescriptions()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Prescriptions' })).toBeInTheDocument()
  })

  it('shows total count', () => {
    mockUsePrescriptions({ total: 10 })
    renderPage()
    expect(screen.getByText('10 total prescriptions')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockUsePrescriptions({ loading: true })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Prescriptions' })).toBeInTheDocument()
  })

  it('shows empty state when no prescriptions', () => {
    mockUsePrescriptions({ prescriptions: [], total: 0 })
    renderPage()
    expect(screen.getByText('No prescriptions found')).toBeInTheDocument()
  })

  it('renders prescription rows', () => {
    mockUsePrescriptions({ prescriptions: mockPrescriptions, total: 2 })
    renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Williams')).toBeInTheDocument()
  })

  it('shows New Prescription button for doctor', () => {
    mockUsePrescriptions()
    renderPage()
    expect(screen.getByText('+ New Prescription')).toBeInTheDocument()
  })

  it('hides New Prescription button for receptionist', () => {
    mockAuth({ role: 'receptionist' })
    mockUsePrescriptions()
    renderPage()
    expect(screen.queryByText('+ New Prescription')).not.toBeInTheDocument()
  })

  it('renders patient ID filter form', () => {
    mockUsePrescriptions()
    renderPage()
    expect(screen.getByPlaceholderText('Filter by patient ID…')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('shows medicine count per prescription', () => {
    mockUsePrescriptions({ prescriptions: mockPrescriptions, total: 2 })
    renderPage()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows View and Download PDF links', () => {
    mockUsePrescriptions({ prescriptions: mockPrescriptions, total: 2 })
    renderPage()
    expect(screen.getAllByText('View').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Download PDF').length).toBeGreaterThanOrEqual(2)
  })

  it('shows error banner when error is present', () => {
    mockUsePrescriptions({ error: 'Failed to load prescriptions' })
    renderPage()
    expect(screen.getByText('Failed to load prescriptions')).toBeInTheDocument()
  })

  it('shows pagination when multiple pages', () => {
    mockUsePrescriptions({ total: 50 })
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })
})
