import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/axios.js'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [token, setToken] = useState(() => localStorage.getItem('clinic_token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('clinic_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [role, setRole] = useState(() => {
    try {
      const stored = localStorage.getItem('clinic_user')
      const parsed = stored ? JSON.parse(stored) : null
      return parsed?.role ?? null
    } catch {
      return null
    }
  })

  const login = useCallback(
    async (credentials) => {
      const response = await apiClient.post('/api/auth/login', credentials)
      const { token: newToken, user: newUser } = response.data.data

      localStorage.setItem('clinic_token', newToken)
      localStorage.setItem('clinic_user', JSON.stringify(newUser))

      setToken(newToken)
      setUser(newUser)
      setRole(newUser.role)

      if (newUser.role === 'doctor') {
        navigate('/doctor/dashboard')
      } else {
        navigate('/receptionist/dashboard')
      }
    },
    [navigate]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('clinic_token')
    localStorage.removeItem('clinic_user')

    setToken(null)
    setUser(null)
    setRole(null)

    navigate('/login')
  }, [navigate])

  const value = {
    user,
    token,
    role,
    isAuthenticated: !!token,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
