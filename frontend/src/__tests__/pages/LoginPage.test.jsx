import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/LoginPage'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function renderLoginPage() {
  const login = vi.fn()
  authHook.useAuth.mockReturnValue({ login })

  const result = render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )

  return { login, ...result }
}

function emailInput() { return screen.getByPlaceholderText('you@clinic.com') }
function passwordInput() { return screen.getByPlaceholderText('••••••••') }

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password inputs', () => {
    renderLoginPage()
    expect(emailInput()).toBeInTheDocument()
    expect(passwordInput()).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows brand name AI Clinic', () => {
    renderLoginPage()
    expect(screen.getAllByText('AI Clinic').length).toBeGreaterThanOrEqual(1)
  })

  describe('validation', () => {
    it('shows email required error on empty submit', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(screen.getByText('Email is required.')).toBeInTheDocument()
      expect(screen.getByText('Password is required.')).toBeInTheDocument()
    })

    it('shows invalid email error for bad format', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.type(emailInput(), 'not-an-email')
      await user.type(passwordInput(), 'secret')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    })

    it('clears field error on input change', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      await user.click(screen.getByRole('button', { name: /sign in/i }))
      expect(screen.getByText('Email is required.')).toBeInTheDocument()

      await user.type(emailInput(), 'a')
      expect(screen.queryByText('Email is required.')).not.toBeInTheDocument()
    })

    it('shows email too long error', async () => {
      const user = userEvent.setup()
      renderLoginPage()

      fireEvent.change(emailInput(), { target: { value: 'a@b.' + 'b'.repeat(251) } })
      await user.type(passwordInput(), 'secret')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(screen.getByText('Email must be 254 characters or fewer.')).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls login with trimmed email and password on submit', async () => {
      const user = userEvent.setup()
      const { login } = renderLoginPage()

      await user.type(emailInput(), '  doc@clinic.com  ')
      await user.type(passwordInput(), 'secret123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(login).toHaveBeenCalledWith({ email: 'doc@clinic.com', password: 'secret123' })
    })

    it('shows server error on login failure', async () => {
      const user = userEvent.setup()
      const { login } = renderLoginPage()
      login.mockRejectedValueOnce({
        response: { data: { message: 'Invalid credentials' } },
      })

      await user.type(emailInput(), 'doc@c.com')
      await user.type(passwordInput(), 'wrong')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    })

    it('shows fallback error message when no server message', async () => {
      const user = userEvent.setup()
      const { login } = renderLoginPage()
      login.mockRejectedValueOnce(new Error('Network error'))

      await user.type(emailInput(), 'doc@c.com')
      await user.type(passwordInput(), 'pass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(await screen.findByText(/Login failed/i)).toBeInTheDocument()
    })

    it('disables button while loading', async () => {
      const user = userEvent.setup()
      const { login } = renderLoginPage()
      login.mockImplementationOnce(() => new Promise(() => {}))

      await user.type(emailInput(), 'doc@c.com')
      await user.type(passwordInput(), 'pass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })
  })

  describe('branding', () => {
    it('renders feature list', () => {
      renderLoginPage()
      expect(screen.getByText(/Role-based access/i)).toBeInTheDocument()
      expect(screen.getByText(/AI symptom checker/i)).toBeInTheDocument()
      expect(screen.getByText(/One-click prescription/i)).toBeInTheDocument()
    })

    it('renders help text', () => {
      renderLoginPage()
      expect(screen.getByText(/Contact your clinic administrator/i)).toBeInTheDocument()
    })
  })
})
