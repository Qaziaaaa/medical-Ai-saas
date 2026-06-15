import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../lib/axios.js'

/**
 * usePrescriptions — encapsulates prescription list state and operations.
 *
 * Exposes:
 *   prescriptions     — array of prescription objects for the current page
 *   total             — total count matching current filter
 *   loading           — true while a fetch is in-flight
 *   error             — error message string, or null
 *   page              — current page number (1-indexed)
 *   setPage           — setter for page
 *   patientId         — current patient ID filter
 *   setPatientId      — setter for patientId filter (triggers re-fetch + reset page)
 *   createPrescription(data) — POST /api/prescriptions, then re-fetches
 *   downloadPDF(id)          — downloads prescription PDF via axios
 */
export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [patientId, setPatientIdState] = useState('')
  const [page, setPage] = useState(1)

  const pageRef = useRef(page)
  pageRef.current = page

  const patientIdRef = useRef(patientId)
  patientIdRef.current = patientId

  const setPatientId = useCallback((id) => {
    setPatientIdState(id)
    setPage(1)
  }, [])

  const fetchPrescriptions = useCallback(async (currentPage, currentPatientId) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: currentPage, limit: 25 }
      if (currentPatientId) params.patientId = currentPatientId

      const response = await apiClient.get('/api/prescriptions', { params })
      const { data } = response.data
      setPrescriptions(data?.prescriptions ?? data ?? [])
      setTotal(data?.total ?? 0)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrescriptions(page, patientId)
  }, [page, patientId, fetchPrescriptions])

  const createPrescription = useCallback(
    async (data) => {
      setError(null)
      try {
        await apiClient.post('/api/prescriptions', data)
        await fetchPrescriptions(pageRef.current, patientIdRef.current)
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
    total,
    loading,
    error,
    page,
    setPage,
    patientId,
    setPatientId,
    createPrescription,
    downloadPDF,
  }
}

export default usePrescriptions
