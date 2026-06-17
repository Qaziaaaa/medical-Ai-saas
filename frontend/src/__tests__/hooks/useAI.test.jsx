import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useAI from '../../hooks/useAI'
import apiClient from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

function makeSuccessResponse(data) {
  return { data: { data } }
}

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with null result, null error, loading false', () => {
      const { result } = renderHook(() => useAI())

      expect(result.current.result).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('checkSymptoms()', () => {
    it('POSTs to /api/ai/symptom-check and sets result', async () => {
      const conditions = [{ name: 'Migraine', probability: 0.8 }]
      apiClient.post.mockResolvedValueOnce(makeSuccessResponse(conditions))

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.checkSymptoms({ symptoms: 'headache' })
      })

      expect(apiClient.post).toHaveBeenCalledWith('/api/ai/symptom-check', {
        symptoms: 'headache',
      })
      expect(result.current.result).toEqual(conditions)
      expect(result.current.loading).toBe(false)
    })

    it('sets loading true during request and false after', async () => {
      let resolvePost
      apiClient.post.mockReturnValueOnce(
        new Promise((res) => { resolvePost = res })
      )

      const { result } = renderHook(() => useAI())

      let promise
      act(() => {
        promise = result.current.checkSymptoms({})
      })

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolvePost(makeSuccessResponse(null))
      })

      await promise
      expect(result.current.loading).toBe(false)
    })

    it('resets previous result and error before request', async () => {
      apiClient.post
        .mockResolvedValueOnce(makeSuccessResponse('first'))
        .mockResolvedValueOnce(makeSuccessResponse('second'))

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.checkSymptoms({ symptoms: 'first' })
      })
      expect(result.current.result).toBe('first')

      await act(async () => {
        await result.current.checkSymptoms({ symptoms: 'second' })
      })
      expect(result.current.result).toBe('second')
      expect(result.current.error).toBeNull()
    })

    it('sets error when request fails', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'AI unavailable' } },
        message: 'Request failed',
      })

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.checkSymptoms({})
      })

      expect(result.current.error).toBe('AI unavailable')
      expect(result.current.result).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('falls back to generic message when no response or error message', async () => {
      apiClient.post.mockRejectedValueOnce(new Error())

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.checkSymptoms({})
      })

      expect(result.current.error).toBe('AI service error. Please try again.')
    })

    it('uses err.response.data.message when available', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { message: 'Custom error' } },
        message: 'Fallback',
      })

      const { result } = renderHook(() => useAI())

      await act(async () => {
        await result.current.checkSymptoms({})
      })

      expect(result.current.error).toBe('Custom error')
    })
  })

  describe('reset()', () => {
    it('clears result and error', async () => {
      apiClient.post.mockRejectedValueOnce(new Error('err'))
      const { result } = renderHook(() => useAI())

      await act(async () => { await result.current.checkSymptoms({}) })
      expect(result.current.error).toBeTruthy()

      act(() => { result.current.reset() })

      expect(result.current.result).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })
})
