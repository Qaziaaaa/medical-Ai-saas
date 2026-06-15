import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../lib/axios.js'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Spinner, Badge } from '../components/ui'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' })
}

export default function PrescriptionViewerPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    apiClient
      .get(`/api/prescriptions/${id}`)
      .then((res) => {
        const { data } = res.data
        setPrescription(data?.prescription ?? data ?? null)
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to load prescription.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDownloadPDF = useCallback(() => {
    apiClient.get(`/api/prescriptions/${id}/pdf`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = `prescription-${id}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error('PDF download failed:', err)
      })
  }, [id])

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Back button ── */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-md bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700" role="alert">
            {error}
          </div>
        )}

        {/* ── Prescription details ── */}
        {!loading && !error && prescription && (
          <>
            {/* Header card */}
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-h2 text-neutral-900">Prescription</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Issued on {formatDate(prescription.createdAt)}
                  </p>
                </div>
                <Button variant="primary" onClick={handleDownloadPDF}>
                  Download PDF
                </Button>
              </div>

              {/* Doctor & Patient info */}
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Doctor */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                    Doctor
                  </p>
                  <p className="text-sm font-medium text-neutral-900">
                    {prescription.doctor?.name ?? '—'}
                  </p>
                  {prescription.doctor?.email && (
                    <p className="text-sm text-neutral-500">{prescription.doctor.email}</p>
                  )}
                  {prescription.doctor?.specialization && (
                    <Badge variant="info" label={prescription.doctor.specialization} className="mt-1" />
                  )}
                </div>

                {/* Patient */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                    Patient
                  </p>
                  <p className="text-sm font-medium text-neutral-900">
                    {prescription.patient?.fullName ?? '—'}
                  </p>
                  {prescription.patient?.contactNumber && (
                    <p className="text-sm text-neutral-500">{prescription.patient.contactNumber}</p>
                  )}
                  {prescription.patient?.dateOfBirth && (
                    <p className="text-sm text-neutral-500">
                      DOB: {formatDate(prescription.patient.dateOfBirth)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Medicines table */}
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h3 className="text-h3 text-neutral-900">Medicines</h3>
              </div>
              {Array.isArray(prescription.medicines) && prescription.medicines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        {['Medicine', 'Dosage', 'Frequency', 'Duration'].map((h) => (
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
                      {prescription.medicines.map((med, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 text-sm font-medium text-neutral-900">{med.name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">{med.dosage || '—'}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">{med.frequency || '—'}</td>
                          <td className="px-4 py-3 text-sm text-neutral-700">{med.duration || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-6 py-4 text-sm text-neutral-500">No medicines listed.</p>
              )}
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
                <h3 className="text-h3 text-neutral-900 mb-3">Notes</h3>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{prescription.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
