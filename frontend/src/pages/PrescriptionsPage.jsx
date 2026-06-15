import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePrescriptions } from '../hooks/usePrescriptions'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Spinner, EmptyState } from '../components/ui'
import PrescriptionFormModal from '../components/prescriptions/PrescriptionFormModal'
import toast from 'react-hot-toast'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function PrescriptionsPage() {
  const { role } = useAuth()
  const {
    prescriptions,
    loading,
    error,
    patientId,
    setPatientId,
    createPrescription,
    downloadPDF,
  } = usePrescriptions()

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const isDoctor = role === 'doctor'

  async function handleCreate(data) {
    setSubmitting(true)
    try {
      await createPrescription(data)
      toast.success('Prescription created')
      setShowModal(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create prescription')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setPatientId(searchInput.trim())
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h2 text-neutral-900">Prescriptions</h2>
            <p className="text-sm text-neutral-500">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}</p>
          </div>
          {isDoctor && (
            <Button variant="primary" onClick={() => setShowModal(true)}>
              + New Prescription
            </Button>
          )}
        </div>

        {/* ── Patient ID filter ── */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Filter by patient ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <Button variant="secondary" size="md" type="submit">
            Search
          </Button>
          {patientId && (
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => { setSearchInput(''); setPatientId('') }}
            >
              Clear
            </Button>
          )}
        </form>

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

          {!loading && prescriptions.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              }
              title="No prescriptions found"
              description={patientId ? 'No prescriptions for this patient ID.' : 'No prescriptions have been created yet.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    {['Patient', 'Doctor', 'Date', 'Medicines', 'Actions'].map((h) => (
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
                  {prescriptions.map((rx) => (
                    <tr key={rx._id} className="hover:bg-neutral-50 transition-colors">
                      {/* Patient */}
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {rx.patient?.fullName ?? rx.patientId ?? '—'}
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {rx.doctor?.name ?? rx.doctorId ?? '—'}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                        {formatDate(rx.createdAt)}
                      </td>

                      {/* Medicines count */}
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {Array.isArray(rx.medicines) ? rx.medicines.length : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/prescriptions/${rx._id}`}
                            className="text-sm font-medium text-primary-600 hover:text-primary-800"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => downloadPDF(rx._id)}
                            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                          >
                            Download PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── New Prescription Modal ── */}
      <PrescriptionFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        loading={submitting}
      />
    </DashboardLayout>
  )
}
