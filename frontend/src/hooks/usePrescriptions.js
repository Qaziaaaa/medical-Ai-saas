import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../lib/axios.js'

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

  const downloadPDF = useCallback(async (id) => {
    try {
      const response = await apiClient.get(`/api/prescriptions/${id}/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `prescription-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
    }
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
