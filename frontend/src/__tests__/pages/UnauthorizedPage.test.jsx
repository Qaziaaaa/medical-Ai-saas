import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UnauthorizedPage from '../../pages/UnauthorizedPage'

describe('UnauthorizedPage', () => {
  it('renders the page text', () => {
    render(<UnauthorizedPage />)
    expect(screen.getByText('UnauthorizedPage')).toBeInTheDocument()
  })
})
