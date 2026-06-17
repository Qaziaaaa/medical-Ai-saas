import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFoundPage from '../../pages/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders the page text', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('NotFoundPage')).toBeInTheDocument()
  })
})
