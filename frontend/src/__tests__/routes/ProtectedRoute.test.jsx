import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../routes/ProtectedRoute'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function renderWithProtectedRoute({ isAuthenticated = false, role = null, allowedRoles } = {}) {
  authHook.useAuth.mockReturnValue({ isAuthenticated, role })

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div data-testid="protected-content">Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when authenticated and no role restriction', () => {
    renderWithProtectedRoute({ isAuthenticated: true, role: 'doctor' })
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    renderWithProtectedRoute({ isAuthenticated: false })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated with matching role', () => {
    renderWithProtectedRoute({ isAuthenticated: true, role: 'doctor', allowedRoles: ['doctor'] })
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('renders children when authenticated with one of allowed roles', () => {
    renderWithProtectedRoute({ isAuthenticated: true, role: 'receptionist', allowedRoles: ['doctor', 'receptionist'] })
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('redirects to /unauthorized when role does not match allowedRoles', () => {
    renderWithProtectedRoute({ isAuthenticated: true, role: 'receptionist', allowedRoles: ['doctor'] })
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('redirects to /unauthorized when role is null but allowedRoles specified', () => {
    renderWithProtectedRoute({ isAuthenticated: true, role: null, allowedRoles: ['doctor'] })
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument()
  })
})
