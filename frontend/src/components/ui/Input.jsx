import React from 'react';

/**
 * Input — label above, input field, optional error message below.
 * Spreads all standard HTML input props onto the underlying <input>.
 */
const Input = React.forwardRef(function Input(
  {
    label,
    error,
    id,
    className = '',
    type = 'text',
    placeholder,
    required,
    ...rest
  },
  ref
) {
  // Generate a stable id from label if none provided
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error && errorId ? errorId : undefined}
        className={[
          'block w-full rounded-md border px-3 py-2 text-sm text-neutral-900',
          'placeholder:text-neutral-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/30',
          'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
          className,
        ].join(' ')}
        {...rest}
      />

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
