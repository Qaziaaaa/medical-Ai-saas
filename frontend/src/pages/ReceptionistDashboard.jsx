import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../components/layout'
import { Card, Badge } from '../components/ui'

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, trend }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-neutral-900">{value}</p>
        {trend && (
          <p className="mt-0.5 text-xs text-neutral-400">{trend}</p>
        )}
      </div>
    </div>
  )
}

// ── ReceptionistDashboard ─────────────────────────────────────────────────

/**
 * ReceptionistDashboard — welcome screen for receptionists.
 * Shows role-appropriate stat placeholders.
 */
export default function ReceptionistDashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout>
      {/* Welcome card */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 text-neutral-900">
              Good morning, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Here's a summary of today's clinic activity.
            </p>
          </div>
          <Badge variant="success" label="Receptionist" />
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Appointments Today"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Registered Patients"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Appointments"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Today's Schedule" subtitle="Appointments booked for today">
          <p className="text-sm text-neutral-400 italic">
            Appointment data will appear here once the appointments module is connected.
          </p>
        </Card>
        <Card title="Recent Registrations" subtitle="Newly registered patients">
          <p className="text-sm text-neutral-400 italic">
            Patient data will appear here once the patients module is connected.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
