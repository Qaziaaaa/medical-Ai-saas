import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import App from '../App'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    role: null,
    user: null,
    token: null,
    logout: vi.fn(),
  })),
}))

vi.mock('../pages/LoginPage', () => ({
  default: () => <div>LoginPage</div>,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('renders auth provider and router wrapper', () => {
    render(<App />)
    expect(screen.getByText('LoginPage')).toBeDefined()
  })
})
