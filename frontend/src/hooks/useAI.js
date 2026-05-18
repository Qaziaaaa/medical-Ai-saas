import { useState, useCallback } from 'react'
import apiClient from '../lib/axios.js'

/**
 * useAI — encapsulates AI symptom-check state and actions.
 *
 * Exposes:
 *   result          — the AI response object, or null
 *   loading         — true while the request is in-flight
 *   error           — error message string, or null
 *   checkSymptoms(payload) — POST /api/ai/symptom-check
 */
export function useAI() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const checkSymptoms = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await apiClient.post('/api/ai/symptom-check', payload)
      const { data } = response.data
      setResult(data ?? response.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'AI service error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, checkSymptoms, reset }
}

export default useAI
