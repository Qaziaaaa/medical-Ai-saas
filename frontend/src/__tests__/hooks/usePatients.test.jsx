import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import usePatients from '../../hooks/usePatients'
import apiClient from '../../lib/axios'

// Mock apiClient so no real HTTP calls are made
vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Helper: build a standard successful GET response
function makeListResponse(patients = [], total = 0) {
  return {
    data: {
      data: { patients, total },
    },
  }
}

describe('usePatients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Default: GET returns empty list
    apiClient.get.mockResolvedValue(makeListResponse([], 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty patients array and sensible defaults', async () => {
      const { result } = renderHook(() => usePatients())

      expect(result.current.patients).toEqual([])
      expect(result.current.total).toBe(0)
      expect(result.current.page).toBe(1)
      expect(result.current.search).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('sets loading true while fetching and false after', async () => {
      let resolveGet
      apiClient.get.mockReturnValueOnce(
        new Promise((res) => {
          resolveGet = res
        })
      )

      const { result } = renderHook(() => usePatients())

      // Advance timers so the debounce fires and fetch starts
      await act(async () => {
        vi.runAllTimers()
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolveGet(makeListResponse([], 0))
      })

      expect(result.current.loading).toBe(false)
    })
  })

  // ─── fetchPatients on mount ───────────────────────────────────────────────

  describe('initial fetch', () => {
    it('calls GET /api/patients with page=1, limit=25, search="" on mount', async () => {
      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })

      await waitFor(() => !result.current.loading)

      expect(apiClient.get).toHaveBeenCalledWith('/api/patients', {
        params: { page: 1, limit: 25, search: '' },
      })
    })

    it('populates patients and total from response', async () => {
      const fakePatients = [
        { _id: 'p1', name: 'Alice' },
        { _id: 'p2', name: 'Bob' },
      ]
      apiClient.get.mockResolvedValueOnce(makeListResponse(fakePatients, 2))

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })

      await waitFor(() => result.current.patients.length === 2)

      expect(result.current.patients).toEqual(fakePatients)
      expect(result.current.total).toBe(2)
    })

    it('sets error state when GET fails', async () => {
      apiClient.get.mockRejectedValueOnce({
        response: { data: { message: 'Unauthorized' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })

      await waitFor(() => result.current.error !== null)

      expect(result.current.error).toBe('Unauthorized')
      expect(result.current.loading).toBe(false)
    })

    it('falls back to err.message when response has no message', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network Error' })

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })

      await waitFor(() => result.current.error !== null)

      expect(result.current.error).toBe('Network Error')
    })
  })

  // ─── Pagination ───────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('re-fetches with new page when setPage is called', async () => {
      const { result } = renderHook(() => usePatients())

      // Let initial fetch complete
      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      await act(async () => {
        result.current.setPage(3)
      })

      await waitFor(() => !result.current.loading)

      const calls = apiClient.get.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[1].params.page).toBe(3)
    })
  })

  // ─── Search debounce ──────────────────────────────────────────────────────

  describe('search debounce', () => {
    it('does NOT call API immediately when search changes', async () => {
      const { result } = renderHook(() => usePatients())

      // Let initial fetch complete
      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      const callCountBefore = apiClient.get.mock.calls.length

      // Change search but do NOT advance timers
      act(() => {
        result.current.setSearch('John')
      })

      // No new call should have been made yet
      expect(apiClient.get.mock.calls.length).toBe(callCountBefore)
    })

    it('calls API after 300 ms debounce with the search term', async () => {
      const { result } = renderHook(() => usePatients())

      // Let initial fetch complete
      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      act(() => {
        result.current.setSearch('Alice')
      })

      // Advance exactly 300 ms
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => !result.current.loading)

      const calls = apiClient.get.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[1].params.search).toBe('Alice')
    })

    it('resets page to 1 when search changes', async () => {
      const { result } = renderHook(() => usePatients())

      // Go to page 2 first
      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))
      await act(async () => {
        result.current.setPage(2)
      })
      await waitFor(() => !result.current.loading)
      expect(result.current.page).toBe(2)

      // Now change search — page should reset to 1
      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))
      act(() => {
        result.current.setSearch('Bob')
      })
      await act(async () => {
        vi.advanceTimersByTime(300)
      })
      await waitFor(() => !result.current.loading)

      expect(result.current.page).toBe(1)
    })

    it('cancels pending debounce when search changes rapidly', async () => {
      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      const callCountBefore = apiClient.get.mock.calls.length

      // Rapid changes — only the last one should fire
      act(() => {
        result.current.setSearch('A')
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        result.current.setSearch('Al')
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        result.current.setSearch('Ali')
      })

      // Still within debounce window — no new call yet
      expect(apiClient.get.mock.calls.length).toBe(callCountBefore)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      await act(async () => {
        vi.advanceTimersByTime(300)
      })
      await waitFor(() => !result.current.loading)

      // Only one additional call, with the final search value
      const newCalls = apiClient.get.mock.calls.slice(callCountBefore)
      expect(newCalls.length).toBe(1)
      expect(newCalls[0][1].params.search).toBe('Ali')
    })
  })

  // ─── createPatient ────────────────────────────────────────────────────────

  describe('createPatient()', () => {
    it('POSTs to /api/patients and re-fetches the list', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { data: { _id: 'p3' } } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      const newPatient = { name: 'Charlie', dob: '1990-01-01' }

      await act(async () => {
        await result.current.createPatient(newPatient)
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/patients', newPatient)
      // GET should have been called again after create
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when POST fails', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'Validation failed' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      await expect(
        act(async () => {
          await result.current.createPatient({ name: '' })
        })
      ).rejects.toBeTruthy()

      expect(result.current.error).toBe('Validation failed')
    })
  })

  // ─── updatePatient ────────────────────────────────────────────────────────

  describe('updatePatient()', () => {
    it('PUTs to /api/patients/:id and re-fetches the list', async () => {
      apiClient.put.mockResolvedValueOnce({ data: { data: {} } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      await act(async () => {
        await result.current.updatePatient('p1', { name: 'Updated Name' })
      })

      expect(apiClient.put).toHaveBeenCalledWith('/api/patients/p1', {
        name: 'Updated Name',
      })
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when PUT fails', async () => {
      apiClient.put.mockRejectedValueOnce({
        response: { data: { message: 'Not found' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      await expect(
        act(async () => {
          await result.current.updatePatient('bad-id', {})
        })
      ).rejects.toBeTruthy()

      expect(result.current.error).toBe('Not found')
    })
  })

  // ─── deletePatient ────────────────────────────────────────────────────────

  describe('deletePatient()', () => {
    it('DELETEs /api/patients/:id and re-fetches the list', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: {} })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      await act(async () => {
        await result.current.deletePatient('p2')
      })

      expect(apiClient.delete).toHaveBeenCalledWith('/api/patients/p2')
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when DELETE fails', async () => {
      apiClient.delete.mockRejectedValueOnce({
        message: 'Server error',
      })

      const { result } = renderHook(() => usePatients())

      await act(async () => {
        vi.runAllTimers()
      })
      await waitFor(() => !result.current.loading)

      await expect(
        act(async () => {
          await result.current.deletePatient('p99')
        })
      ).rejects.toBeTruthy()

      expect(result.current.error).toBe('Server error')
    })
  })
})
