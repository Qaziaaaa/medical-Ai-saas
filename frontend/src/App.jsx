import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import AppRoutes from './routes/AppRoutes.jsx'

/**
 * Root application component.
 *
 * Wraps the entire app in:
 *  - BrowserRouter  — client-side routing
 *  - AuthProvider   — global auth state (user, token, role)
 *  - AppRoutes      — route definitions with ProtectedRoute guards
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
