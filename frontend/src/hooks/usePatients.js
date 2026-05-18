import { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../lib/axios.js'

/**
 * usePatients — encapsulates all patient CRUD operations and list state.
 *
 * Exposes:
 *   patients   — array of patient objects from the current page
 *   total      — total number of patients matching the current search
 *   loading    — true while a fetch is in-flight
 *   error      — error message string, or null
 *   page       — current page number (1-indexed)
 *   setPage    — setter for page
 *   search     — current search string
 *   setSearch  — setter for search (triggers debounced re-fetch)
 *   createPatient(data)     — POST /api/patients, then re-fetches list
 *   updatePatient(id, data) — PUT  /api/patients/:id, then re-fetches list
 *   deletePatient(id)       — DELETE /api/patients/:id, then re-fetches list
 *
 * Search is debounced 300 ms. Page resets to 1 whenever the search changes.
 */
export function usePatients() {
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Holds the debounced search value that actually triggers fetches
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Keep a stable ref to the latest page so fetchPatients closure is always fresh
  const pageRef = useRef(page)
  pageRef.current = page

  // Debounce: when search changes, wait 300 ms then update debouncedSearch
  // Also reset page to 1 so results start from the beginning
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  /**
   * fetchPatients — GET /api/patients with current page + debounced search.
   * Wrapped in useCallback so it can be called from mutation helpers.
   */
  const fetchPatients = useCallback(async (currentPage, currentSearch) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/api/patients', {
        params: {
          page: currentPage,
          limit: 25,
          search: currentSearch,
        },
      })
      const { data } = response.data
      setPatients(data?.patients ?? data ?? [])
      setTotal(data?.total ?? response.data?.total ?? 0)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch whenever page or debounced search changes
  useEffect(() => {
    fetchPatients(page, debouncedSearch)
  }, [page, debouncedSearch, fetchPatients])

  /**
   * createPatient(data) — POST /api/patients, then re-fetches the list.
   */
  const createPatient = useCallback(
    async (data) => {
      setError(null)
      try {
        await apiClient.post('/api/patients', data)
        await fetchPatients(pageRef.current, debouncedSearch)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchPatients, debouncedSearch]
  )

  /**
   * updatePatient(id, data) — PUT /api/patients/:id, then re-fetches the list.
   */
  const updatePatient = useCallback(
    async (id, data) => {
      setError(null)
      try {
        await apiClient.put(`/api/patients/${id}`, data)
        await fetchPatients(pageRef.current, debouncedSearch)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchPatients, debouncedSearch]
  )

  /**
   * deletePatient(id) — DELETE /api/patients/:id, then re-fetches the list.
   */
  const deletePatient = useCallback(
    async (id) => {
      setError(null)
      try {
        await apiClient.delete(`/api/patients/${id}`)
        await fetchPatients(pageRef.current, debouncedSearch)
      } catch (err) {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    },
    [fetchPatients, debouncedSearch]
  )

  return {
    patients,
    total,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    createPatient,
    updatePatient,
    deletePatient,
  }
}

export default usePatients
