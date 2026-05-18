import axios from 'axios'

/**
 * Configured Axios instance for all API calls.
 *
 * - baseURL: read from VITE_API_BASE_URL env variable
 * - Request interceptor: attaches Authorization: Bearer <token> from localStorage key 'clinic_token'
 * - Response interceptor: on 401, clears 'clinic_token' and 'clinic_user' from localStorage
 *   and redirects to /login
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach JWT from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('clinic_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 by clearing auth state and redirecting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('clinic_token')
      localStorage.removeItem('clinic_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
