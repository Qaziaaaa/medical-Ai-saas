import { useState, useEffect } from 'react'
import { Modal, Button } from '../ui'
import apiClient from '../../lib/axios'

const EMPTY_MEDICINE = () => ({ name: '', dosage: '', frequency: '', duration: '' })

function PrescriptionFormModal({ isOpen, onClose, onSubmit, loading = false }) {
  const [patient, setPatient] = useState('')
  const [patients, setPatients] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [medicines, setMedicines] = useState([EMPTY_MEDICINE()])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setPatient('')
      setMedicines([EMPTY_MEDICINE()])
      setNotes('')
      setErrors({})
      setLoadingOptions(true)
      apiClient.get('/api/patients?limit=200')
        .then(r => setPatients(r.data?.data?.patients ?? r.data?.data ?? []))
        .catch(() => {})
        .finally(() => setLoadingOptions(false))
    }
  }, [isOpen])

  function handleMedicineChange(index, field, value) {
    setMedicines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    const key = `medicine_${index}_${field}`
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function addMedicine() {
    setMedicines((prev) => [...prev, EMPTY_MEDICINE()])
  }

  function removeMedicine(index) {
    setMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  function validate() {
    const newErrors = {}
    if (!patient) newErrors.patient = 'Patient is required'

    medicines.forEach((med, i) => {
      if (!med.name.trim()) newErrors[`medicine_${i}_name`] = 'Medicine name is required'
      if (!med.dosage.trim()) newErrors[`medicine_${i}_dosage`] = 'Dosage is required'
      if (!med.frequency.trim()) newErrors[`medicine_${i}_frequency`] = 'Frequency is required'
    })

    return newErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    await onSubmit({ patientId: patient, medicines, notes })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Prescription" size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="patient-prescription" className="text-sm font-medium text-neutral-700">
              Patient
              <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
            </label>
            <select
              id="patient-prescription"
              value={patient}
              onChange={(e) => { setPatient(e.target.value); if (errors.patient) setErrors((prev) => ({ ...prev, patient: undefined })) }}
              aria-invalid={!!errors.patient}
              className={[
                'block w-full rounded-md border px-3 py-2 text-sm',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                errors.patient
                  ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                  : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                !patient ? 'text-neutral-400' : 'text-neutral-900',
              ].join(' ')}
            >
              <option value="" disabled>{loadingOptions ? 'Loading patients...' : 'Select a patient'}</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.fullName}</option>
              ))}
            </select>
            {errors.patient && (
              <p role="alert" className="text-xs text-danger-500">{errors.patient}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-neutral-700">
                Medicines <span className="text-danger-500" aria-hidden="true">*</span>
              </span>
              <button
                type="button"
                onClick={addMedicine}
                className="text-sm font-medium text-primary-600 hover:text-primary-800 focus:outline-none"
              >
                + Add Medicine
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {medicines.map((med, i) => (
                <div key={i} className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(i)}
                      aria-label={`Remove medicine ${i + 1}`}
                      className="absolute right-3 top-3 text-neutral-400 hover:text-danger-500 focus:outline-none"
                    >
                      ×
                    </button>
                  )}

                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Medicine {i + 1}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-neutral-700">
                        Name <span className="text-danger-500">*</span>
                      </label>
                      <input
                        value={med.name}
                        onChange={(e) => handleMedicineChange(i, 'name', e.target.value)}
                        placeholder="e.g. Amoxicillin"
                        className={[
                          'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                          'focus:outline-none focus:ring-2 focus:ring-offset-0',
                          errors[`medicine_${i}_name`]
                            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                        ].join(' ')}
                      />
                      {errors[`medicine_${i}_name`] && (
                        <p className="text-xs text-danger-500">{errors[`medicine_${i}_name`]}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-neutral-700">
                        Dosage <span className="text-danger-500">*</span>
                      </label>
                      <input
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(i, 'dosage', e.target.value)}
                        placeholder="e.g. 500mg"
                        className={[
                          'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                          'focus:outline-none focus:ring-2 focus:ring-offset-0',
                          errors[`medicine_${i}_dosage`]
                            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                        ].join(' ')}
                      />
                      {errors[`medicine_${i}_dosage`] && (
                        <p className="text-xs text-danger-500">{errors[`medicine_${i}_dosage`]}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-neutral-700">
                        Frequency <span className="text-danger-500">*</span>
                      </label>
                      <input
                        value={med.frequency}
                        onChange={(e) => handleMedicineChange(i, 'frequency', e.target.value)}
                        placeholder="e.g. Twice daily"
                        className={[
                          'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                          'focus:outline-none focus:ring-2 focus:ring-offset-0',
                          errors[`medicine_${i}_frequency`]
                            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                        ].join(' ')}
                      />
                      {errors[`medicine_${i}_frequency`] && (
                        <p className="text-xs text-danger-500">{errors[`medicine_${i}_frequency`]}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-neutral-700">Duration</label>
                      <input
                        value={med.duration}
                        onChange={(e) => handleMedicineChange(i, 'duration', e.target.value)}
                        placeholder="e.g. 7 days"
                        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-neutral-700">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional instructions or notes..."
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" loading={loading} disabled={loading}>Create Prescription</Button>
        </div>
      </form>
    </Modal>
  )
}

export default PrescriptionFormModal
