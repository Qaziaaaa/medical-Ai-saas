import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'

// Simple email regex for inline validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * LoginPage — premium medical SaaS login.
 *
 * Layout:
 *  - Left panel (hidden on mobile): branding with clinic logo + tagline
 *  - Right panel: login form
 *
 * Behaviour:
 *  - Inline validation on submit (email format, required fields)
 *  - Submit button disabled + spinner while loading
 *  - Server error shown below form without clearing email
 *  - On success: AuthContext.login() handles navigation
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export default function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [errors, setErrors]         = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]       = useState(false)

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const next = {}
    if (!email.trim()) {
      next.email = 'Email is required.'
    } else if (!EMAIL_RE.test(email)) {
      next.email = 'Enter a valid email address.'
    } else if (email.length > 254) {
      next.email = 'Email must be 254 characters or fewer.'
    }
    if (!password) {
      next.password = 'Password is required.'
    }
    return next
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')

    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setLoading(true)
    try {
      await login({ email: email.trim(), password })
      // AuthContext.login() navigates on success — nothing more to do here
    } catch (err) {
      // Show server error without clearing the email field
      const msg =
        err?.response?.data?.message ||
        'Login failed. Please check your credentials and try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between bg-neutral-950 p-12 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-700/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-600/20 blur-3xl"
        />

        {/* Logo + name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg">
            {/* Medical cross icon */}
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">
            AI Clinic
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Smarter care,<br />
            <span className="text-primary-400">powered by AI.</span>
          </h1>
          <p className="max-w-sm text-base text-neutral-400 leading-relaxed">
            Manage patients, appointments, and prescriptions — with AI-assisted
            symptom analysis built right in.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-3">
            {[
              'Role-based access for doctors & receptionists',
              'AI symptom checker with Gemini',
              'One-click prescription PDF export',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600/30 text-primary-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-xs text-neutral-600">
          © {new Date().getFullYear()} AI Clinic Management. All rights reserved.
        </p>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-neutral-900">AI Clinic</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-h1 text-neutral-900">Welcome back</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Sign in to your clinic account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email address"
              id="email"
              type="email"
              placeholder="you@clinic.com"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={errors.email}
              disabled={loading}
            />

            <Input
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              error={errors.password}
              disabled={loading}
            />

            {/* Server error — shown without clearing email */}
            {serverError && (
              <div
                role="alert"
                className="rounded-md border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700"
              >
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-neutral-400">
            Having trouble? Contact your clinic administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
