import { useState } from 'react'
import { useAI } from '../hooks/useAI'
import DashboardLayout from '../components/layout/DashboardLayout'
import { Button, Badge, Skeleton } from '../components/ui'

const RISK_BADGE = {
  low:      'success',
  moderate: 'warning',
  high:     'danger',
}

export default function SymptomCheckerPage() {
  const { result, loading, error, checkSymptoms, reset } = useAI()

  const [form, setForm] = useState({
    symptoms: '',
    age: '',
    gender: '',
    medicalHistory: '',
  })
  const [formErrors, setFormErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!form.symptoms.trim()) errs.symptoms = 'Please describe your symptoms'
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) <= 0) errs.age = 'Please enter a valid age'
    if (!form.gender) errs.gender = 'Please select a gender'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    try {
      await checkSymptoms({
        symptoms: form.symptoms.trim(),
        age: Number(form.age),
        gender: form.gender,
        medicalHistory: form.medicalHistory.trim() || undefined,
      })
    } catch {
      // error is already captured in the hook state
    }
  }

  function handleRetry() {
    reset()
    setForm({ symptoms: '', age: '', gender: '', medicalHistory: '' })
    setFormErrors({})
  }

  const selectClass = (hasError) =>
    [
      'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      hasError
        ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
        : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
    ].join(' ')

  const textareaClass = (hasError) =>
    [
      'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
      'placeholder:text-neutral-400 resize-y',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      hasError
        ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
        : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
    ].join(' ')

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Page heading ── */}
        <div>
          <h2 className="text-h2 text-neutral-900">AI Symptom Checker</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Describe your symptoms and get an AI-powered preliminary assessment.
          </p>
        </div>

        {/* ── Input form ── */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Symptoms */}
            <div className="flex flex-col gap-1">
              <label htmlFor="symptoms" className="text-sm font-medium text-neutral-700">
                Symptoms <span className="text-danger-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                value={form.symptoms}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your symptoms in detail…"
                disabled={loading}
                aria-invalid={!!formErrors.symptoms}
                className={textareaClass(!!formErrors.symptoms)}
              />
              {formErrors.symptoms && (
                <p role="alert" className="text-xs text-danger-500">{formErrors.symptoms}</p>
              )}
            </div>

            {/* Age + Gender row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Age */}
              <div className="flex flex-col gap-1">
                <label htmlFor="age" className="text-sm font-medium text-neutral-700">
                  Age <span className="text-danger-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="150"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="e.g. 35"
                  disabled={loading}
                  aria-invalid={!!formErrors.age}
                  className={selectClass(!!formErrors.age)}
                />
                {formErrors.age && (
                  <p role="alert" className="text-xs text-danger-500">{formErrors.age}</p>
                )}
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1">
                <label htmlFor="gender" className="text-sm font-medium text-neutral-700">
                  Gender <span className="text-danger-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  disabled={loading}
                  aria-invalid={!!formErrors.gender}
                  className={selectClass(!!formErrors.gender)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {formErrors.gender && (
                  <p role="alert" className="text-xs text-danger-500">{formErrors.gender}</p>
                )}
              </div>
            </div>

            {/* Medical History */}
            <div className="flex flex-col gap-1">
              <label htmlFor="medicalHistory" className="text-sm font-medium text-neutral-700">
                Medical History <span className="text-xs text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="medicalHistory"
                name="medicalHistory"
                value={form.medicalHistory}
                onChange={handleChange}
                rows={3}
                placeholder="Any relevant past conditions, allergies, or medications…"
                disabled={loading}
                className={textareaClass(false)}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Analysing…' : 'Check Symptoms'}
              </Button>
              {(result || error) && (
                <Button variant="secondary" type="button" onClick={handleRetry} disabled={loading}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6 space-y-4">
            <Skeleton lines={1} height="h-5" className="w-1/3" />
            <Skeleton lines={3} height="h-4" />
            <Skeleton lines={1} height="h-5" className="w-1/4 mt-4" />
            <Skeleton lines={2} height="h-4" />
          </div>
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 space-y-4">
            <p className="text-sm font-medium text-danger-700">{error}</p>
            <Button variant="secondary" size="sm" type="button" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}

        {/* ── Results card ── */}
        {!loading && !error && result && (
          <>
            {result.isFallback ? (
              <div className="rounded-xl border border-warning-200 bg-warning-50 p-6 space-y-4">
                <p className="text-sm font-medium text-warning-800">
                  AI service temporarily unavailable. Please try again later.
                </p>
                <Button variant="secondary" size="sm" type="button" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-6 space-y-6">
                <h3 className="text-h3 text-neutral-900">Assessment Results</h3>

                {/* Risk Level */}
                {result.riskLevel && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                      Risk Level
                    </p>
                    <Badge
                      variant={RISK_BADGE[result.riskLevel?.toLowerCase()] ?? 'neutral'}
                      label={result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)}
                    />
                  </div>
                )}

                {/* Possible Conditions */}
                {Array.isArray(result.possibleConditions) && result.possibleConditions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                      Possible Conditions
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.possibleConditions.map((condition, i) => (
                        <li key={i} className="text-sm text-neutral-700">
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Tests */}
                {Array.isArray(result.suggestedTests) && result.suggestedTests.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                      Suggested Tests
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.suggestedTests.map((test, i) => (
                        <li key={i} className="text-sm text-neutral-700">
                          {test}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs italic text-neutral-400">
                  {result.disclaimer ||
                    'This assessment is for informational purposes only and does not constitute medical advice. Please consult a qualified healthcare professional for diagnosis and treatment.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
