import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import apiClient from '../../lib/axios'

describe('apiClient interceptors', () => {
  let requestHandler
  let responseHandler
  let responseErrorHandler
  let originalLocation

  beforeEach(() => {
    localStorage.clear()

    // Extract handler functions from the interceptor chain
    requestHandler = apiClient.interceptors.request.handlers[0].fulfilled
    responseHandler = apiClient.interceptors.response.handlers[0].fulfilled
    responseErrorHandler = apiClient.interceptors.response.handlers[0].rejected

    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  describe('request interceptor', () => {
    it('attaches Authorization header when token exists in localStorage', () => {
      localStorage.setItem('clinic_token', 'my-jwt-token')

      const config = { headers: {} }
      const result = requestHandler(config)

      expect(result.headers['Authorization']).toBe('Bearer my-jwt-token')
    })

    it('does not attach Authorization header when no token', () => {
      const config = { headers: {} }
      const result = requestHandler(config)

      expect(result.headers['Authorization']).toBeUndefined()
    })

    it('preserves existing headers when adding Authorization', () => {
      localStorage.setItem('clinic_token', 'tok')

      const config = { headers: { 'X-Custom': 'val' } }
      const result = requestHandler(config)

      expect(result.headers['X-Custom']).toBe('val')
      expect(result.headers['Authorization']).toBe('Bearer tok')
    })
  })

  describe('response interceptor', () => {
    it('passes through successful responses', () => {
      const response = { data: { success: true } }
      const result = responseHandler(response)

      expect(result).toBe(response)
    })

    it('clears auth and redirects on 401', async () => {
      localStorage.setItem('clinic_token', 'tok')
      localStorage.setItem('clinic_user', '{}')

      const error = { response: { status: 401 } }
      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(localStorage.getItem('clinic_token')).toBeNull()
      expect(localStorage.getItem('clinic_user')).toBeNull()
      expect(window.location.href).toBe('/login')
    })

    it('does not clear auth on non-401 errors', async () => {
      localStorage.setItem('clinic_token', 'tok')

      const error = { response: { status: 500 } }
      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(localStorage.getItem('clinic_token')).toBe('tok')
      expect(window.location.href).toBe('')
    })

    it('rejects on network error without response', async () => {
      const error = new Error('Network Error')
      await expect(responseErrorHandler(error)).rejects.toBe(error)
    })
  })
})
