import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PatientsPage from '../../pages/PatientsPage'
import * as authHook from '../../hooks/useAuth'
import * as patientsHook from '../../hooks/usePatients'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/usePatients', () => ({
  usePatients: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockPatients = [
  { _id: '1', fullName: 'Alice Johnson', gender: 'female', contactNumber: '+1 555 1111', createdAt: '2024-01-15T00:00:00.000Z' },
  { _id: '2', fullName: 'Bob Smith', gender: 'male', contactNumber: '+1 555 2222', createdAt: '2024-02-20T00:00:00.000Z' },
]

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    role: overrides.role ?? 'receptionist',
    user: { name: 'Test User', email: 'test@test.com', ...overrides },
    token: 'fake-token',
    logout: vi.fn(),
  })
}

function mockUsePatients(overrides = {}) {
  patientsHook.usePatients.mockReturnValue({
    patients: [],
    total: 0,
    loading: false,
    error: null,
    page: 1,
    setPage: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    deletePatient: vi.fn(),
    ...overrides,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PatientsPage />
    </MemoryRouter>
  )
}

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'receptionist' })
  })

  it('renders the page heading and total count', () => {
    mockUsePatients({ total: 42 })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Patients' })).toBeInTheDocument()
    expect(screen.getByText('42 total patients')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockUsePatients({ loading: true })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Patients' })).toBeInTheDocument()
  })

  it('shows empty state when no patients', () => {
    mockUsePatients({ patients: [], total: 0 })
    renderPage()
    expect(screen.getByText('No patients found')).toBeInTheDocument()
  })

  it('renders patient rows in the table', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('renders search input', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.getByPlaceholderText('Search by name or contact...')).toBeInTheDocument()
  })

  it('shows Add Patient button for receptionist', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.getByText('+ Add Patient')).toBeInTheDocument()
  })

  it('does not show Add Patient button for doctor', () => {
    mockAuth({ role: 'doctor' })
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.queryByText('+ Add Patient')).not.toBeInTheDocument()
  })

  it('shows Edit and Delete buttons for receptionist', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    const editButtons = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')
    expect(editButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })

  it('hides Edit and Delete buttons for doctor', () => {
    mockAuth({ role: 'doctor' })
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows View link for each patient', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.getAllByText('View')).toHaveLength(2)
  })

  it('shows gender badges', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.getByText('female')).toBeInTheDocument()
    expect(screen.getByText('male')).toBeInTheDocument()
  })

  it('shows pagination when multiple pages', () => {
    mockUsePatients({ total: 50 })
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('hides pagination when single page', () => {
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()
    expect(screen.queryByText('Page 1 of 1')).not.toBeInTheDocument()
  })

  it('opens PatientFormModal on Add Patient click', async () => {
    const user = userEvent.setup()
    mockUsePatients({ patients: mockPatients, total: 2 })
    renderPage()

    await user.click(screen.getByText('+ Add Patient'))
    expect(screen.getByRole('heading', { name: /add patient/i })).toBeInTheDocument()
  })
})
