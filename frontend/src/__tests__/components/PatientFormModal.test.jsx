import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PatientFormModal from '../../components/patients/PatientFormModal'

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

function renderModal(isOpen = true, props = {}) {
  return render(
    <MemoryRouter>
      <PatientFormModal
        isOpen={isOpen}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        readOnly={false}
        initialData={null}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('PatientFormModal', () => {
  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByText('Add Patient')).not.toBeInTheDocument()
  })

  it('renders form when open', () => {
    renderModal(true)
    expect(screen.getByRole('heading', { name: /add patient/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Jane Doe')).toBeInTheDocument()
  })

  it('shows title "Edit Patient" when initialData is provided', () => {
    renderModal(true, {
      initialData: { fullName: 'Jane Doe', gender: 'female' },
    })
    expect(screen.getByText('Edit Patient')).toBeInTheDocument()
  })

  it('shows title "Patient Details" in readOnly mode', () => {
    renderModal(true, { readOnly: true })
    expect(screen.getByText('Patient Details')).toBeInTheDocument()
  })

  it('pre-fills fields when editing an existing patient', () => {
    renderModal(true, {
      initialData: {
        fullName: 'Jane Doe',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'female',
        contactNumber: '+1 555 000 0000',
        email: 'jane@example.com',
        address: '123 Main St',
        medicalHistory: 'Asthma',
      },
    })
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+1 555 000 0000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1990-05-15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Asthma')).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderModal(true)

    await user.click(screen.getByRole('button', { name: /add patient/i }))

    expect(screen.getByText('Full name is required')).toBeInTheDocument()
    expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
    expect(screen.getByText('Gender is required')).toBeInTheDocument()
    expect(screen.getByText('Contact number is required')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal(true, { onSubmit })

    await user.type(screen.getByPlaceholderText('e.g. Jane Doe'), 'John Smith')
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-20')
    await user.selectOptions(screen.getByRole('combobox', { name: /gender/i }), 'male')
    await user.type(screen.getByPlaceholderText('e.g. +1 555 000 0000'), '+1 555 111 2222')

    await user.click(screen.getByRole('button', { name: /add patient/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'John Smith',
        gender: 'male',
        contactNumber: '+1 555 111 2222',
      })
    )
  })

  it('disables submit button while loading', () => {
    renderModal(true, { loading: true })
    expect(screen.getByRole('button', { name: /add patient/i })).toBeDisabled()
  })

  it('does not show submit buttons in readOnly mode', () => {
    renderModal(true, { readOnly: true })
    expect(screen.queryByRole('button', { name: /add patient/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('shows Close button in readOnly mode', () => {
    renderModal(true, { readOnly: true })
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()
  })
})
