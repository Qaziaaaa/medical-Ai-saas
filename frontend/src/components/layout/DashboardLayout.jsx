import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../ui'
import Sidebar from './Sidebar'

// ── Page title map ────────────────────────────────────────────────────────

const PAGE_TITLES = {
  '/doctor/dashboard':       'Dashboard',
  '/receptionist/dashboard': 'Dashboard',
  '/patients':               'Patients',
  '/appointments':           'Appointments',
  '/prescriptions':          'Prescriptions',
  '/ai/symptom-checker':     'AI Symptom Checker',
}

function getPageTitle(pathname) {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Prefix match for nested routes (e.g. /patients/123)
  const prefix = Object.keys(PAGE_TITLES).find((key) => pathname.startsWith(key + '/'))
  return prefix ? PAGE_TITLES[prefix] : 'Clinic'
}

const ROLE_BADGE_VARIANT = {
  doctor:       'info',
  receptionist: 'success',
}

// ── DashboardLayout ───────────────────────────────────────────────────────

/**
 * DashboardLayout — authenticated shell.
 *
 * Renders:
 *  - Fixed left Sidebar (w-64 on desktop, hamburger-toggled on mobile)
 *  - Top header with page title, user name, and role badge
 *  - Main content area (children)
 *
 * Requirements: 3.6
 */
export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, role } = useAuth()
  const location = useLocation()

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* ── Top header ── */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-4 shadow-sm sm:px-6">
          {/* Hamburger (mobile only) */}
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title */}
          <h1 className="flex-1 text-lg font-semibold text-neutral-900 truncate">
            {pageTitle}
          </h1>

          {/* User info */}
          <div className="flex items-center gap-3">
            <Badge
              variant={ROLE_BADGE_VARIANT[role] ?? 'neutral'}
              label={role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
            />
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium text-neutral-700 max-w-[140px] truncate">
                {user?.name ?? 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
