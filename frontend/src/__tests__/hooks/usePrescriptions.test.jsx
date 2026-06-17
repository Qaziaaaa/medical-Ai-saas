import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import usePrescriptions from '../../hooks/usePrescriptions'
import apiClient from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

function makeListResponse(prescriptions = [], total = 0) {
  return {
    data: {
      data: { prescriptions, total },
    },
  }
}

describe('usePrescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue(makeListResponse([], 0))
  })

  describe('initial state', () => {
    it('starts with empty prescriptions and sensible defaults', async () => {
      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      expect(result.current.prescriptions).toEqual([])
      expect(result.current.total).toBe(0)
      expect(result.current.page).toBe(1)
      expect(result.current.patientId).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('sets loading true while fetching and false after', async () => {
      let resolveGet
      apiClient.get.mockReturnValueOnce(
        new Promise((res) => { resolveGet = res })
      )

      const { result } = renderHook(() => usePrescriptions())

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolveGet(makeListResponse([], 0))
      })

      await waitFor(() => !result.current.loading)
    })
  })

  describe('initial fetch', () => {
    it('calls GET /api/prescriptions with page=1, limit=25 on mount', async () => {
      renderHook(() => usePrescriptions())

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/prescriptions', {
          params: { page: 1, limit: 25 },
        })
      })
    })

    it('includes patientId in params when set', async () => {
      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      act(() => { result.current.setPatientId('pat1') })

      await waitFor(() => {
        const calls = apiClient.get.mock.calls
        expect(calls[calls.length - 1][1].params.patientId).toBe('pat1')
      })
    })

    it('populates prescriptions and total from response', async () => {
      const fake = [{ _id: 'rx1', medicines: [] }]
      apiClient.get.mockResolvedValueOnce(makeListResponse(fake, 1))

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => expect(result.current.prescriptions.length).toBe(1))
      expect(result.current.total).toBe(1)
    })

    it('sets error state when GET fails', async () => {
      apiClient.get.mockRejectedValueOnce({
        response: { data: { message: 'Failed' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => expect(result.current.error).toBe('Failed'))
      expect(result.current.loading).toBe(false)
    })

    it('falls back to err.message when response has no message', async () => {
      apiClient.get.mockRejectedValueOnce({ message: 'Network Error' })

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => expect(result.current.error).toBe('Network Error'))
    })
  })

  describe('pagination', () => {
    it('re-fetches with new page when setPage is called', async () => {
      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      apiClient.get.mockResolvedValueOnce(makeListResponse([], 0))

      act(() => { result.current.setPage(3) })

      await waitFor(() => {
        const calls = apiClient.get.mock.calls
        expect(calls[calls.length - 1][1].params.page).toBe(3)
      })
    })
  })

  describe('setPatientId', () => {
    it('resets page to 1 when patientId changes', async () => {
      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      act(() => { result.current.setPage(2) })
      await waitFor(() => expect(result.current.page).toBe(2))

      act(() => { result.current.setPatientId('pat2') })

      await waitFor(() => expect(result.current.page).toBe(1))
    })
  })

  describe('createPrescription()', () => {
    it('POSTs to /api/prescriptions and re-fetches', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { data: { _id: 'rx2' } } })
      apiClient.get.mockResolvedValue(makeListResponse([], 0))

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      const data = { patient: 'pat1', medicines: [{ name: 'M', dosage: '10mg', frequency: '1x' }] }

      await act(async () => {
        await result.current.createPrescription(data)
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/prescriptions', data)
      expect(apiClient.get.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('sets error and re-throws when POST fails', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'Medicines required' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.createPrescription({}).catch((e) => { thrown = e })
      })

      expect(thrown).toBeTruthy()
      expect(result.current.error).toBe('Medicines required')
    })
  })

  describe('downloadPDF()', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() })
    })

    it('fetches PDF blob and triggers download', async () => {
      const blobData = new Blob(['pdf-content'])
      apiClient.get.mockResolvedValueOnce({ data: blobData })

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      let a
      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreate(tag)
        if (tag === 'a') {
          a = el
          vi.spyOn(el, 'click').mockImplementation(() => {})
        }
        return el
      })

      await act(async () => {
        await result.current.downloadPDF('rx1')
      })

      expect(apiClient.get).toHaveBeenCalledWith('/api/prescriptions/rx1/pdf', {
        responseType: 'blob',
      })
      expect(a.download).toBe('prescription-rx1.pdf')
      expect(a.click).toHaveBeenCalled()
    })

    it('handles download failure gracefully', async () => {
      apiClient.get.mockRejectedValueOnce(new Error('PDF error'))

      const { result } = renderHook(() => usePrescriptions())

      await waitFor(() => !result.current.loading)

      let thrown
      await act(async () => {
        await result.current.downloadPDF('bad').catch((e) => { thrown = e })
      })

      expect(thrown).toBeFalsy()
    })
  })
})
