import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockAuth(overrides = {}) {
  authHook.useAuth.mockReturnValue({
    user: { name: 'Dr. Smith' },
    role: 'doctor',
    logout: vi.fn(),
    ...overrides,
  })
}

function renderSidebar(isOpen = false) {
  return render(
    <MemoryRouter>
      <Sidebar isOpen={isOpen} onClose={vi.fn()} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth()
  })

  it('renders AI Clinic logo text', () => {
    renderSidebar()
    expect(screen.getByText('AI Clinic')).toBeInTheDocument()
  })

  it('shows Dashboard link for doctor', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows doctor-only links (Symptom Checker)', () => {
    renderSidebar()
    expect(screen.getByText('AI Symptom Checker')).toBeInTheDocument()
  })

  it('hides doctor-only links for receptionist', () => {
    mockAuth({ role: 'receptionist' })
    renderSidebar()
    expect(screen.queryByText('AI Symptom Checker')).not.toBeInTheDocument()
  })

  it('shows shared links for doctor', () => {
    renderSidebar()
    expect(screen.getByText('Patients')).toBeInTheDocument()
    expect(screen.getByText('Appointments')).toBeInTheDocument()
    expect(screen.getByText('Prescriptions')).toBeInTheDocument()
  })

  it('shows shared links for receptionist', () => {
    mockAuth({ role: 'receptionist' })
    renderSidebar()
    expect(screen.getByText('Patients')).toBeInTheDocument()
    expect(screen.getByText('Appointments')).toBeInTheDocument()
    expect(screen.getByText('Prescriptions')).toBeInTheDocument()
  })

  it('shows user name', () => {
    renderSidebar()
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
  })

  it('shows user role', () => {
    renderSidebar()
    expect(screen.getByText('doctor')).toBeInTheDocument()
  })

  it('shows Sign out button', () => {
    renderSidebar()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('shows mobile backdrop when open', () => {
    const { container } = renderSidebar(true)
    const backdrop = container.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()
  })

  it('hides mobile backdrop when closed', () => {
    const { container } = renderSidebar(false)
    const backdrop = container.querySelector('.fixed.inset-0')
    expect(backdrop).not.toBeInTheDocument()
  })

  it('shows user initial avatar', () => {
    renderSidebar()
    const avatars = screen.getAllByText('D')
    expect(avatars.length).toBeGreaterThanOrEqual(1)
  })
})
