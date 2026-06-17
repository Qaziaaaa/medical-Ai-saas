import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PrescriptionFormModal from '../../components/prescriptions/PrescriptionFormModal'
import apiClient from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

function renderModal(isOpen = true, onSubmit = vi.fn(), loading = false) {
  return render(
    <MemoryRouter>
      <PrescriptionFormModal
        isOpen={isOpen}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={loading}
      />
    </MemoryRouter>
  )
}

describe('PrescriptionFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue({ data: { data: { patients: mockPatients, total: 2 } } })
  })

  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByText('New Prescription')).not.toBeInTheDocument()
  })

  it('renders form when open', async () => {
    renderModal(true)
    expect(screen.getByText('New Prescription')).toBeInTheDocument()
    expect(screen.getByText('Create Prescription')).toBeInTheDocument()
  })

  it('loads patient options on open', async () => {
    renderModal(true)

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/patients?limit=200')
    })

    const select = screen.getByRole('combobox', { name: /patient/i })
    expect(select).toBeInTheDocument()
  })

  it('shows patient names in dropdown after loading', async () => {
    renderModal(true)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Williams')).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderModal(true)

    await user.click(screen.getByRole('button', { name: /create prescription/i }))

    expect(screen.getByText('Patient is required')).toBeInTheDocument()
    expect(screen.getByText('Medicine name is required')).toBeInTheDocument()
    expect(screen.getByText('Dosage is required')).toBeInTheDocument()
    expect(screen.getByText('Frequency is required')).toBeInTheDocument()
  })

  it('calls onSubmit with prescription data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal(true, onSubmit)

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /patient/i }), 'p1')
    await user.type(screen.getByPlaceholderText('e.g. Amoxicillin'), 'Amoxicillin')
    await user.type(screen.getByPlaceholderText('e.g. 500mg'), '500mg')
    await user.type(screen.getByPlaceholderText('e.g. Twice daily'), 'Twice daily')
    await user.type(screen.getByPlaceholderText('e.g. 7 days'), '7 days')

    await user.click(screen.getByRole('button', { name: /create prescription/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      patient: 'p1',
      medicines: [
        { name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days' },
      ],
      notes: '',
    })
  })

  it('allows adding multiple medicines', async () => {
    const user = userEvent.setup()
    renderModal(true)

    await user.click(screen.getByText('+ Add Medicine'))

    const nameInputs = screen.getAllByPlaceholderText('e.g. Amoxicillin')
    expect(nameInputs).toHaveLength(2)
  })

  it('removes a medicine row', async () => {
    const user = userEvent.setup()
    renderModal(true)

    await user.click(screen.getByText('+ Add Medicine'))

    const removeButtons = screen.getAllByRole('button', { name: /remove medicine/i })
    expect(removeButtons).toHaveLength(2)

    await user.click(removeButtons[0])
    const nameInputs = screen.getAllByPlaceholderText('e.g. Amoxicillin')
    expect(nameInputs).toHaveLength(1)
  })

  it('disables submit button while loading', () => {
    renderModal(true, vi.fn(), true)
    expect(screen.getByRole('button', { name: /create prescription/i })).toBeDisabled()
  })
})
