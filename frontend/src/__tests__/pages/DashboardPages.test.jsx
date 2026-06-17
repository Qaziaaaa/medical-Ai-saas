import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorDashboard from '../../pages/DoctorDashboard'
import ReceptionistDashboard from '../../pages/ReceptionistDashboard'
import * as authHook from '../../hooks/useAuth'
import apiClient from '../../lib/axios'

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

const mockStats = {
  appointmentsToday: 5,
  totalPatients: 120,
  totalPrescriptions: 45,
  pendingAppointments: 3,
}

function mockAuth(userOverrides = {}) {
  authHook.useAuth.mockReturnValue({
    user: { name: 'Dr. Smith', email: 'doctor@test.com', ...userOverrides },
    role: userOverrides.role ?? 'doctor',
    token: 'fake-token',
    logout: vi.fn(),
  })
}

function renderDashboard(Component, route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Component />
    </MemoryRouter>
  )
}

describe('DoctorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'doctor' })
  })

  it('shows loading state initially', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}))
    renderDashboard(DoctorDashboard, '/doctor/dashboard')
    expect(screen.getByText(/Good morning/)).toBeInTheDocument()
  })

  it('displays stats after successful fetch', async () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('fetches dashboard stats on mount', () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')
    expect(apiClient.get).toHaveBeenCalledWith('/api/dashboard/stats')
  })

  it('shows zero values when stats are null', async () => {
    apiClient.get.mockResolvedValue({ data: { data: null } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
    })
  })

  it('shows greeting with doctor first name', () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')
    expect(screen.getByText(/Good morning, Dr\./)).toBeInTheDocument()
  })

  it('shows Doctor badge', () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')
    expect(screen.getAllByText('Doctor').length).toBeGreaterThanOrEqual(1)
  })

  it('renders 4 stat cards', async () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(DoctorDashboard, '/doctor/dashboard')

    await waitFor(() => {
      expect(screen.getByText("Today's Appointments")).toBeInTheDocument()
    })
    expect(screen.getByText('Total Patients')).toBeInTheDocument()
    expect(screen.getByText('Prescriptions Issued')).toBeInTheDocument()
    expect(screen.getByText('AI Checks Today')).toBeInTheDocument()
  })

  it('handles fetch error gracefully', async () => {
    apiClient.get.mockRejectedValue(new Error('Network error'))
    renderDashboard(DoctorDashboard, '/doctor/dashboard')

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('ReceptionistDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth({ role: 'receptionist', name: 'Jane Receptionist' })
  })

  it('displays receptionist-specific stats', async () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(ReceptionistDashboard, '/receptionist/dashboard')

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders 3 stat cards', async () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(ReceptionistDashboard, '/receptionist/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Appointments Today')).toBeInTheDocument()
    })
    expect(screen.getByText('Registered Patients')).toBeInTheDocument()
    expect(screen.getByText('Pending Appointments')).toBeInTheDocument()
  })

  it('shows Receptionist badge', () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(ReceptionistDashboard, '/receptionist/dashboard')
    expect(screen.getAllByText('Receptionist').length).toBeGreaterThanOrEqual(1)
  })

  it('shows greeting with receptionist first name', () => {
    apiClient.get.mockResolvedValue({ data: { data: mockStats } })
    renderDashboard(ReceptionistDashboard, '/receptionist/dashboard')
    expect(screen.getByText(/Good morning, Jane/)).toBeInTheDocument()
  })
})
