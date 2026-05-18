import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../components/layout'
import { Card, Badge } from '../components/ui'

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, trend }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-card">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
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

// ── DoctorDashboard ───────────────────────────────────────────────────────

/**
 * DoctorDashboard — welcome screen for doctors.
 * Shows role-appropriate stat placeholders.
 */
export default function DoctorDashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout>
      {/* Welcome card */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 text-neutral-900">
              Good morning, {user?.name?.split(' ')[0] ?? 'Doctor'} 👋
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Here's a summary of your clinic activity today.
            </p>
          </div>
          <Badge variant="info" label="Doctor" />
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Patients"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Prescriptions Issued"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="AI Checks Today"
          value="—"
          trend="Loading…"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Upcoming Appointments" subtitle="Your schedule for today">
          <p className="text-sm text-neutral-400 italic">
            Appointment data will appear here once the appointments module is connected.
          </p>
        </Card>
        <Card title="Recent Patients" subtitle="Last visited patients">
          <p className="text-sm text-neutral-400 italic">
            Patient data will appear here once the patients module is connected.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
