import { useState, useEffect } from 'react'
import { Modal, Button } from '../ui'
import apiClient from '../../lib/axios'

const EMPTY_FORM = {
  patient: '',
  doctor: '',
  scheduledAt: '',
  reason: '',
}

function BookAppointmentModal({ isOpen, onClose, onSubmit, loading = false }) {

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [conflictError, setConflictError] = useState(null)
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM)
      setErrors({})
      setConflictError(null)
      setLoadingOptions(true)
      Promise.all([
        apiClient.get('/api/patients?limit=100').then(r => r.data?.data?.patients ?? r.data?.data ?? []),
        apiClient.get('/api/users/doctors').then(r => r.data?.data?.doctors ?? []),
      ])
        .then(([patientsData, doctorsData]) => {
          setPatients(patientsData)
          setDoctors(doctorsData)
        })
        .catch(() => {})
        .finally(() => setLoadingOptions(false))
    }
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
    if (!form.patient) newErrors.patient = 'Patient is required'
    if (!form.doctor) newErrors.doctor = 'Doctor is required'
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
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment" size="md">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          {conflictError && (
            <div className="rounded-md bg-warning-50 border border-warning-200 px-4 py-3 text-sm text-warning-800" role="alert">
              {conflictError}
            </div>
          )}

          <SelectField
            label="Patient"
            name="patient"
            value={form.patient}
            onChange={handleChange}
            options={patients}
            optionValue="_id"
            optionLabel="fullName"
            placeholder={loadingOptions ? 'Loading patients...' : 'Select a patient'}
            error={errors.patient}
          />

          <SelectField
            label="Doctor"
            name="doctor"
            value={form.doctor}
            onChange={handleChange}
            options={doctors}
            optionValue="_id"
            optionLabel="name"
            placeholder={loadingOptions ? 'Loading doctors...' : 'Select a doctor'}
            error={errors.doctor}
          />

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
              placeholder="Brief reason for the appointment..."
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

function SelectField({ label, name, value, onChange, options, optionValue, optionLabel, placeholder, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-neutral-700">
        {label}
        <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        className={[
          'block w-full rounded-md border px-3 py-2 text-sm',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
          !value ? 'text-neutral-400' : 'text-neutral-900',
        ].join(' ')}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt[optionValue]} value={opt[optionValue]}>
            {opt[optionLabel]}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-danger-500">{error}</p>
      )}
    </div>
  )
}

export default BookAppointmentModal
