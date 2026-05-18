import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Global toast notifications */}
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#f9fafb',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#f9fafb',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#f9fafb',
          },
        },
      }}
    />
  </StrictMode>,
)
