import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import BookAppointmentModal from '../../components/appointments/BookAppointmentModal'
import apiClient from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

const mockPatients = [
  { _id: 'p1', fullName: 'Alice Johnson' },
  { _id: 'p2', fullName: 'Bob Williams' },
]

const mockDoctors = [
  { _id: 'd1', name: 'Dr. Smith' },
  { _id: 'd2', name: 'Dr. Jones' },
]

function renderModal(isOpen = true, onSubmit = vi.fn(), loading = false) {
  return render(
    <MemoryRouter>
      <BookAppointmentModal
        isOpen={isOpen}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={loading}
      />
    </MemoryRouter>
  )
}

describe('BookAppointmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/patients')) return Promise.resolve({ data: { data: mockPatients } })
      if (url.includes('/users/doctors')) return Promise.resolve({ data: { data: { doctors: mockDoctors } } })
      return Promise.reject(new Error('Unknown url'))
    })
  })

  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders form when open', async () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('loads patients and doctors on open', async () => {
    renderModal()

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/patients?limit=100')
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/users/doctors')
  })

  it('shows Book Appointment title', async () => {
    renderModal()
    expect(await screen.findByRole('heading', { name: /book appointment/i })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    await waitFor(() => {
      expect(screen.getByText('Patient is required')).toBeInTheDocument()
    })
    expect(screen.getByText('Doctor is required')).toBeInTheDocument()
    expect(screen.getByText('Date and time is required')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue()
    renderModal(true, onSubmit)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /patient/i }), 'p1')
    await user.selectOptions(screen.getByRole('combobox', { name: /doctor/i }), 'd1')
    fireEvent.change(screen.getByLabelText(/date & time/i), {
      target: { value: '2026-06-20T10:00' },
    })
    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('shows conflict error on 409', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue({
      response: { status: 409, data: { data: {} } },
    })
    renderModal(true, onSubmit)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /patient/i }), 'p1')
    await user.selectOptions(screen.getByRole('combobox', { name: /doctor/i }), 'd1')
    fireEvent.change(screen.getByLabelText(/date & time/i), {
      target: { value: '2026-06-20T10:00' },
    })
    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    await waitFor(() => {
      expect(screen.getByText(/already booked/i)).toBeInTheDocument()
    })
  })

  it('shows conflicting time in error message', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        status: 409,
        data: { data: { conflictingTime: '2026-06-20T10:00:00Z' } },
      },
    })
    renderModal(true, onSubmit)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /patient/i }), 'p1')
    await user.selectOptions(screen.getByRole('combobox', { name: /doctor/i }), 'd1')
    fireEvent.change(screen.getByLabelText(/date & time/i), {
      target: { value: '2026-06-20T10:00' },
    })
    await user.click(screen.getByRole('button', { name: /book appointment/i }))

    await waitFor(() => {
      expect(screen.getByText(/conflicts/i)).toBeInTheDocument()
    })
  })

  it('clears conflict error on input change', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue({
      response: { status: 409, data: { data: {} } },
    })
    renderModal(true, onSubmit)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /patient/i }), 'p1')
    await user.selectOptions(screen.getByRole('combobox', { name: /doctor/i }), 'd1')
    fireEvent.change(screen.getByLabelText(/date & time/i), {
      target: { value: '2026-06-20T10:00' },
    })
    await user.click(screen.getByRole('button', { name: /book appointment/i }))
    await waitFor(() => {
      expect(screen.getByText(/already booked/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/date & time/i), {
      target: { value: '2026-06-21T10:00' },
    })
    expect(screen.queryByText(/already booked/i)).not.toBeInTheDocument()
  })

  it('shows Cancel and Book Appointment buttons', async () => {
    renderModal()
    expect(await screen.findByText('Cancel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book appointment/i })).toBeInTheDocument()
  })

  it('disables buttons when loading', () => {
    renderModal(true, vi.fn(), true)
    expect(screen.getByRole('button', { name: /book appointment/i })).toBeDisabled()
  })
})
