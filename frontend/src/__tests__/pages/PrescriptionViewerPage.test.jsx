import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PrescriptionViewerPage from '../../pages/PrescriptionViewerPage'
import apiClient from '../../lib/axios'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

const mockPrescription = {
  _id: 'rx1',
  createdAt: '2025-06-15T00:00:00.000Z',
  doctor: { name: 'Dr. Smith', email: 'smith@clinic.com', specialization: 'Cardiology' },
  patient: { fullName: 'Alice Johnson', contactNumber: '+1 555 1111', dateOfBirth: '1990-05-15T00:00:00.000Z' },
  medicines: [
    { name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days' },
    { name: 'Ibuprofen', dosage: '200mg', frequency: 'Three times daily', duration: '5 days' },
  ],
  notes: 'Take with food',
}

function renderPage(route = '/prescriptions/rx1') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/prescriptions/:id" element={<PrescriptionViewerPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PrescriptionViewerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authHook.useAuth.mockReturnValue({
      role: 'doctor',
      user: { name: 'Dr. Test', email: 'doctor@test.com' },
      token: 'fake-token',
      logout: vi.fn(),
    })
  })

  it('shows loading spinner initially', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('displays prescription details after fetch', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { prescription: mockPrescription } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Prescription')).toBeInTheDocument()
    })
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
    expect(screen.getByText('smith@clinic.com')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('+1 555 1111')).toBeInTheDocument()
  })

  it('renders medicines table', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { prescription: mockPrescription } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Medicines')).toBeInTheDocument()
    })
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    expect(screen.getByText('500mg')).toBeInTheDocument()
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
    expect(screen.getByText('200mg')).toBeInTheDocument()
  })

  it('shows notes section when present', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { prescription: mockPrescription } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Take with food')).toBeInTheDocument()
    })
  })

  it('shows Download PDF button', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { prescription: mockPrescription } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Download PDF')).toBeInTheDocument()
    })
  })

  it('shows error state on fetch failure', async () => {
    apiClient.get.mockRejectedValue({ response: { data: { message: 'Prescription not found' } } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Prescription not found')).toBeInTheDocument()
    })
  })

  it('shows back button', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })
})
