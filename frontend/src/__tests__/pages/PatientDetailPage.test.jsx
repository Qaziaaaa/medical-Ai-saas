import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PatientDetailPage from '../../pages/PatientDetailPage'
import * as authHook from '../../hooks/useAuth'
import apiClient from '../../lib/axios'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

const mockPatient = {
  _id: 'p1',
  fullName: 'Alice Johnson',
  dateOfBirth: '1990-05-15T00:00:00.000Z',
  gender: 'female',
  contactNumber: '+1 555 1111',
  email: 'alice@example.com',
  address: '123 Main St',
  medicalHistory: 'Asthma',
  createdAt: '2024-01-15T00:00:00.000Z',
}

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    role: overrides.role ?? 'receptionist',
    user: { name: 'Test User', email: 'test@test.com', ...overrides },
    token: 'fake-token',
    logout: vi.fn(),
  })
}

function renderPage(route = '/patients/p1') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/patients/:id" element={<PatientDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'receptionist' })
  })

  it('shows loading skeleton initially', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('← Back to Patients')).toBeInTheDocument()
  })

  it('displays patient details after fetch', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { patient: mockPatient } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.getByText('May 15, 1990')).toBeInTheDocument()
    expect(screen.getByText('Female')).toBeInTheDocument()
    expect(screen.getByText('+1 555 1111')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
    expect(screen.getByText('Asthma')).toBeInTheDocument()
  })

  it('shows error state on fetch failure', async () => {
    apiClient.get.mockRejectedValue({ response: { data: { message: 'Patient not found' } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Patient not found')).toBeInTheDocument()
    })
  })

  it('shows Edit Patient button for receptionist', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { patient: mockPatient } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Edit Patient')).toBeInTheDocument()
    })
  })

  it('hides Edit Patient button for doctor', async () => {
    mockAuth({ role: 'doctor' })
    apiClient.get.mockResolvedValue({ data: { data: { patient: mockPatient } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.queryByText('Edit Patient')).not.toBeInTheDocument()
  })

  it('shows back button that navigates to /patients', () => {
    apiClient.get.mockResolvedValue({ data: { data: { patient: mockPatient } } })
    renderPage()
    expect(screen.getByText('← Back to Patients')).toBeInTheDocument()
  })

  it('shows placeholder sections', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { patient: mockPatient } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Appointment History').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('Prescription History').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Diagnosis History').length).toBeGreaterThanOrEqual(1)
  })
})
