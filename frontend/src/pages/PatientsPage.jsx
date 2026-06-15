import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePatients } from '../hooks/usePatients'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Badge, Spinner, EmptyState } from '../components/ui'
import PatientFormModal from '../components/patients/PatientFormModal'
import toast from 'react-hot-toast'

const GENDER_BADGE = { male: 'info', female: 'warning', other: 'neutral' }

export default function PatientsPage() {
  const { role } = useAuth()
  const { patients, total, loading, page, setPage, search, setSearch, createPatient, updatePatient, deletePatient } = usePatients()
  const [showModal, setShowModal] = useState(false)
  const [editPatient, setEditPatient] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const isDoctor = role === 'doctor'
  const totalPages = Math.ceil(total / 25) || 1

  async function handleSubmit(data) {
    setSubmitting(true)
    try {
      if (editPatient) {
        await updatePatient(editPatient._id, data)
        toast.success('Patient updated')
      } else {
        await createPatient(data)
        toast.success('Patient created')
      }
      setShowModal(false)
      setEditPatient(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this patient?')) return
    try {
      await deletePatient(id)
      toast.success('Patient deleted')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h2 text-neutral-900">Patients</h2>
            <p className="text-sm text-neutral-500">{total} total patients</p>
          </div>
          {!isDoctor && (
            <Button variant="primary" onClick={() => { setEditPatient(null); setShowModal(true) }}>
              + Add Patient
            </Button>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />

        {/* Table */}
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <Spinner size="lg" />
            </div>
          )}
          {!loading && patients.length === 0 ? (
            <EmptyState icon="👤" title="No patients found" description={search ? 'Try a different search term.' : 'Add your first patient to get started.'} />
          ) : (
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  {['Full Name', 'Gender', 'Contact', 'Registered', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {patients.map(p => (
                  <tr key={p._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">{p.fullName}</td>
                    <td className="px-4 py-3"><Badge variant={GENDER_BADGE[p.gender] || 'neutral'} label={p.gender} /></td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.contactNumber}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/patients/${p._id}`} className="text-sm font-medium text-primary-600 hover:text-primary-800">View</Link>
                        {!isDoctor && <>
                          <button onClick={() => { setEditPatient(p); setShowModal(true) }} className="text-sm font-medium text-neutral-600 hover:text-neutral-900">Edit</button>
                          <button onClick={() => handleDelete(p._id)} className="text-sm font-medium text-danger-600 hover:text-danger-800">Delete</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <PatientFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditPatient(null) }}
        onSubmit={handleSubmit}
        initialData={editPatient}
        loading={submitting}
        readOnly={isDoctor}
      />
    </DashboardLayout>
  )
}
