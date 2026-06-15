import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Card, Skeleton } from '../components/ui'
import { PatientFormModal } from '../components/patients'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../lib/axios'

/**
 * PatientDetailPage — full patient profile view.
 *
 * - Fetches a single patient by ID from /api/patients/:id
 * - Shows all patient fields in a card layout
 * - Placeholder sections for Appointment, Prescription, and Diagnosis history
 * - Edit button visible to receptionist only
 * - Back button navigates to /patients
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const isReceptionist = role === 'receptionist'

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  async function fetchPatient() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get(`/api/patients/${id}`)
      const { data } = response.data
      setPatient(data?.patient ?? data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load patient.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchPatient()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleEditSubmit(formData) {
    const response = await apiClient.put(`/api/patients/${id}`, formData)
    const { data } = response.data
    setPatient(data?.patient ?? data)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  function capitalize(str) {
    if (!str) return '—'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return (
    <DashboardLayout>
      {/* ── Back + actions header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/patients')}
        >
          ← Back to Patients
        </Button>

        {isReceptionist && patient && (
          <Button variant="primary" size="sm" onClick={() => setEditOpen(true)}>
            Edit Patient
          </Button>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-6">
          <Card>
            <Skeleton lines={6} height="h-5" />
          </Card>
          <Card>
            <Skeleton lines={3} height="h-4" />
          </Card>
        </div>
      )}

      {/* ── Patient profile ── */}
      {!loading && patient && (
        <div className="space-y-6">
          {/* Personal information card */}
          <Card
            title={patient.fullName}
            subtitle={`Registered on ${formatDate(patient.createdAt)}`}
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
              <DetailField label="Gender" value={capitalize(patient.gender)} />
              <DetailField label="Contact Number" value={patient.contactNumber || '—'} />
              <DetailField label="Email" value={patient.email || '—'} />
              <div className="sm:col-span-2">
                <DetailField label="Address" value={patient.address || '—'} />
              </div>
              {patient.medicalHistory && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-neutral-500">Medical History</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-neutral-900 leading-relaxed">
                    {patient.medicalHistory}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Appointment History placeholder */}
          <PlaceholderSection
            title="Appointment History"
            description="Past and upcoming appointments will appear here once the appointments module is connected."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />

          {/* Prescription History placeholder */}
          <PlaceholderSection
            title="Prescription History"
            description="Prescriptions issued to this patient will appear here once the prescriptions module is connected."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />

          {/* Diagnosis History placeholder */}
          <PlaceholderSection
            title="Diagnosis History"
            description="AI-assisted diagnoses and clinical notes will appear here once the diagnosis module is connected."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* ── Edit modal (receptionist only) ── */}
      {isReceptionist && (
        <PatientFormModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          initialData={patient}
          onSubmit={handleEditSubmit}
        />
      )}
    </DashboardLayout>
  )
}

// ── Helper components ─────────────────────────────────────────────────────

function DetailField({ label, value }) {
  return (
    <div>
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{value}</dd>
    </div>
  )
}

function PlaceholderSection({ title, description, icon }) {
  return (
    <Card title={title}>
      <div className="flex items-start gap-4 rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="mt-1 text-sm text-neutral-400">{description}</p>
        </div>
      </div>
    </Card>
  )
}
