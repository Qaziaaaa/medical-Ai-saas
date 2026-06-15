import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '../ui'

/**
 * BookAppointmentModal — form to create a new appointment.
 *
 * Props:
 *   isOpen    — controls modal visibility
 *   onClose   — called when the modal should close
 *   onSubmit  — async fn(formData) called on valid submit
 *   loading   — external loading state
 */
function BookAppointmentModal({ isOpen, onClose, onSubmit, loading = false }) {
  const emptyForm = {
    patient: '',
    doctor: '',
    scheduledAt: '',
    reason: '',
  }

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [conflictError, setConflictError] = useState(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm)
      setErrors({})
      setConflictError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (conflictError) setConflictError(null)
  }

  function validate() {
    const newErrors = {}
    if (!form.patient.trim()) newErrors.patient = 'Patient is required'
    if (!form.doctor.trim()) newErrors.doctor = 'Doctor is required'
    if (!form.scheduledAt) newErrors.scheduledAt = 'Date and time is required'
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

    try {
      await onSubmit(form)
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        const conflictingTime = err?.response?.data?.data?.conflictingTime
        setConflictError(
          conflictingTime
            ? `This time slot conflicts with an existing appointment at ${new Date(conflictingTime).toLocaleString()}. Please choose a different time.`
            : 'This time slot is already booked. Please choose a different time.'
        )
      }
      // Other errors are handled by the parent
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment" size="md">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          {/* Conflict error banner */}
          {conflictError && (
            <div className="rounded-md bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-800" role="alert">
              {conflictError}
            </div>
          )}

          {/* Patient */}
          <Input
            label="Patient"
            name="patient"
            value={form.patient}
            onChange={handleChange}
            placeholder="Enter patient ID"
            required
            error={errors.patient}
          />

          {/* Doctor */}
          <Input
            label="Doctor"
            name="doctor"
            value={form.doctor}
            onChange={handleChange}
            placeholder="Enter doctor ID"
            required
            error={errors.doctor}
          />

          {/* Scheduled At */}
          <div className="flex flex-col gap-1">
            <label htmlFor="scheduledAt" className="text-sm font-medium text-neutral-700">
              Date &amp; Time
              <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
            </label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={handleChange}
              aria-invalid={!!errors.scheduledAt}
              className={[
                'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                errors.scheduledAt
                  ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                  : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
              ].join(' ')}
            />
            {errors.scheduledAt && (
              <p role="alert" className="text-xs text-danger-500">{errors.scheduledAt}</p>
            )}
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1">
            <label htmlFor="reason" className="text-sm font-medium text-neutral-700">
              Reason
            </label>
            <textarea
              id="reason"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Brief reason for the appointment…"
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
            Book Appointment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BookAppointmentModal
