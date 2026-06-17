import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useAppointments from '../../hooks/useAppointments'
import apiClient from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

function makeListResponse(appointments = [], total = 0) {
  return {
    data: {
      data: { appointments, total },
    },
  }
}

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue(makeListResponse([], 0))
  })

  describe('initial state', () => {
    it('starts with empty appointments and sensible defaults', async () => {
      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      expect(result.current.appointments).toEqual([])
      expect(result.current.total).toBe(0)
      expect(result.current.page).toBe(1)
      expect(result.current.filters).toEqual({ status: '', dateFrom: '', dateTo: '' })
      expect(result.current.error).toBeNull()
    })

    it('sets loading true while fetching and false after', async () => {
      let resolveGet
      apiClient.get.mockReturnValueOnce(
        new Promise((res) => { resolveGet = res })
      )

      const { result } = renderHook(() => useAppointments())

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolveGet(makeListResponse([], 0))
      })

      await waitFor(() => !result.current.loading)
    })
  })

  describe('initial fetch', () => {
    it('calls GET /api/appointments with page=1, limit=20 on mount', async () => {
      renderHook(() => useAppointments())

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/appointments', {
          params: { page: 1, limit: 20 },
        })
      })
    })

    it('includes filter params when set', async () => {
      apiClient.get.mockResolvedValueOnce(makeListResponse([{ _id: 'a1' }], 1))

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      act(() => {
        result.current.setFilters({ status: 'pending', dateFrom: '2025-01-01', dateTo: '2025-01-31' })
      })

      await waitFor(() => {
        const calls = apiClient.get.mock.calls
        const params = calls[calls.length - 1][1].params
        expect(params.status).toBe('pending')
        expect(params.dateFrom).toBe('2025-01-01')
        expect(params.dateTo).toBe('2025-01-31')
      })
    })

    it('populates appointments and total from response', async () => {
      const fake = [{ _id: 'a1', status: 'pending' }, { _id: 'a2', status: 'confirmed' }]
      apiClient.get.mockResolvedValueOnce(makeListResponse(fake, 2))

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => expect(result.current.appointments.length).toBe(2))
      expect(result.current.total).toBe(2)
    })

    it('sets error state when GET fails', async () => {
      apiClient.get.mockRejectedValueOnce({
        response: { data: { message: 'Server error' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => expect(result.current.error).toBe('Server error'))
      expect(result.current.loading).toBe(false)
    })

    it('falls back to err.message when response has no message', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network Error' })

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => expect(result.current.error).toBe('Network Error'))
    })
  })

  describe('pagination', () => {
    it('re-fetches with new page when setPage is called', async () => {
      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      act(() => { result.current.setPage(3) })

      await waitFor(() => {
        const calls = apiClient.get.mock.calls
        expect(calls[calls.length - 1][1].params.page).toBe(3)
      })
    })
  })

  describe('setFilters', () => {
    it('resets page to 1 when filters change', async () => {
      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      act(() => { result.current.setPage(2) })
      await waitFor(() => expect(result.current.page).toBe(2))

      act(() => { result.current.setFilters({ status: 'confirmed' }) })

      await waitFor(() => expect(result.current.page).toBe(1))
    })

    it('accepts functional updater', async () => {
      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      act(() => {
        result.current.setFilters((prev) => ({ ...prev, status: 'completed' }))
      })

      await waitFor(() => {
        expect(result.current.filters.status).toBe('completed')
      })
    })
  })

  describe('createAppointment()', () => {
    it('POSTs to /api/appointments and re-fetches', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { data: { _id: 'new' } } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      const data = { patient: 'p1', scheduledAt: new Date() }

      await act(async () => {
        await result.current.createAppointment(data)
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/appointments', data)
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when POST fails', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'Missing fields' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.createAppointment({}).catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Missing fields')
    })
  })

  describe('updateStatus()', () => {
    it('PATHs /api/appointments/:id/status and re-fetches', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { data: {} } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      await act(async () => {
        await result.current.updateStatus('a1', 'confirmed')
      })

      expect(apiClient.patch).toHaveBeenCalledWith('/api/appointments/a1/status', { status: 'confirmed' })
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when PATCH fails', async () => {
      apiClient.patch.mockRejectedValueOnce({
        response: { data: { message: 'Invalid transition' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => useAppointments())

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.updateStatus('a1', 'invalid').catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Invalid transition')
    })
  })
})
