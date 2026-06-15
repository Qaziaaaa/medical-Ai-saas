import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import usePatients from '../../hooks/usePatients'
import apiClient from '../../lib/axios'

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
    apiClient.get.mockResolvedValue(makeListResponse([], 0))
  })

  describe('initial state', () => {
    it('starts with empty patients array and sensible defaults', async () => {
      const { result } = renderHook(() => usePatients())

      await waitFor(() => !result.current.loading)

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

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolveGet(makeListResponse([], 0))
      })

      await waitFor(() => !result.current.loading)
    })
  })

  describe('initial fetch', () => {
    it('calls GET /api/patients with page=1, limit=25, search="" on mount', async () => {
      renderHook(() => usePatients())

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/patients', {
          params: { page: 1, limit: 25, search: '' },
        })
      })
    })

    it('populates patients and total from response', async () => {
      const fakePatients = [
        { _id: 'p1', name: 'Alice' },
        { _id: 'p2', name: 'Bob' },
      ]
      apiClient.get.mockResolvedValueOnce(makeListResponse(fakePatients, 2))

      const { result } = renderHook(() => usePatients())

      await waitFor(() => expect(result.current.patients.length).toBe(2))

      expect(result.current.patients).toEqual(fakePatients)
      expect(result.current.total).toBe(2)
    })

    it('sets error state when GET fails', async () => {
      apiClient.get.mockRejectedValueOnce({
        response: { data: { message: 'Unauthorized' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePatients())

      await waitFor(() => expect(result.current.error).toBe('Unauthorized'))

      expect(result.current.loading).toBe(false)
    })

    it('falls back to err.message when response has no message', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network Error' })

      const { result } = renderHook(() => usePatients())

      await waitFor(() => expect(result.current.error).toBe('Network Error'))
    })
  })

  describe('pagination', () => {
    it('re-fetches with new page when setPage is called', async () => {
      const { result } = renderHook(() => usePatients())

      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      await act(async () => {
        result.current.setPage(3)
      })

      await waitFor(() => {
        const calls = apiClient.get.mock.calls
        expect(calls[calls.length - 1][1].params.page).toBe(3)
      })
    })
  })

  describe('createPatient()', () => {
    it('POSTs to /api/patients and re-fetches the list', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { data: { _id: 'p3' } } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

      await waitFor(() => !result.current.loading)

      const newPatient = { name: 'Charlie', dob: '1990-01-01' }

      await act(async () => {
        await result.current.createPatient(newPatient)
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/patients', newPatient)
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when POST fails', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'Validation failed' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePatients())

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.createPatient({ name: '' }).catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Validation failed')
    })
  })

  describe('updatePatient()', () => {
    it('PUTs to /api/patients/:id and re-fetches the list', async () => {
      apiClient.put.mockResolvedValueOnce({ data: { data: {} } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

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

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.updatePatient('bad-id', {}).catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Not found')
    })
  })

  describe('deletePatient()', () => {
    it('DELETEs /api/patients/:id and re-fetches the list', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: {} })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePatients())

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

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.deletePatient('p99').catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Server error')
    })
  })
})
