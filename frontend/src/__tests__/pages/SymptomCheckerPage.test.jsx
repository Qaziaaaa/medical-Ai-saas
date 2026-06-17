import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SymptomCheckerPage from '../../pages/SymptomCheckerPage'
import * as useAIHook from '../../hooks/useAI'
import * as authHook from '../../hooks/useAuth'

vi.mock('../../hooks/useAI', () => ({
  useAI: vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function mockUseAI(overrides = {}) {
  useAIHook.useAI.mockReturnValue({
    result: null,
    loading: false,
    error: null,
    checkSymptoms: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SymptomCheckerPage />
    </MemoryRouter>
  )
}

describe('SymptomCheckerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authHook.useAuth.mockReturnValue({
      user: { name: 'Dr. Smith' },
      role: 'doctor',
      token: 'fake-token',
      logout: vi.fn(),
    })
    mockUseAI()
  })

  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /AI Symptom Checker/i })).toBeInTheDocument()
  })

  it('renders all form inputs', () => {
    renderPage()
    expect(screen.getByLabelText(/symptoms/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/medical history/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /check symptoms/i })).toBeInTheDocument()
  })

  describe('validation', () => {
    it('shows symptoms required error', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: /check symptoms/i }))

      expect(screen.getByText(/please describe your symptoms/i)).toBeInTheDocument()
    })

    it('shows age required error', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText(/symptoms/i), 'headache')
      await user.click(screen.getByRole('button', { name: /check symptoms/i }))

      expect(screen.getByText(/please enter a valid age/i)).toBeInTheDocument()
    })

    it('shows gender required error', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText(/symptoms/i), 'headache')
      await user.type(screen.getByLabelText(/age/i), '30')
      await user.click(screen.getByRole('button', { name: /check symptoms/i }))

      expect(screen.getByText(/please select a gender/i)).toBeInTheDocument()
    })

    it('clears field error on input change', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: /check symptoms/i }))
      expect(screen.getByText(/please describe your symptoms/i)).toBeInTheDocument()

      await user.type(screen.getByLabelText(/symptoms/i), 'a')
      expect(screen.queryByText(/please describe your symptoms/i)).not.toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls checkSymptoms with form data', async () => {
      const user = userEvent.setup()
      const checkSymptoms = vi.fn().mockResolvedValue()
      mockUseAI({ checkSymptoms })

      renderPage()

      await user.type(screen.getByLabelText(/symptoms/i), '  headache and fever  ')
      await user.type(screen.getByLabelText(/age/i), '35')
      await user.selectOptions(screen.getByLabelText(/gender/i), 'male')
      await user.type(screen.getByLabelText(/medical history/i), 'Asthma')
      await user.click(screen.getByRole('button', { name: /check symptoms/i }))

      await waitFor(() => {
        expect(checkSymptoms).toHaveBeenCalledWith({
          symptoms: 'headache and fever',
          patientAge: 35,
          patientGender: 'male',
          medicalHistory: 'Asthma',
        })
      })
    })

    it('does not call checkSymptoms when loading', async () => {
      const user = userEvent.setup()
      const checkSymptoms = vi.fn()
      mockUseAI({ loading: true, checkSymptoms })

      renderPage()
      await user.click(screen.getByRole('button', { name: /analysing/i }))

      expect(checkSymptoms).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      mockUseAI({ loading: true })
      renderPage()
      expect(screen.getByText(/analysing/i)).toBeInTheDocument()
    })

    it('disables inputs while loading', () => {
      mockUseAI({ loading: true })
      renderPage()
      expect(screen.getByLabelText(/symptoms/i)).toBeDisabled()
      expect(screen.getByLabelText(/age/i)).toBeDisabled()
    })
  })

  describe('error state', () => {
    it('displays error message', () => {
      mockUseAI({ error: 'AI service unavailable' })
      renderPage()
      expect(screen.getByText('AI service unavailable')).toBeInTheDocument()
    })

    it('shows retry button on error', () => {
      mockUseAI({ error: 'Something went wrong' })
      renderPage()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('calls reset and clears form on retry', async () => {
      const user = userEvent.setup()
      const reset = vi.fn()
      mockUseAI({ error: 'Error', reset })

      renderPage()
      await user.click(screen.getByRole('button', { name: /retry/i }))

      expect(reset).toHaveBeenCalled()
    })
  })

  describe('results display', () => {
    it('renders risk level badge when result has riskLevel', () => {
      mockUseAI({
        result: {
          riskLevel: 'high',
          possibleConditions: [],
          suggestedTests: [],
        },
      })
      renderPage()
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('renders possible conditions list', () => {
      mockUseAI({
        result: {
          riskLevel: 'moderate',
          possibleConditions: ['Migraine', 'Tension headache'],
          suggestedTests: [],
        },
      })
      renderPage()
      expect(screen.getByText('Migraine')).toBeInTheDocument()
      expect(screen.getByText('Tension headache')).toBeInTheDocument()
    })

    it('renders suggested tests list', () => {
      mockUseAI({
        result: {
          riskLevel: 'low',
          possibleConditions: [],
          suggestedTests: ['CBC', 'MRI'],
        },
      })
      renderPage()
      expect(screen.getByText('CBC')).toBeInTheDocument()
      expect(screen.getByText('MRI')).toBeInTheDocument()
    })

    it('renders disclaimer text', () => {
      mockUseAI({
        result: {
          riskLevel: 'low',
          possibleConditions: [],
          suggestedTests: [],
        },
      })
      renderPage()
      expect(screen.getByText(/informational purposes/i)).toBeInTheDocument()
    })

    it('shows fallback warning when result.isFallback is true', () => {
      mockUseAI({
        result: {
          isFallback: true,
        },
      })
      renderPage()
      expect(screen.getByText(/AI service temporarily unavailable/i)).toBeInTheDocument()
    })

    it('shows Reset button after results', () => {
      mockUseAI({
        result: {
          riskLevel: 'low',
          possibleConditions: [],
          suggestedTests: [],
        },
      })
      renderPage()
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })
})
