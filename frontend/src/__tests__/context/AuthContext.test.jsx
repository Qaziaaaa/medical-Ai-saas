import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import apiClient from '../../lib/axios'

// Mock the apiClient so we don't make real HTTP calls
vi.mock('../../lib/axios', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Helper: renders a component inside AuthProvider + MemoryRouter
function renderWithAuth(ui, { initialEntries = ['/'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )
}

// Simple consumer component that exposes auth context values
function AuthConsumer() {
  const { user, token, role, isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{role ?? 'null'}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="token">{token ?? 'null'}</span>
      <button onClick={() => login({ email: 'doc@clinic.com', password: 'pass' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initial state', () => {
    it('is unauthenticated when localStorage is empty', () => {
      renderWithAuth(<AuthConsumer />)
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
      expect(screen.getByTestId('token').textContent).toBe('null')
      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('role').textContent).toBe('null')
    })

    it('restores auth state from localStorage on mount', () => {
      const storedUser = { _id: 'u1', name: 'Dr. Smith', role: 'doctor' }
      localStorage.setItem('clinic_token', 'stored-jwt')
      localStorage.setItem('clinic_user', JSON.stringify(storedUser))

      renderWithAuth(<AuthConsumer />)

      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
      expect(screen.getByTestId('token').textContent).toBe('stored-jwt')
      expect(screen.getByTestId('role').textContent).toBe('doctor')
    })

    it('handles corrupted clinic_user in localStorage gracefully', () => {
      localStorage.setItem('clinic_token', 'some-token')
      localStorage.setItem('clinic_user', 'not-valid-json{{{')

      // Should not throw
      renderWithAuth(<AuthConsumer />)
      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('role').textContent).toBe('null')
    })
  })

  describe('login()', () => {
    it('stores token and user in state and localStorage after successful login', async () => {
      const fakeUser = { _id: 'u2', name: 'Dr. Jones', role: 'doctor' }
      const fakeToken = 'new-jwt-token'
      apiClient.post.mockResolvedValueOnce({
        data: { data: { token: fakeToken, user: fakeUser } },
      })

      renderWithAuth(<AuthConsumer />)

      await act(async () => {
        await userEvent.click(screen.getByText('Login'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
        expect(screen.getByTestId('token').textContent).toBe(fakeToken)
        expect(screen.getByTestId('role').textContent).toBe('doctor')
      })

      expect(localStorage.getItem('clinic_token')).toBe(fakeToken)
      expect(JSON.parse(localStorage.getItem('clinic_user'))).toEqual(fakeUser)
    })

    it('calls POST /api/auth/login with provided credentials', async () => {
      const fakeUser = { _id: 'u3', name: 'Receptionist', role: 'receptionist' }
      apiClient.post.mockResolvedValueOnce({
        data: { data: { token: 'tok', user: fakeUser } },
      })

      renderWithAuth(<AuthConsumer />)

      await act(async () => {
        await userEvent.click(screen.getByText('Login'))
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'doc@clinic.com',
        password: 'pass',
      })
    })
  })

  describe('logout()', () => {
    it('clears state and localStorage on logout', async () => {
      const storedUser = { _id: 'u4', name: 'Dr. Lee', role: 'doctor' }
      localStorage.setItem('clinic_token', 'existing-token')
      localStorage.setItem('clinic_user', JSON.stringify(storedUser))

      renderWithAuth(<AuthConsumer />)

      // Confirm authenticated first
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')

      await act(async () => {
        await userEvent.click(screen.getByText('Logout'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
        expect(screen.getByTestId('token').textContent).toBe('null')
        expect(screen.getByTestId('user').textContent).toBe('null')
        expect(screen.getByTestId('role').textContent).toBe('null')
      })

      expect(localStorage.getItem('clinic_token')).toBeNull()
      expect(localStorage.getItem('clinic_user')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('is true when a token exists', () => {
      localStorage.setItem('clinic_token', 'valid-token')
      localStorage.setItem('clinic_user', JSON.stringify({ role: 'doctor' }))

      renderWithAuth(<AuthConsumer />)
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true')
    })

    it('is false when no token exists', () => {
      renderWithAuth(<AuthConsumer />)
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false')
    })
  })
})
