import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '../ui'

const emptyMedicine = () => ({ name: '', dosage: '', frequency: '', duration: '' })

/**
 * PrescriptionFormModal — doctor-only form to create a new prescription.
 *
 * Props:
 *   isOpen    — controls modal visibility
 *   onClose   — called when the modal should close
 *   onSubmit  — async fn(formData) called on valid submit
 *   loading   — external loading state
 */
function PrescriptionFormModal({ isOpen, onClose, onSubmit, loading = false }) {
  const [patientId, setPatientId] = useState('')
  const [medicines, setMedicines] = useState([emptyMedicine()])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPatientId('')
      setMedicines([emptyMedicine()])
      setNotes('')
      setErrors({})
    }
  }, [isOpen])

  function handleMedicineChange(index, field, value) {
    setMedicines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    // Clear medicine-level error
    const key = `medicine_${index}_${field}`
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function addMedicine() {
    setMedicines((prev) => [...prev, emptyMedicine()])
  }

  function removeMedicine(index) {
    setMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  function validate() {
    const newErrors = {}
    if (!patientId.trim()) newErrors.patientId = 'Patient ID is required'

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

    await onSubmit({ patientId, medicines, notes })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Prescription" size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-5">
          {/* Patient ID */}
          <Input
            label="Patient ID"
            name="patientId"
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value)
              if (errors.patientId) setErrors((prev) => ({ ...prev, patientId: undefined }))
            }}
            placeholder="Enter patient ID"
            required
            error={errors.patientId}
          />

          {/* Medicines */}
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
                <div
                  key={i}
                  className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  {/* Remove button — only show if more than 1 row */}
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
                    {/* Name */}
                    <Input
                      label="Name"
                      value={med.name}
                      onChange={(e) => handleMedicineChange(i, 'name', e.target.value)}
                      placeholder="e.g. Amoxicillin"
                      required
                      error={errors[`medicine_${i}_name`]}
                    />

                    {/* Dosage */}
                    <Input
                      label="Dosage"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(i, 'dosage', e.target.value)}
                      placeholder="e.g. 500mg"
                      required
                      error={errors[`medicine_${i}_dosage`]}
                    />

                    {/* Frequency */}
                    <Input
                      label="Frequency"
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(i, 'frequency', e.target.value)}
                      placeholder="e.g. Twice daily"
                      required
                      error={errors[`medicine_${i}_frequency`]}
                    />

                    {/* Duration */}
                    <Input
                      label="Duration"
                      value={med.duration}
                      onChange={(e) => handleMedicineChange(i, 'duration', e.target.value)}
                      placeholder="e.g. 7 days"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-neutral-700">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional instructions or notes…"
              className={[
                'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                'placeholder:text-neutral-400 resize-y',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
              ].join(' ')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} disabled={loading}>
            Create Prescription
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default PrescriptionFormModal
