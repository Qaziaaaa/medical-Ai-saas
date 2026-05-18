import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../lib/axios.js'

/**
 * useAppointments — encapsulates appointment list state and CRUD operations.
 *
 * Exposes:
 *   appointments  — array of appointment objects for the current page
 *   total         — total count matching current filters
 *   loading       — true while a fetch is in-flight
 *   error         — error message string, or null
 *   page          — current page number (1-indexed)
 *   setPage       — setter for page
 *   filters       — { status, dateFrom, dateTo }
 *   setFilters    — setter for filters (resets page to 1)
 *   createAppointment(data)       — POST /api/appointments, then re-fetches
 *   updateStatus(id, status)      — PATCH /api/appointments/:id/status, then re-fetches
 */
export function useAppointments() {
  const [appointments, setAppointments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFiltersState] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
  })

  const pageRef = useRef(page)
  pageRef.current = page

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
    setPage(1)
  }, [])

  const fetchAppointments = useCallback(async (currentPage, currentFilters) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: currentPage, limit: 20 }
      if (currentFilters.status) params.status = currentFilters.status
      if (currentFilters.dateFrom) params.dateFrom = currentFilters.dateFrom
      if (currentFilters.dateTo) params.dateTo = currentFilters.dateTo

      const response = await apiClient.get('/api/appointments', { params })
      const { data } = response.data
      setAppointments(data?.appointments ?? data ?? [])
      setTotal(data?.total ?? response.data?.total ?? 0)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments(page, filters)
  }, [page, filters, fetchAppointments])

  const createAppointment = useCallback(
    async (data) => {
      setError(null)
      try {
        await apiClient.post('/api/appointments', data)
        await fetchAppointments(pageRef.current, filtersRef.current)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchAppointments]
  )

  const updateStatus = useCallback(
    async (id, status) => {
      setError(null)
      try {
        await apiClient.patch(`/api/appointments/${id}/status`, { status })
        await fetchAppointments(pageRef.current, filtersRef.current)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchAppointments]
  )

  return {
    appointments,
    total,
    loading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    createAppointment,
    updateStatus,
  }
}

export default useAppointments
