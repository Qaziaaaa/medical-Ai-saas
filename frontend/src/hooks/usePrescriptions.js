import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../lib/axios.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * usePrescriptions — encapsulates prescription list state and operations.
 *
 * Exposes:
 *   prescriptions     — array of prescription objects
 *   loading           — true while a fetch is in-flight
 *   error             — error message string, or null
 *   patientId         — current patient ID filter
 *   setPatientId      — setter for patientId filter (triggers re-fetch)
 *   createPrescription(data) — POST /api/prescriptions, then re-fetches
 *   downloadPDF(id)          — opens PDF in a new browser tab
 */
export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [patientId, setPatientId] = useState('')

  const patientIdRef = useRef(patientId)
  patientIdRef.current = patientId

  const fetchPrescriptions = useCallback(async (currentPatientId) => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (currentPatientId) params.patientId = currentPatientId

      const response = await apiClient.get('/api/prescriptions', { params })
      const { data } = response.data
      setPrescriptions(data?.prescriptions ?? data ?? [])
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrescriptions(patientId)
  }, [patientId, fetchPrescriptions])

  const createPrescription = useCallback(
    async (data) => {
      setError(null)
      try {
        await apiClient.post('/api/prescriptions', data)
        await fetchPrescriptions(patientIdRef.current)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchPrescriptions]
  )

  const downloadPDF = useCallback((id) => {
    window.open(`${API_BASE_URL}/api/prescriptions/${id}/pdf`, '_blank', 'noopener,noreferrer')
  }, [])

  return {
    prescriptions,
    loading,
    error,
    patientId,
    setPatientId,
    createPrescription,
    downloadPDF,
  }
}

export default usePrescriptions
