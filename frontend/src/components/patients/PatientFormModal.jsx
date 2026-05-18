import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '../ui'

/**
 * PatientFormModal — Add / Edit patient form inside a Modal.
 *
 * Props:
 *   isOpen      — controls modal visibility
 *   onClose     — called when the modal should close
 *   initialData — null for "add", patient object for "edit"
 *   onSubmit    — async fn(formData) called on valid submit
 *   loading     — external loading state (disables submit while parent is submitting)
 *   readOnly    — when true, all fields are disabled (doctor view)
 */
function PatientFormModal({
  isOpen,
  onClose,
  initialData = null,
  onSubmit,
  loading = false,
  readOnly = false,
}) {
  const isEdit = !!initialData

  const emptyForm = {
    fullName: '',
    dateOfBirth: '',
    gender: '',
    contactNumber: '',
    email: '',
    address: '',
    medicalHistory: '',
  }

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  // Populate form when editing an existing patient
  useEffect(() => {
    if (initialData) {
      setForm({
        fullName: initialData.fullName ?? '',
        // dateOfBirth may come as ISO string — slice to yyyy-MM-dd for <input type="date">
        dateOfBirth: initialData.dateOfBirth
          ? initialData.dateOfBirth.slice(0, 10)
          : '',
        gender: initialData.gender ?? '',
        contactNumber: initialData.contactNumber ?? '',
        email: initialData.email ?? '',
        address: initialData.address ?? '',
        medicalHistory: initialData.medicalHistory ?? '',
      })
    } else {
      setForm(emptyForm)
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const newErrors = {}
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!form.gender) newErrors.gender = 'Gender is required'
    if (!form.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required'
    return newErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (readOnly || loading) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    await onSubmit(form)
  }

  const inputProps = readOnly ? { disabled: true } : {}

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={readOnly ? 'Patient Details' : isEdit ? 'Edit Patient' : 'Add Patient'}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Input
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              required={!readOnly}
              error={errors.fullName}
              {...inputProps}
            />
          </div>

          {/* Date of Birth */}
          <Input
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            required={!readOnly}
            error={errors.dateOfBirth}
            {...inputProps}
          />

          {/* Gender */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gender"
              className="text-sm font-medium text-neutral-700"
            >
              Gender
              {!readOnly && (
                <span className="ml-0.5 text-danger-500" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              disabled={readOnly}
              aria-invalid={!!errors.gender}
              className={[
                'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                errors.gender
                  ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
                  : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
              ].join(' ')}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p role="alert" className="text-xs text-danger-500">
                {errors.gender}
              </p>
            )}
          </div>

          {/* Contact Number */}
          <Input
            label="Contact Number"
            name="contactNumber"
            value={form.contactNumber}
            onChange={handleChange}
            placeholder="e.g. +1 555 000 0000"
            required={!readOnly}
            error={errors.contactNumber}
            {...inputProps}
          />

          {/* Email */}
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. jane@example.com"
            {...inputProps}
          />

          {/* Address */}
          <div className="sm:col-span-2">
            <Input
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street, City, Country"
              {...inputProps}
            />
          </div>

          {/* Medical History */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label
              htmlFor="medicalHistory"
              className="text-sm font-medium text-neutral-700"
            >
              Medical History
            </label>
            <textarea
              id="medicalHistory"
              name="medicalHistory"
              value={form.medicalHistory}
              onChange={handleChange}
              disabled={readOnly}
              rows={4}
              placeholder="Relevant past conditions, allergies, surgeries…"
              className={[
                'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
                'placeholder:text-neutral-400 resize-y',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
                'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
              ].join(' ')}
            />
          </div>
        </div>

        {/* Footer actions */}
        {!readOnly && (
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading} disabled={loading}>
              {isEdit ? 'Save Changes' : 'Add Patient'}
            </Button>
          </div>
        )}

        {readOnly && (
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default PatientFormModal
