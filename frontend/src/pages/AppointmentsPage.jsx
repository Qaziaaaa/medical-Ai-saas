import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppointments } from '../hooks/useAppointments'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Badge, Spinner, EmptyState } from '../components/ui'
import BookAppointmentModal from '../components/appointments/BookAppointmentModal'
import toast from 'react-hot-toast'

// ── Status badge variant map ──────────────────────────────────────────────
const STATUS_BADGE = {
  pending:   'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

// ── Role-appropriate status transition options ────────────────────────────
const RECEPTIONIST_ACTIONS = [
  { value: 'confirmed', label: 'Confirm' },
  { value: 'cancelled', label: 'Cancel' },
]

const DOCTOR_ACTIONS = [
  { value: 'completed', label: 'Complete' },
  { value: 'cancelled', label: 'Cancel' },
]

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'completed', 'cancelled']

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AppointmentsPage() {
  const { role } = useAuth()
  const {
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
  } = useAppointments()

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isReceptionist = role === 'receptionist'
  const isDoctor = role === 'doctor'
  const statusActions = isReceptionist ? RECEPTIONIST_ACTIONS : isDoctor ? DOCTOR_ACTIONS : []

  const LIMIT = 20
  const totalPages = Math.ceil(total / LIMIT) || 1

  async function handleBook(data) {
    setSubmitting(true)
    try {
      await createAppointment(data)
      toast.success('Appointment booked')
      setShowModal(false)
    } catch (err) {
      const status = err?.response?.status
      if (status !== 409) {
        toast.error(err?.response?.data?.message || 'Failed to book appointment')
      }
      // 409 conflict is handled inside BookAppointmentModal — re-throw so modal can show it
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await updateStatus(id, newStatus)
      toast.success(`Appointment marked as ${newStatus}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h2 text-neutral-900">Appointments</h2>
            <p className="text-sm text-neutral-500">{total} total appointments</p>
          </div>
          {isReceptionist && (
            <Button variant="primary" onClick={() => setShowModal(true)}>
              + Book Appointment
            </Button>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-date-from" className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              From
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-date-to" className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              To
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Clear filters */}
          {(filters.status || filters.dateFrom || filters.dateTo) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '' })}
                className="text-sm text-neutral-500 hover:text-neutral-700 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-md bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700" role="alert">
            {error}
          </div>
        )}

        {/* ── Table ── */}
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <Spinner size="lg" />
            </div>
          )}

          {!loading && appointments.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              }
              title="No appointments found"
              description={
                filters.status || filters.dateFrom || filters.dateTo
                  ? 'Try adjusting your filters.'
                  : 'No appointments have been booked yet.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    {['Patient', 'Doctor', 'Date / Time', 'Reason', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {appointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-neutral-50 transition-colors">
                      {/* Patient */}
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {appt.patient?.fullName ?? appt.patientId ?? '—'}
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {appt.doctor?.name ?? appt.doctorId ?? '—'}
                      </td>

                      {/* Date / Time */}
                      <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                        {formatDateTime(appt.scheduledAt)}
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 text-sm text-neutral-600 max-w-[200px] truncate">
                        {appt.reason || '—'}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <Badge
                          variant={STATUS_BADGE[appt.status] ?? 'neutral'}
                          label={appt.status ? appt.status.charAt(0).toUpperCase() + appt.status.slice(1) : '—'}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {statusActions.length > 0 && appt.status !== 'completed' && appt.status !== 'cancelled' ? (
                          <select
                            aria-label={`Update status for appointment on ${formatDateTime(appt.scheduledAt)}`}
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(appt._id, e.target.value)
                                e.target.value = ''
                              }
                            }}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">Update…</option>
                            {statusActions.map((action) => (
                              <option key={action.value} value={action.value}>
                                {action.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Book Appointment Modal ── */}
      <BookAppointmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleBook}
        loading={submitting}
      />
    </DashboardLayout>
  )
}
